import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getEvents, createEvent, updateEvent, deleteEvent} from "../controllers/eventController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/",  asyncHandler(getEvents));
router.post("/", asyncHandler(createEvent));
router.put('/:id', asyncHandler(updateEvent));
router.delete('/:id', asyncHandler(deleteEvent))

export default router;
