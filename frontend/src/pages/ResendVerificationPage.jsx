// frontend/src/pages/ResendVerificationPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.resendVerification({ email });
      setDone(true);
      setMessage(
        res?.message ||
          "If that email is registered and not yet verified, you'll receive a new verification email shortly."
      );
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Resend verification email</h2>
        {done ? (
          <p className="muted">{message}</p>
        ) : (
          <>
            <p className="muted">
              Enter the email you used to register, and we&apos;ll resend the
              verification link if your account is not yet confirmed.
            </p>
            <label className="fld">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button className="btn-login" disabled={busy} type="submit">
              Resend email
            </button>
          </>
        )}
        <div className="muted">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
