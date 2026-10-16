import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import "dotenv/config";

const app = express();
app.use(express.json());

const ADMIN_EMAIL = "opulenceslik@gmail.com";
const MPESA_TILL_NUMBER = "5348124";
const MPESA_PAYMENT_METHOD = "M-PESA Buy Goods and Services";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type OrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryAddress: string;
  totalAmount: number;
  items: OrderItem[];
  mpesaTransactionId: string;
};

function normalizeMpesaTransactionId(value: string) {
  return String(value || "").trim();
}

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

  const txId = normalizeMpesaTransactionId(payload.mpesaTransactionId || "");
  if (!txId) {
    return "M-PESA transaction ID is required.";
  }

  // Optional format validation
  if (!/^[A-Za-z0-9]+$/i.test(txId)) {
    return "M-PESA transaction ID is invalid.";
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
        <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
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
    throw new Error("Email service not configured");
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
    text: `
Order ID / Reference: ${order.orderNumber}
Customer: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.customerPhone || "N/A"}
Delivery Address: ${order.deliveryAddress}
Total Amount Paid: KES ${Number(order.totalAmount).toLocaleString()}
M-PESA Transaction ID: ${order.mpesaTransactionId}
Items:
${order.items.map((item: any) => `- ${item.name} x ${item.quantity} = KES ${Number(item.price * item.quantity).toLocaleString()}`).join("\n")}
    `,
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    emailConfigured: !!(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD),
    emailUser: process.env.EMAIL_USER || "opulenceslik7@gmail.com",
  });
});

app.post("/api/checkout/manual-mpesa", async (req, res) => {
  try {
    const payload = req.body as Partial<OrderInput>;

    const validationError = validateOrderInput(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const orderNumber =
      payload.customerEmail
        ? `OS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        : `OS-${Date.now()}`;

    const order = {
      orderNumber,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone || "",
      deliveryAddress: payload.deliveryAddress,
      totalAmount: Number(payload.totalAmount),
      mpesaTransactionId: String(payload.mpesaTransactionId).trim(),
      items: payload.items,
      paymentStatus: "Pending Admin Verification",
      orderStatus: "Processing",
      paymentMethod: MPESA_PAYMENT_METHOD,
      tillNumber: MPESA_TILL_NUMBER,
      createdAt: new Date().toISOString(),
    };

    // Save to your database here
    // Example:
    // await Order.create({
    //   orderNumber: order.orderNumber,
    //   customerName: order.customerName,
    //   customerEmail: order.customerEmail,
    //   customerPhone: order.customerPhone,
    //   deliveryAddress: order.deliveryAddress,
    //   totalAmount: order.totalAmount,
    //   mpesaTransactionId: order.mpesaTransactionId,
    //   items: order.items,
    //   paymentStatus: "Pending Admin Verification",
    //   orderStatus: "Processing"
    // });

    await sendAdminEmail(order);

    return res.status(201).json({
      success: true,
      message: "Order submitted successfully. Pending admin verification.",
      order: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      },
    });
  } catch (error) {
    console.error("checkout/manual-mpesa error:", error);
    return res.status(500).json({
      error: "Failed to process order",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/send-receipt", async (req, res) => {
  const { order, customerEmail } = req.body;

  if (!order || !customerEmail) {
    return res.status(400).json({ error: "Missing order or customer email" });
  }

  // Keep it for customer email if you still use it, but the new requirement is admin notification
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
        <p>Thank you for your order. Your payment is pending admin verification.</p>
        <p><strong>Order ID:</strong> ${order.orderNumber}</p>
        <p><strong>M-PESA Transaction ID:</strong> ${order.mpesaTransactionId || "N/A"}</p>
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
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });

      app.use(vite.middlewares);

      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });

      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  startServer();
}

export default app;
