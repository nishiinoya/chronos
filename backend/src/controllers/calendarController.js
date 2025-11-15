// backend/src/controllers/calendarController.js
import Calendar from '../models/Calendar.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { requireCalendarRole } from "../utils/calendarAccess.js";
import crypto from "crypto";
import CalendarInvite from "../models/CalendarInvite.js";
import { sendCalendarInviteEmail, buildCalendarInviteAcceptLink } from "../utils/email.js";



// GET /calendars
export async function getCalendars(req, res) 
{
    const userId = req.user.id;
    const rows = await Calendar.find({
        $or: [
            { owner: userId },
            { 'members.user': userId },
        ],
    }).sort({ createdAt: 1 });

    return res.json(rows);
}

// POST /calendars
export async function createCalendar(req, res) 
{
    const { name, color } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const calendar = new Calendar({
        name,
        color: color || '#6c6cff',
        owner: req.user.id,
        members: [], // no members by default
    });

    await calendar.save();
    return res.status(201).json(calendar);
}

// PUT /calendars/:id  (rename / recolor)
// only owner or admin of this calendar
export async function updateCalendar(req, res) 
{
    const { id } = req.params;
    const { name, color } = req.body || {};
    const userId = req.user.id;

    const calendar = await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles:["admin"],
    });

    if (name) calendar.name = name;
    if (color) calendar.color = color;
    
    await calendar.save();
    return res.json(calendar);

}

// DELETE /calendars/:id
// only the owner can delete the calendar
export async function deleteCalendar(req, res) 
{
    const { id } = req.params;
    const userId = req.user.id;

    const calendar = await Calendar.findById(id);
    if (!calendar) return res.status(404).json({ error: 'Calendar not found' });

    if (String(calendar.owner) !== String(userId)) 
    {
        return res.status(403).json({ error: 'Only calendar owner can delete it' });
    }

    // cascade delete events in this calendar (any owner)
    await Event.deleteMany({ calendarId: calendar.id });
    await calendar.deleteOne();

    return res.status(204).send();
}

/* ----------------- MEMBERS MANAGEMENT (calendar admins) ----------------- */

// GET /calendars/:id/members
// only calendar admins (or owner)
export async function getCalendarMembers(req, res)
{
    const { id } = req.params;
    const userId = req.user.id;

    const calendar = await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles: ['admin'],
    });

    await calendar.populate([
        {path: "owner", select: "name, email"},
        {path: "members.user", select: "name, email"}
    ]);

    const members = calendar.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
    }));

    const owner = {
        userId: calendar.owner.id,
        name: calendar.owner.name,
        email: calendar.owner.email,
    };

    return res.json({
        id: calendar.id,
        name: calendar.name,
        color: calendar.color,
        owner,
        members,
    });
    
}

