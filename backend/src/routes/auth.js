// backend/src/routes/auth.js
import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  register,
  login,
  verifyTwoFactorLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/2fa/verify", asyncHandler(verifyTwoFactorLogin));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));
router.post("/verify-email", asyncHandler(verifyEmail));
router.post("/resend-verification", asyncHandler(resendVerification));

export default router;
