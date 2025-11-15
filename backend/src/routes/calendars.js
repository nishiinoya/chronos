import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    getCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    getCalendarMembers,
    inviteCalendarMember,
    acceptCalendarInvite,
    updateCalendarMember,
    removeCalendarMember,
    getCalendarInvites,
    cancelCalendarInvite,
} from "../controllers/calendarController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", asyncHandler(getCalendars));
router.post("/", asyncHandler(createCalendar));
router.put("/:id", asyncHandler(updateCalendar));
router.delete("/:id", asyncHandler(deleteCalendar));

// members management
router.get("/:id/members", asyncHandler(getCalendarMembers));
router.post("/:id/members", asyncHandler(inviteCalendarMember));
router.patch("/:id/members/:userId", asyncHandler(updateCalendarMember));
router.delete("/:id/members/:userId", asyncHandler(removeCalendarMember));

// invites list for a specific calendar
router.get("/:id/invites", asyncHandler(getCalendarInvites));

// invite accept (token-based, user must be logged in)
router.post("/invites/:token/accept", asyncHandler(acceptCalendarInvite));

// cancel invite by id
router.delete("/invites/:inviteId", asyncHandler(cancelCalendarInvite));


export default router;
