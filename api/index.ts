import express from "express";
import path from "path";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

app.post("/api/send-receipt", async (req, res) => {
  const { order, customerEmail } = req.body;

  if (!order || !customerEmail) {
    return res.status(400).json({ error: "Missing order or customer email" });
  }

  const emailUser = process.env.EMAIL_USER || "opulenceslik7@gmail.com";
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    console.error("EMAIL_PASS is not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.price * item.quantity}</td>
    </tr>
  `).join("");

  const mailOptions = {
    from: `"Opulence Slik" <${emailUser}>`,
    to: customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="text-align: center; color: #110A08;">Order Confirmed</h2>
        <p style="text-align: center; color: #D4AF37; font-weight: bold; letter-spacing: 2px;">THANK YOU FOR CHOOSING OPULENCE SLIK</p>
        
        <div style="margin-top: 30px;">
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
        </div>

        <div style="margin-top: 30px; background: #fdfbf7; padding: 15px; border-radius: 10px;">
          <h3 style="margin-top: 0; color: #110A08;">Delivery Details</h3>
          <p><strong>Name:</strong> ${order.customerName}</p>
          <p><strong>Phone:</strong> ${order.customerPhone}</p>
          <p><strong>Address:</strong> ${order.deliveryZone} - ${order.deliveryAddress}</p>
        </div>

        <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
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
          <p><strong>Subtotal:</strong> KES ${order.total}</p>
          <p><strong>Delivery Fee:</strong> ${order.deliveryFee === 0 ? 'Free' : `KES ${order.deliveryFee}`}</p>
          <p style="font-size: 20px; color: #D4AF37;"><strong>Total: KES ${order.finalTotal}</strong></p>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #888;">
          <p>Opulence Slik - Luxury Redefined</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Vite / Static serving for non-Vercel environments
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
      // Standard production environment (not Vercel)
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
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
