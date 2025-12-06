# Chronos Backend

Node.js + Express + MongoDB backend for the Chronos calendar app.

It exposes a JSON REST API for:

- Authentication (register, login, 2FA, password reset)
- Email confirmation
- Calendars & members & invites
- Events
- (Optionally) push notifications

---

## Tech Stack

- Node.js, Express
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for email
- date-fns & native JS utils

---

## Setup

### Install

```bash
npm install
```

### Environment Variables

Create `./.env`:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/chronos
JWT_SECRET=super-secret-jwt-key

APP_URL=http://localhost:5173

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Chronos <noreply@example.com>"

# For web push (how to get - `npx web-push generate-vapid-keys`)
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
```

### Run

```bash
npm run dev
# or
npm start
```

The API will be available at `http://localhost:4000/api`.

---

## Project Structure

```text
backend/
├─ src/
│  ├─ models/
│  │  └─ User.js
│  │  └─ Calendar.js
│  │  └─ Event.js
│  ├─ controllers/
│  │  └─ authController.js
│  │  └─ calendarController.js
│  │  └─ eventController.js
│  ├─ routes/
│  │  └─ auth.js
│  │  └─ calendars.js
│  │  └─ events.js
│  ├─ utils/
│  │  └─ email.js
│  │  └─ asyncHandler.js
│  │  └─ generateToken.js
│  └─ server.js (or index.js)
└─ package.json
```

(Names may differ slightly depending on your exact file layout.)

---

## Data Models (simplified)

### User

- `name` – string
- `email` – string, unique
- `password` – hashed
- `avatarUrl` – optional
- `role` – `"user"` or `"admin"`

Auth-related fields:

- `resetPasswordToken`, `resetPasswordExpires`
- `twoFactorLoginCode`, `twoFactorLoginExpires`
- `emailVerified` – boolean
- `emailVerificationToken`, `emailVerificationExpires`

### Calendar

Typical fields (simplified):

- `name`
- `color`
- `owner` (User reference)
- members / invites

### Event

Typical fields (simplified):

- `title`
- `calendarId`
- `start`
- `end`
- `allDay`
- `description`
- etc.

---

## Auth Flows

### 1. Registration + Email Confirmation

**Endpoint:** `POST /api/auth/register`  
**Body:**

```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "password123"
}
```

Flow:

1. Create user with `emailVerified = false`.
2. Create default “Main Calendar”.
3. Generate `emailVerificationToken` (expires in 24 hours).
4. Send email with link: `${APP_URL}/verify-email?token=<token>`.
5. Response: message telling the user to check email.

**Verifying:**

- Frontend calls `POST /api/auth/verify-email` with `{ "token": "<token>" }`.
- Backend checks token & expiry, sets `emailVerified = true`.
- Returns `{ token, user }` and user is considered logged in.

### 2. Login + Email-code 2FA

**Login endpoint:** `POST /api/auth/login`  
**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Flow:

1. Validate credentials.
2. Ensure `emailVerified === true`; otherwise return 403.
3. Generate 6-digit `twoFactorLoginCode`, store with expiry (~10 minutes).
4. Send code via email.
5. Response:

```json
{
  "require2FA": true,
  "userId": "<user-id>",
  "message": "Verification code sent to your email."
}
```

**Verify 2FA endpoint:** `POST /api/auth/2fa/verify`  
**Body:**

```json
{
  "userId": "<user-id>",
  "code": "123456"
}
```

If code matches and not expired:

- Clear the code fields on the user.
- Return `{ token, user }`.

### 3. Password Reset

**Request reset:** `POST /api/auth/forgot-password`  
**Body:**

```json
{
  "email": "user@example.com"
}
```

- If user exists:
  - Generate `resetPasswordToken` (expires 1h).
  - Send link `${APP_URL}/reset-password?token=<token>`.
- Always respond with generic message (no information leak):

```json
{
  "message": "If that email is registered, you'll receive a reset link shortly."
}
```

**Reset password:** `POST /api/auth/reset-password`  
**Body:**

```json
{
  "token": "<reset-token>",
  "password": "newPassword123"
}
```

- If token valid & not expired:
  - Hash new password.
  - Clear reset token fields.

### 4. Resend Email Verification

**Endpoint:** `POST /api/auth/resend-verification`  
**Body:**

```json
{
  "email": "user@example.com"
}
```

- If user exists and `emailVerified` is false:
  - Generate new `emailVerificationToken` and send link.
- Always respond with generic message.

---

## Calendars & Events (high level)

Typical endpoints (names may vary):

- `GET    /api/calendars` – list calendars
- `POST   /api/calendars` – create calendar
- `PUT    /api/calendars/:id` – update calendar
- `DELETE /api/calendars/:id` – delete

- `GET    /api/events` – events in a date range (supports query params `start`, `end`, `calendarId[]`)
- `POST   /api/events` – create event
- `PUT    /api/events/:id` – update event
- `DELETE /api/events/:id` – delete event

Most routes require `Authorization: Bearer <jwt>`.

---

## Error Handling

The project uses an `asyncHandler` wrapper and central error middleware to:

- Catch exceptions in async route handlers.
- Return JSON with `{ message: "..." }` and appropriate HTTP status codes.

---

## Testing

You can test the API using:

- curl / HTTPie
- Postman / Insomnia
- The frontend app

(There is no official test suite in this README; you can add Jest or similar if needed.)
