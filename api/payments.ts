import { Router, Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import * as admin from "firebase-admin";

const router = Router();
const DATA_DIR = path.join(process.cwd(), "api", "data");
const STORE_PATH = path.join(DATA_DIR, "payments.json");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(svc as admin.ServiceAccount) });
      console.log("Firebase admin initialized from FIREBASE_SERVICE_ACCOUNT env var");
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
      // fallback to default
      try {
        admin.initializeApp();
      } catch (e) {
        console.warn("Firebase default initialization failed", e);
      }
    }
  } else {
    try {
      admin.initializeApp();
      console.log("Firebase admin initialized with default credentials");
    } catch (err) {
      console.warn("Firebase admin initialization failed; admin routes will return 500 until configured", err);
    }
  }
}

// Ensure the data directory + file exist
async function ensureStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(STORE_PATH);
    } catch {
      await fs.writeFile(STORE_PATH, "[]", "utf-8");
    }
  } catch (err) {
    console.error("ensureStore error:", err);
    throw err;
  }
}

type PaymentRecord = {
  id: string;
  orderId?: string;
  transactionId: string;
  amount?: number;
  phone?: string;
  customerEmail?: string;
  status: "pending" | "successful" | "rejected";
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
};

async function readStore(): Promise<PaymentRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  return JSON.parse(raw) as PaymentRecord[];
}
async function writeStore(rows: PaymentRecord[]) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(rows, null, 2), "utf-8");
}

// Helper to create an ID
function genId() {
  if ((global as any).crypto && (global as any).crypto.randomUUID) {
    return (global as any).crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const DEFAULT_TILL = "5348124";
const MPESA_TILL = (process.env.MPESA_TILL_NUMBER || DEFAULT_TILL).toString();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "opulenceslik7@gmail.com,devel0perharryke@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

// Firebase admin verification middleware
async function verifyAdminToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization") || req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  const idToken = auth.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: "Forbidden: not an admin" });
    }
    // attach admin info
    (req as any).admin = { uid: decoded.uid, email };
    next();
  } catch (err) {
    console.error("verifyIdToken error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 465),
    secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : true,
    auth: { user, pass }
  });
}

async function notifyOwner(subject: string, html: string) {
  const notifyTo = process.env.OPULENCESLIK_NOTIFY_EMAIL || "opulenceslik@gmail.com";
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("Email transporter not configured; skipping owner notification");
    console.log("Owner notification:", subject, html);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER!, to: notifyTo, subject, html });
  } catch (err) {
    console.error("Failed to send owner notification", err);
  }
}

async function notifyCustomer(customerEmail: string, subject: string, html: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("Email transporter not configured; skipping customer notification");
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER!, to: customerEmail, subject, html });
  } catch (err) {
    console.error("Failed to send customer notification", err);
  }
}

