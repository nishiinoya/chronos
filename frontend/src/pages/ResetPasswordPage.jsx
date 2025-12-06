// frontend/src/pages/ResetPasswordPage.jsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();

    if (!token) {
      alert("Reset link is invalid");
      return;
    }

    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.resetPassword({ token, password });
      setDone(true);
      setMessage(
        res?.message ||
          "Your password has been reset. You can now log in with your new password."
      );
    } catch (err) {
      alert(err.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  const invalidToken = !token;

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Choose a new password</h2>
        {invalidToken && !done && (
          <p className="muted">
            This reset link is invalid. Please request a new one from the{" "}
            <Link to="/forgot-password">forgot password</Link> page.
          </p>
        )}
        {!invalidToken && !done && (
          <>
            <label className="fld">
              <span>New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="fld">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <button className="btn-login" disabled={busy} type="submit">
              Reset password
            </button>
          </>
        )}
        {done && (
          <p className="muted">
            {message} <Link to="/login">Log in</Link>.
          </p>
        )}
        {!done && (
          <div className="muted">
            <Link to="/login">Back to login</Link>
          </div>
        )}
      </form>
    </div>
  );
}
