// frontend/src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState("credentials"); // "credentials" | "code"
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");

  const { login } = useAuth();
  const nav = useNavigate();

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.login({ email, password });

      if (res.require2FA && res.userId) {
        setUserId(res.userId);
        setStep("code");
        setInfo(res.message || "Verification code sent to your email.");
        setCode("");
      } else if (res.token && res.user) {
        // fallback in case backend returns token directly
        login(res);
        nav("/calendar", { replace: true });
      } else {
        alert("Unexpected login response");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    if (!userId) {
      alert("Missing login session. Please log in again.");
      setStep("credentials");
      return;
    }
    if (!code) {
      alert("Enter the verification code from your email.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.verifyTwoFactor({ userId, code });
      login(res);
      nav("/calendar", { replace: true });
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      {step === "credentials" && (
        <form className="auth-card" onSubmit={handleCredentialsSubmit}>
          <h2>Sign in</h2>
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
            Continue
          </button>
          <div className="muted">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="muted">
            No account? <Link to="/register">Register</Link>
          </div>
          <div className="muted">
            Didn&apos;t get a verification email?{" "}
            <Link to="/resend-verification">Resend</Link>
          </div>
        </form>
      )}

      {step === "code" && (
        <form className="auth-card" onSubmit={handleCodeSubmit}>
          <h2>Enter verification code</h2>
          {info && <p className="muted">{info}</p>}
          <p className="muted">
            We sent a 6-digit code to your email. Enter it to finish logging in.
          </p>
          <label className="fld">
            <span>Code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <button className="btn-login" disabled={busy} type="submit">
            Verify and log in
          </button>
          <div className="muted">
            <button
              type="button"
              className="link-button"
              onClick={() => setStep("credentials")}
            >
              Back to email &amp; password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
