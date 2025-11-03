import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getEvents, createEvent } from "../controllers/eventController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/",  asyncHandler(getEvents));
router.post("/", asyncHandler(createEvent));

export default router;
