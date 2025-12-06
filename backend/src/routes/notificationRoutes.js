import express from "express";
import { saveSubscription } from "../controllers/pushController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/subscribe", authMiddleware, saveSubscription);

export default router;
