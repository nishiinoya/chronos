# Chronos

Chronos is a full-stack calendar and task management app with:

- Shared calendars & member roles (owner / editor / viewer)
- Week/day views with draggable events
- Email-based authentication:
  - Email confirmation on registration
  - Email-code 2FA (two-factor login)
  - Password reset via email link
- Web push notifications (service worker)

The app is split into:

- `backend/` — Node.js + Express + MongoDB REST API
- `frontend/` — React + Vite SPA

---

## Project Structure

```text
chronos/
├─ backend/
│  ├─ src/
│  │  ├─ models/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ utils/
│  │  └─ ...
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  ├─ ui/
│  │  ├─ api/
│  │  ├─ state/
│  │  └─ ...
│  └─ package.json
└─ README.md
```

---

## Prerequisites

- Node.js (recommended: 18+)
- npm or pnpm/yarn
- MongoDB instance (local or cloud, e.g. MongoDB Atlas)
- SMTP credentials for sending emails (any provider: Gmail, Mailtrap, etc.)

Optional (for push notifications):

- VAPID keys (for web push)

---

## Quick Start

From the project root:

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env`:

```env
# General
PORT=4000
MONGO_URI=mongodb://localhost:27017/chronos
JWT_SECRET=super-secret-jwt-key

# Frontend URL (used in emails)
APP_URL=http://localhost:5173

# SMTP for sending email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Chronos <noreply@example.com>"

# For web push (how to get - `npx web-push generate-vapid-keys`)
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
```

If the frontend uses environment variables, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### 3. Run backend

```bash
cd backend
npm run dev
# or: npm start (depending on your package.json)
```

By default it listens on `http://localhost:4000`.

### 4. Run frontend

```bash
cd frontend
npm run dev
```

Vite will start dev server (usually `http://localhost:5173`).

---

## Key Features

### Authentication & Security

- **Registration** with email + password
- **Email confirmation**
  - User receives a verification link
  - After clicking the link, email is marked as verified and user is logged in
- **Login with email + password**
  - Only allowed if email is verified
- **Email-code 2FA**
  - After correct credentials, a 6-digit code is emailed to the user
  - User must enter this code to finish logging in
- **Password reset**
  - User requests reset using email
  - Receives link with secure token, chooses new password

### Calendar

- Multiple calendars per user (at least one default “Main Calendar”)
- Weekly/Day view UI
- Event creation, editing and deletion
- Minimum visual duration for tiny/zero-length events

### Sharing & Invites

- Calendar members with roles (owner / editor / viewer)
- Invitation system using email and invite tokens
- Accepting invite via frontend route (token in URL)

### Notifications

- Service worker for push notifications
- Backend sends push notifications for reminders (if configured)

---

## Development Notes

- Backend uses:
  - Express
  - Mongoose (MongoDB)
  - JWT for auth
  - Nodemailer for sending emails
- Frontend uses:
  - React (with hooks)
  - React Router
  - Context for auth state
  - date-fns for calendar date handling

See `backend/README.md` and `frontend/README.md` for more details and API/UI documentation.
