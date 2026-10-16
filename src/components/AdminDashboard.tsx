import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("admin_id_token"));
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (token) loadPending();
  }, [token]);

  async function loadPending() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/pending", { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.success) setPending(j.pending || []);
      else setMsg("Error: " + (j.error || JSON.stringify(j)));
    } catch (err: any) {
      setMsg("Network error: " + String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    if (!token) return setMsg("Not authenticated");
    try {
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (j.success) {
        setPending((p) => p.filter((x) => x.id !== id));
        setMsg("Approved");
      } else setMsg("Error: " + (j.error || JSON.stringify(j)));
    } catch (err: any) {
      setMsg("Network error: " + String(err?.message || err));
    }
  }

  async function reject(id: string) {
    if (!token) return setMsg("Not authenticated");
    try {
      const res = await fetch("/api/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (j.success) {
        setPending((p) => p.filter((x) => x.id !== id));
        setMsg("Rejected");
      } else setMsg("Error: " + (j.error || JSON.stringify(j)));
    } catch (err: any) {
      setMsg("Network error: " + String(err?.message || err));
    }
  }

  function logout() {
    sessionStorage.removeItem("admin_id_token");
    setToken(null);
    setPending([]);
    setMsg("Logged out");
  }

  return (
    <div style={{ maxWidth: 960, margin: "1rem auto", padding: 12 }}>
      <h2>Payments Admin</h2>
      {!token && (
        <div>
          <p>You must sign in via the Admin Login page to manage payments.</p>
        </div>
      )}

      {token && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={loadPending} disabled={loading} style={{ marginRight: 8 }}>Refresh</button>
            <button onClick={logout}>Logout</button>
          </div>

          {msg && <p>{msg}</p>}

          <ul>
            {pending.map((p) => (
              <li key={p.id} style={{ marginBottom: 12, border: "1px solid #eee", padding: 8 }}>
                <div><strong>{p.transactionId}</strong> — {p.amount ?? "N/A"} — {p.phone} — {p.customerEmail}</div>
                <div>Order: {p.orderId ?? "N/A"}</div>
                <div>Submitted: {new Date(p.submittedAt).toLocaleString()}</div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => approve(p.id)} style={{ marginRight: 8 }}>Approve</button>
                  <button onClick={() => reject(p.id)}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
