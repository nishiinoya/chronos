// frontend/src/pages/EmailVerifyPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function EmailVerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [message, setMessage] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Verification link is invalid.");
        return;
      }

      try {
        const res = await api.verifyEmail({ token });
        setStatus("ok");
        setMessage("Email verified! Redirecting to your login...");
        setTimeout(() => {
          nav("/login", { replace: true });
        }, 1000);
      } catch (e) {
        setStatus("error");
        setMessage(e.message || "Failed to verify email.");
      }
    }
    run();
  }, [token, login, nav]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Email verification</h2>
        {status === "loading" && (
          <p className="muted">Verifying your email, please wait…</p>
        )}
        {status === "ok" && <p className="muted">{message}</p>}
        {status === "error" && (
          <>
            <p className="muted">{message}</p>
            <p className="muted">
              You can{" "}
              <Link to="/resend-verification">
                request a new verification email
              </Link>{" "}
              or go back to <Link to="/login">Login</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