// POST /calendars/:id/members   { email, role }
// calendar admin/owner only
export async function inviteCalendarMember(req, res) 
{
    const { id } = req.params;
    const userId = req.user.id;
    let { email, role } = req.body || {};

    if (!email) return res.status(400).json({ error: "email is required" });

    email = email.toLowerCase().trim();
    if (!role) role = "viewer";
    const allowedRoles = ["admin", "editor", "viewer"];
    if (!allowedRoles.includes(role)) 
    {
        return res.status(400).json({ error: "Invalid role" });
    }

    const calendar = await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles: ["admin"],
    });

    // 👇 we do NOT add to calendar.members here – we only create an invite

    // Optional: check if there is already a pending invite for this calendar+email
    let invite = await CalendarInvite.findOne({
        calendar: calendar._id,
        email,
        status: "pending",
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    if (invite) 
    {
        invite.token = token;
        invite.role = role;
        invite.expiresAt = expiresAt;
    }
    else 
    {
        invite = new CalendarInvite({
            calendar: calendar._id,
            email,
            role,
            token,
            expiresAt,
        });
    }

    await invite.save();

    // Build accept link for frontend
    const inviteLink = buildCalendarInviteAcceptLink(invite.token);

    // Try sending email; even if it fails, the invite exists
    try 
    {
        const inviterName = req.user.name || req.user.email || "A user";
        await sendCalendarInviteEmail({
            to: email,
            calendarName: calendar.name,
            role,
            inviterName,
            inviteLink,
        });
    }
    catch (err) 
    {
        console.error("[inviteCalendarMember] Failed to send email:", err.message);
        // We do NOT fail the request here, invite is created anyway
    }

    return res.status(200).json({
        ok: true,
        inviteId: invite.id,
        email,
        role,
        // for debug/frontend: DO NOT show token in production logs if you don’t want to
        token: invite.token,
    });
}

// POST /calendars/invites/:token/accept
// user must be authenticated; we match invite.email with req.user.email
export async function acceptCalendarInvite(req, res) 
{
    const { token } = req.params;
    const user = req.user;
    const userId = user.id;

    console.log("Accepting invite for user:", user);

    const invite = await CalendarInvite.findOne({ token }).populate("calendar");
    if (!invite || !invite.calendar) 
    {
        return res.status(404).json({ error: "Invite not found" });
    }

    // expired?
    if (invite.expiresAt && invite.expiresAt < new Date()) 
    {
        invite.status = "expired";
        await invite.save();
        return res.status(410).json({ error: "Invite has expired" });
    }

    if (invite.status !== "pending") 
    {
        return res.status(400).json({ error: `Invite is already ${invite.status}` });
    }

    // Ensure user email matches invite email
    const userEmail = (user.email || "").toLowerCase().trim();
    if (userEmail !== invite.email) 
    {
        return res.status(403).json({ error: "This invite is for a different email" });
    }

    const calendar = invite.calendar;

    // Add or update membership
    const existing = calendar.members.find(
        (m) => String(m.user) === String(userId)
    );

    if (existing) 
    {
        existing.role = invite.role;
    }
    else 
    {
        calendar.members.push({ user: userId, role: invite.role });
    }

    await calendar.save();

    invite.status = "accepted";
    invite.invitedUser = userId;
    await invite.save();

    return res.json({
        ok: true,
        calendarId: calendar.id,
        role: invite.role,
    });
}





// PATCH /calendars/:id/members/:userId   { role }
// change member role (admin only)
export async function updateCalendarMember(req, res) 
{
    const { id, userId: memberUserId } = req.params;
    const userId = req.user.id;
    const { role } = req.body || {};

    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!role || !allowedRoles.includes(role)) 
    {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const calendar = await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles: ['admin'],
    });

    if (String(memberUserId) === String(calendar.owner)) 
    {
        return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const member = calendar.members.find(
        (m) => String(m.user) === String(memberUserId)
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = role;
    await calendar.save();

    return res.json({ userId: memberUserId, role });
}

// DELETE /calendars/:id/members/:userId
// remove member (admin only)
export async function removeCalendarMember(req, res) 
{
    const { id, userId: memberUserId } = req.params;
    const userId = req.user.id;

    const calendar = await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles: ['admin'],
    });

    if (String(memberUserId) === String(calendar.owner)) 
    {
        return res.status(400).json({ error: 'Cannot remove owner from calendar' });
    }

    const before = calendar.members.length;
    calendar.members = calendar.members.filter(
        (m) => String(m.user) !== String(memberUserId)
    );

    if (calendar.members.length === before) 
    {
        return res.status(404).json({ error: 'Member not found' });
    }

    await calendar.save();
    return res.status(204).send();
}

// GET /calendars/:id/invites
// list invites for a calendar – only calendar admin/owner
export async function getCalendarInvites(req, res) 
{
    const { id } = req.params;
    const userId = req.user.id;

    // must be admin/owner of this calendar
    await requireCalendarRole({
        calendarId: id,
        userId,
        allowedRoles: ['admin'],
    });

    const invites = await CalendarInvite.find({
        calendar: id,
        status: { $in: ['pending', 'accepted', 'declined'] }, // you can filter to 'pending' only if you want
    })
        .sort({ createdAt: -1 })
        .lean();

    const result = invites.map((inv) => ({
        id: inv._id.toString(),
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
    }));

    return res.json(result);
}

// DELETE /calendars/invites/:inviteId
// cancel invite – only calendar admin/owner
export async function cancelCalendarInvite(req, res) 
{
    const { inviteId } = req.params;
    const userId = req.user.id;

    const invite = await CalendarInvite.findById(inviteId);
    if (!invite) 
    {
        return res.status(404).json({ error: 'Invite not found' });
    }

    // must be admin/owner on the calendar this invite belongs to
    await requireCalendarRole({
        calendarId: invite.calendar,
        userId,
        allowedRoles: ['admin'],
    });

    if (invite.status !== 'pending') 
    {
        // you can choose to allow cancelling any status; this keeps semantics strict
        return res.status(400).json({ error: 'Only pending invites can be cancelled' });
    }

    await invite.deleteOne();

    return res.status(204).send();
}
