import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import "dotenv/config";

// Initialize Firebase Admin SDK for serverless/backend use
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
app.use(express.json());

const ADMIN_EMAIL = "opulenceslik@gmail.com";
const MPESA_TILL_NUMBER = "5348124";
const MPESA_PAYMENT_METHOD = "M-PESA Buy Goods and Services";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  category?: string;
};

type OrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryAddress: string;
  deliveryZone?: string;
  totalAmount: number;
  items: OrderItem[];
  mpesaTransactionId: string;
};

function validateOrderInput(payload: Partial<OrderInput>) {
  if (!payload.customerName || !payload.customerEmail || !payload.deliveryAddress) {
    return "Customer name, email, and delivery address are required.";
  }

  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    return "Order items are required.";
  }

  if (!payload.totalAmount || Number(payload.totalAmount) <= 0) {
    return "Total amount must be greater than zero.";
  }

  const txId = String(payload.mpesaTransactionId || "").trim();
  if (!txId) {
    return "M-PESA transaction ID is required.";
  }

  return null;
}

function buildAdminOrderEmailHtml(order: any) {
  const itemsHtml = order.items
    .map(
      (item: any) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${Number(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
      <h2 style="color: #110A08;">New M-PESA Order Pending Verification</h2>

      <p><strong>Order ID / Reference:</strong> ${order.orderNumber}</p>
      <p><strong>Payment Method:</strong> ${MPESA_PAYMENT_METHOD}</p>
      <p><strong>Till Number:</strong> ${MPESA_TILL_NUMBER}</p>
      <p><strong>M-PESA Transaction ID:</strong> ${order.mpesaTransactionId}</p>
      <p><strong>Payment Status:</strong> Pending Admin Verification</p>
      <p><strong>Order Status:</strong> Processing</p>

      <div style="margin-top: 20px; background: #fdfbf7; padding: 16px; border-radius: 10px;">
        <h3 style="margin: 0 0 10px 0; color: #110A08;">Customer Details</h3>
        <p><strong>Name:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.customerEmail}</p>
        <p><strong>Phone:</strong> ${order.customerPhone || "N/A"}</p>
        <p><strong>Delivery Address:</strong> ${order.deliveryZone || ""} ${order.deliveryAddress}</p>
      </div>

      <table style="width: 100%; margin-top: 24px; border-collapse: collapse;">
        <thead>
          <tr style="background: #110A08; color: white;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 30px; text-align: right;">
        <p><strong>Total Amount Paid:</strong> KES ${Number(order.totalAmount).toLocaleString()}</p>
      </div>
    </div>
  `;
}

async function sendAdminEmail(order: any) {
  const emailUser = (process.env.EMAIL_USER || "opulenceslik7@gmail.com").trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "").trim();

  if (!emailPass) {
    console.warn("Email password not configured. Skipping admin notification email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `"Opulence Slik" <${emailUser}>`,
    to: ADMIN_EMAIL,
    subject: `New M-PESA Pending Order - ${order.orderNumber}`,
    html: buildAdminOrderEmailHtml(order),
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    emailConfigured: !!(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD),
    databaseConnected: !!db,
  });
});

app.post("/api/checkout/manual-mpesa", async (req, res) => {
  try {
    const payload = req.body as Partial<OrderInput>;

    const validationError = validateOrderInput(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      id: orderNumber,
      orderNumber,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone || "",
      deliveryAddress: payload.deliveryAddress,
      deliveryZone: payload.deliveryZone || "Standard Delivery",
      total: payload.totalAmount,
      finalTotal: payload.totalAmount,
      totalAmount: payload.totalAmount,
      items: payload.items,
      mpesaTransactionId: String(payload.mpesaTransactionId).trim().toUpperCase(),
      paymentMethod: MPESA_PAYMENT_METHOD,
      tillNumber: MPESA_TILL_NUMBER,
      paymentStatus: "Pending Admin Verification",
      status: "pending",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save order to Firestore Database securely on the server
    if (db) {
      await db.collection("orders").doc(orderNumber).set(orderData);
    } else {
      console.warn("Firestore database not initialized.");
    }

    // Send Email Notification to Admin
    await sendAdminEmail(orderData);

    return res.status(201).json({
      success: true,
      message: "Order submitted successfully. Pending admin verification.",
      order: {
        orderNumber: orderData.orderNumber,
        paymentStatus: orderData.paymentStatus,
        orderStatus: orderData.status,
      },
    });
  } catch (error: any) {
    console.error("checkout/manual-mpesa error:", error);
    return res.status(500).json({
      error: "Failed to process order",
      details: error.message || String(error),
    });
  }
});

app.post("/api/send-receipt", async (req, res) => {
  const { order, customerEmail } = req.body;

  if (!order || !customerEmail) {
    return res.status(400).json({ error: "Missing order or customer email" });
  }

  try {
    const emailUser = (process.env.EMAIL_USER || "opulenceslik7@gmail.com").trim();
    const emailPass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "").trim();

    if (!emailPass) {
      return res.status(500).json({ error: "Email service not configured" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Opulence Slik" <${emailUser}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Order Confirmed</h2>
        <p>Thank you for your order. Your payment of <strong>KES ${Number(order.finalTotal || order.totalAmount).toLocaleString()}</strong> with M-PESA Code <strong>${order.mpesaTransactionId}</strong> is pending admin verification.</p>
        <p><strong>Order ID:</strong> ${order.orderNumber}</p>
      </div>`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("send-receipt error:", error);
    res.status(500).json({ error: "Failed to send receipt" });
  }
});

if (!process.env.VERCEL) {
  async function startServer() {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startServer();
}

export default app;