// POST /api/payments/submit
router.post("/submit", async (req: Request, res: Response) => {
  try {
    const { orderId, transactionId, amount, phone, customerEmail } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "transactionId is required" });
    }
    const rows = await readStore();
    const rec: PaymentRecord = {
      id: genId(),
      orderId,
      transactionId: String(transactionId).trim(),
      amount: amount ? Number(amount) : undefined,
      phone,
      customerEmail,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    rows.push(rec);
    await writeStore(rows);

    // Notify owner/admins that a new payment has been submitted
    const subject = `New M-Pesa submission: ${rec.transactionId}`;
    const adminUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000") + "/admin/payments";
    const html = `
      <p>A new M-Pesa payment has been submitted and awaits approval.</p>
      <ul>
        <li>Paybill / Till: <strong>${MPESA_TILL}</strong></li>
        <li>Transaction ID: <strong>${rec.transactionId}</strong></li>
        <li>Amount: <strong>${rec.amount ?? "N/A"}</strong></li>
        <li>Phone: <strong>${rec.phone ?? "N/A"}</strong></li>
        <li>Order ID: <strong>${rec.orderId ?? "N/A"}</strong></li>
        <li>Submitted At: <strong>${rec.submittedAt}</strong></li>
      </ul>
      <p>Open the admin panel to review: <a href="${adminUrl}">${adminUrl}</a></p>
    `;
    await notifyOwner(subject, html);

    return res.json({ success: true, submission: rec });
  } catch (err: any) {
    console.error("submit error:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// GET /api/payments/till  - returns the till/paybill number for clients
router.get("/till", async (req: Request, res: Response) => {
  return res.json({ till: MPESA_TILL });
});

// GET /api/payments/pending  (admin protected)
router.get("/pending", verifyAdminToken, async (req: Request, res: Response) => {
  try {
    const rows = await readStore();
    const pending = rows.filter(r => r.status === "pending");
    return res.json({ success: true, pending });
  } catch (err: any) {
    console.error("pending error:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// POST /api/payments/approve  (admin protected)
router.post("/approve", verifyAdminToken, async (req: Request, res: Response) => {
  try {
    const adminInfo = (req as any).admin as { uid: string; email: string } | undefined;
    const adminName = adminInfo?.email || (req.body.adminName as string) || "admin";
    const { id, note } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });

    const rows = await readStore();
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "not found" });

    rows[idx].status = "successful";
    rows[idx].approvedAt = new Date().toISOString();
    rows[idx].approvedBy = adminName;
    if (note) rows[idx].note = String(note);

    await writeStore(rows);

    // Notify owner and customer
    const subject = `Payment approved: ${rows[idx].transactionId}`;
    const html = `
      <p>The following payment was approved by <strong>${adminName}</strong>:</p>
      <ul>
        <li>Paybill / Till: <strong>${MPESA_TILL}</strong></li>
        <li>Transaction ID: <strong>${rows[idx].transactionId}</strong></li>
        <li>Amount: <strong>${rows[idx].amount ?? "N/A"}</strong></li>
        <li>Phone: <strong>${rows[idx].phone ?? "N/A"}</strong></li>
        <li>Order ID: <strong>${rows[idx].orderId ?? "N/A"}</strong></li>
      </ul>
    `;
    await notifyOwner(subject, html);
    if (rows[idx].customerEmail) {
      await notifyCustomer(rows[idx].customerEmail, subject, `<p>Your payment has been approved.</p>` + html);
    }

    return res.json({ success: true, payment: rows[idx] });
  } catch (err: any) {
    console.error("approve error:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// POST /api/payments/reject  (admin protected)
router.post("/reject", verifyAdminToken, async (req: Request, res: Response) => {
  try {
    const adminInfo = (req as any).admin as { uid: string; email: string } | undefined;
    const adminName = adminInfo?.email || (req.body.adminName as string) || "admin";
    const { id, note } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });

    const rows = await readStore();
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "not found" });

    rows[idx].status = "rejected";
    rows[idx].approvedAt = new Date().toISOString();
    rows[idx].approvedBy = adminName;
    if (note) rows[idx].note = String(note);

    await writeStore(rows);

    const subject = `Payment rejected: ${rows[idx].transactionId}`;
    const html = `
      <p>The following payment was rejected by <strong>${adminName}</strong>:</p>
      <ul>
        <li>Paybill / Till: <strong>${MPESA_TILL}</strong></li>
        <li>Transaction ID: <strong>${rows[idx].transactionId}</strong></li>
        <li>Amount: <strong>${rows[idx].amount ?? "N/A"}</strong></li>
        <li>Phone: <strong>${rows[idx].phone ?? "N/A"}</strong></li>
        <li>Order ID: <strong>${rows[idx].orderId ?? "N/A"}</strong></li>
        <li>Note: <strong>${rows[idx].note ?? ""}</strong></li>
      </ul>
    `;
    await notifyOwner(subject, html);
    if (rows[idx].customerEmail) {
      await notifyCustomer(rows[idx].customerEmail, subject, `<p>Your payment was rejected.</p>` + html);
    }

    return res.json({ success: true, payment: rows[idx] });
  } catch (err: any) {
    console.error("reject error:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
