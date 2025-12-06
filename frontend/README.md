# Chronos Frontend

React + Vite frontend for the Chronos calendar app.

Features:

- Login with email + password + email-code 2FA
- Email confirmation flow after registration
- Password reset flow via email link
- Protected calendar view (only for authenticated users)
- Week/day calendar UI with draggable events
- Calendar sharing and invites UI (if implemented)
- Web push notifications (via service worker)

---

## Tech Stack

- React
- React Router
- Context API for auth (`AuthContext`)
- Vite
- date-fns for date handling
- Fetch-based API client (`src/api/client.js`)

---

## Setup

### Install

```bash
npm install
```

### Env file

Create `./.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### Run dev

```bash
npm run dev
```

Vite dev server will usually run on `http://localhost:5173`.

---

## Project Structure (simplified)

```text
frontend/
├─ src/
│  ├─ pages/
│  │  ├─ LoginPage.jsx
│  │  ├─ RegisterPage.jsx
│  │  ├─ ForgotPasswordPage.jsx
│  │  ├─ ResetPasswordPage.jsx
│  │  ├─ EmailVerifyPage.jsx
│  │  ├─ ResendVerificationPage.jsx
│  │  ├─ CalendarPage.jsx
│  │  └─ InviteAcceptPage.jsx
│  ├─ ui/
│  │  ├─ CalendarWeek.jsx
│  │  ├─ CalendarDay.jsx
│  │  └─ ...
│  ├─ api/
│  │  └─ client.js
│  ├─ state/
│  │  └─ AuthContext.jsx
│  ├─ router/
│  │  └─ ProtectedRoute.jsx
│  ├─ main.jsx
│  └─ App.jsx
└─ package.json
```

---

## Routing

Defined in `src/App.jsx`:

- `/` → redirects to `/calendar`
- `/calendar` → main calendar UI (protected)
- `/login` → login + 2FA flow
- `/register` → registration (requires email verification)
- `/forgot-password` → request password reset
- `/reset-password?token=...` → set new password
- `/verify-email?token=...` → email verification (auto-login)
- `/resend-verification` → resend confirmation email
- `/invites/:token` → accept calendar invite
- `*` → fallback → redirect to `/calendar`

`ProtectedRoute` checks auth state; if no valid token/user → redirect to `/login`.

---

## Auth Flow in UI

### 1. Register

Page: `RegisterPage.jsx`

1. User fills in name, email, password.
2. Calls `api.register`.
3. Shows message: “Check your email to confirm your address”.

### 2. Confirm Email

Page: `EmailVerifyPage.jsx`

1. User opens link from email: `/verify-email?token=...`.
2. Frontend calls `api.verifyEmail({ token })`.
3. On success:
   - `AuthContext.login` is called with `{ token, user }`.
   - User is redirected to `/calendar`.

### 3. Login + 2FA

Page: `LoginPage.jsx`

**Step 1 (credentials):**

- Form posts to `api.login({ email, password })`.
- Backend returns:

```json
{
  "require2FA": true,
  "userId": "<user-id>",
  "message": "Verification code sent to your email."
}
```

- Frontend switches `step` to `"code"`.

**Step 2 (code):**

- User enters 6-digit code.
- Calls `api.verifyTwoFactor({ userId, code })`.
- On success:
  - `AuthContext.login` is called with `{ token, user }`.
  - Navigate to `/calendar`.

### 4. Password Reset

**Forgot password:**

Page: `ForgotPasswordPage.jsx`  
Posts to `api.forgotPassword({ email })` and shows generic message.

**Reset password:**

Page: `ResetPasswordPage.jsx`  
Reads `token` from URL query.

Posts to `api.resetPassword({ token, password })`, then displays success and link to `/login`.

---

## API Client

Defined in `src/api/client.js`.

- Uses `VITE_API_URL` as base.
- Automatically attaches JWT token from `localStorage` (if present).
- Throws errors with `err.message` derived from backend JSON `{ message }`.

Available methods (auth part):

- `api.register({ name, email, password })`
- `api.login({ email, password })`
- `api.verifyTwoFactor({ userId, code })`
- `api.forgotPassword({ email })`
- `api.resetPassword({ token, password })`
- `api.verifyEmail({ token })`
- `api.resendVerification({ email })`

Calendar & events:

- `api.getCalendars()`
- `api.createCalendar(data)`
- `api.updateCalendar(id, data)`
- `api.deleteCalendar(id)`
- `api.getEvents({ start, end, calendarIds })`
- `api.createEvent(data)`
- `api.updateEvent(id, data)`
- `api.deleteEvent(id)`

Invites:

- `api.getCalendarMembers(calendarId)`
- `api.inviteCalendarMember(calendarId, data)`
- `api.updateCalendarMember(calendarId, userId, data)`
- `api.removeCalendarMember(calendarId, userId)`
- `api.getCalendarInvites(calendarId)`
- `api.cancelCalendarInvite(inviteId)`
- `api.acceptCalendarInvite(token)`

---

## Calendar UI

Main components live in `src/ui/`:

- `CalendarWeek.jsx` – week grid:
  - Renders 7 days x 24 hours.
  - Renders events with styles based on start/end time.
  - Can include a “current time” red line.
- `CalendarDay.jsx` – single-day detail (if present).
- Event modals / sidebars (depending on your implementation).

The calendar pages use:

- `api.getEvents` with a date range
- Selected calendars filter (if implemented)
- Local state for selected date, view mode (week/day), etc.

---

## Push Notifications (optional)

If configured:

- A service worker (`public/sw.js` or similar) handles `push` events.
- The frontend subscribes to push using the VAPID public key.
- The backend sends push messages for upcoming event reminders.

You typically need:

- `VAPID_PUBLIC_KEY` exposed to frontend
- Matching `VAPID_PRIVATE_KEY` in backend
- Service worker registered in `main.jsx` or similar.

---

## Building for Production

```bash
npm run build
```

This will generate a production build under `dist/`.

You can serve it using:

- Your own Node.js server
- Static hosting + proxy to the backend API
- Or integrate with the backend if desired.

---

## Styling

Auth pages and basic UI use simple utility classes like:

- `.auth-wrap`, `.auth-card`
- `.fld` (form field wrapper)
- `.btn-login`
- `.muted`
- `.link-button`

You can customize them in your main CSS file to match your design.
