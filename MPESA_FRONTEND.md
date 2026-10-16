# M-Pesa frontend integration (admin flow)

This document describes the client-side components added for admin login and payment submission.

Files added
- src/firebaseClient.ts — Firebase client initialization (Vite env variables prefixed with VITE_)
- src/components/AdminLogin.tsx — Admin login form (Firebase email/password) that stores ID token in sessionStorage
- src/components/AdminDashboard.tsx — Admin dashboard to list pending payments and approve/reject them
- src/components/SubmitMpesaTx.tsx — Customer-facing form to submit M-Pesa transaction IDs

Environment variables (frontend)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET (optional)
- VITE_FIREBASE_MESSAGING_SENDER_ID (optional)
- VITE_FIREBASE_APP_ID (optional)
- VITE_MPESA_TILL (optional fallback for showing till on the form)

How to use
1. Ensure Firebase client config values are set in your Vite environment (.env).
2. Include the components in your app. Example in your main App.tsx:

```tsx
import React from "react";
import SubmitMpesaTx from "./components/SubmitMpesaTx";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  return (
    <div>
      <h1>Opulence Slik</h1>
      <SubmitMpesaTx />
      <AdminLogin />
      <AdminDashboard />
    </div>
  );
}
```

3. Admins should sign in via AdminLogin using their Firebase accounts.
4. After signing in, the AdminDashboard will use the stored ID token in sessionStorage to call protected admin APIs.

Security notes
- Tokens are stored in sessionStorage for simplicity; for production, implement a server-side session cookie for admin authentication.
- Admin authorization on the server is restricted to ADMIN_EMAILS environment variable (defaults to the two emails you provided).

