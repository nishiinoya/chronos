// frontend/src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.forgotPassword({ email });
      setDone(true);
      setMessage(
        res?.message ||
          "If that email is registered, you'll receive a password reset link shortly."
      );
    } catch (err) {
      alert(err.message || "Failed to send reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Reset password</h2>
        {done ? (
          <p className="muted">{message}</p>
        ) : (
          <>
            <p className="muted">
              Enter your account email and we&apos;ll send you a link to choose
              a new password.
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
              Send reset link
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
