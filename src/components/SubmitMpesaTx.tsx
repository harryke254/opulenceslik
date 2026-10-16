import React, { useState } from "react";

export default function SubmitMpesaTx({ orderId, amount }: { orderId?: string; amount?: number }) {
  const [transactionId, setTransactionId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg("");
    if (!transactionId) return setMsg("Enter transaction ID");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, transactionId, amount, phone, customerEmail: email }),
      });
      const j = await res.json();
      if (j.success) {
        setMsg("Submission received. Admin will verify shortly.");
        setTransactionId("");
      } else {
        setMsg("Error: " + (j.error || JSON.stringify(j)));
      }
    } catch (err: any) {
      setMsg("Network error: " + String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "1rem auto", padding: 12 }}>
      <h3>Submit M-Pesa Transaction</h3>
      <p>Paybill / Till: <strong>{import.meta.env.VITE_MPESA_TILL || import.meta.env.VITE_MPESA_TILL_NUMBER || "5348124"}</strong></p>
      <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Transaction ID (e.g., ABC123XYZ)" style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (2547...)" style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <button onClick={submit} disabled={loading} style={{ padding: "8px 12px" }}>{loading ? "Submitting..." : "Submit Transaction"}</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
