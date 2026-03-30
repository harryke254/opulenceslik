import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import "dotenv/config";

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  const allKeys = Object.keys(process.env);
  console.log("Health check - All env keys:", allKeys);
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV, 
    emailConfigured: !!(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD),
    emailUser: process.env.EMAIL_USER || "opulenceslik7@gmail.com",
    availableKeys: allKeys.filter(k => k.includes('EMAIL')),
    allKeysCount: allKeys.length
  });
});

app.post("/api/send-receipt", async (req, res) => {
  const { order, customerEmail } = req.body;
  console.log(`Attempting to send email to ${customerEmail} for order ${order?.orderNumber}`);

  if (!order || !customerEmail) {
    console.error("Missing order or customer email in request body");
    return res.status(400).json({ error: "Missing order or customer email" });
  }

  const emailUser = (process.env.EMAIL_USER || "opulenceslik7@gmail.com").trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD)?.trim();

  console.log("Attempting to send email...");
  console.log("EMAIL_USER present:", !!process.env.EMAIL_USER);
  console.log("EMAIL_PASS present:", !!process.env.EMAIL_PASS);
  console.log("EMAIL_PASSWORD present:", !!process.env.EMAIL_PASSWORD);

  if (!emailPass) {
    console.error("EMAIL_PASS or EMAIL_PASSWORD environment variable is NOT set");
    console.log("Current env keys:", Object.keys(process.env).filter(k => k.includes('EMAIL')));
    return res.status(500).json({ 
      error: "Email service not configured (missing password)",
      debug: {
        hasUser: !!process.env.EMAIL_USER,
        hasPass: !!process.env.EMAIL_PASS,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        keys: Object.keys(process.env).filter(k => k.includes('EMAIL'))
      }
    });
  }

  console.log(`Using email user: ${emailUser}`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log("Nodemailer transporter verified successfully");
  } catch (verifyError) {
    console.error("Nodemailer verification failed:", verifyError);
    return res.status(500).json({ error: "Failed to connect to email service", details: verifyError instanceof Error ? verifyError.message : String(verifyError) });
  }

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
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ 
      error: "Failed to send email", 
      details: error instanceof Error ? error.message : String(error),
      code: (error as any).code,
      command: (error as any).command
    });
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
