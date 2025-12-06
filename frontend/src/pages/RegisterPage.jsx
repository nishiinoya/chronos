// frontend/src/pages/RegisterPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.register({ name, email, password });
      setDone(true);
      setMessage(
        res?.message ||
          "Registration successful. Check your email to confirm your address."
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
        <h2>Create account</h2>
        {done ? (
          <>
            <p className="muted">{message}</p>
            <p className="muted">
              After confirming your email, you can{" "}
              <Link to="/login">log in</Link>.
            </p>
          </>
        ) : (
          <>
            <label className="fld">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="fld">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="fld">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="btn-login" disabled={busy} type="submit">
              Register
            </button>
            <div className="muted">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
