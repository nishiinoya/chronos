import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCalendars, createCalendar } from "../controllers/calendarController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/",  asyncHandler(getCalendars));
router.post("/", asyncHandler(createCalendar));

export default router;
