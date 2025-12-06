// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import CalendarPage from "./pages/CalendarPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import InviteAcceptPage from "./pages/InviteAcceptPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import EmailVerifyPage from "./pages/EmailVerifyPage.jsx";
import ResendVerificationPage from "./pages/ResendVerificationPage.jsx";
import ProtectedRoute from "./router/ProtectedRoute.jsx";
import { AuthProvider } from "./state/AuthContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<EmailVerifyPage />} />
        <Route
          path="/resend-verification"
          element={<ResendVerificationPage />}
        />
        <Route path="/invites/:token" element={<InviteAcceptPage />} />

        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
    </AuthProvider>
  );
}
