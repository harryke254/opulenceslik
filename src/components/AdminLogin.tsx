import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";

export default function AdminLogin({ onLogin }: { onLogin?: (idToken: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setMsg("");
    if (!email || !password) return setMsg("Email and password are required");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      // store token in sessionStorage to persist across tabs (short-term)
      sessionStorage.setItem("admin_id_token", idToken);
      if (onLogin) onLogin(idToken);
      setMsg("Signed in");
    } catch (err: any) {
      setMsg("Login failed: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "1rem auto", padding: 12 }}>
      <h3>Admin sign in</h3>
      <p>Sign in with your admin Firebase user (emails: opulenceslik7@gmail.com, devel0perharryke@gmail.com)</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin email"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />
      <button onClick={login} disabled={loading} style={{ padding: "8px 12px" }}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
