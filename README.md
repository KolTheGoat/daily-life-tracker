# Daily Life Tracker

A polished full-stack health, habits, productivity, finance, and gamification website. The site ships with a useful demo mode and automatically uses PostgreSQL when `DATABASE_URL` is configured.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4242`.

## PostgreSQL setup

1. Create a PostgreSQL database.
2. Run `server/schema.sql` against it.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
4. For real web push, generate VAPID keys and set both VAPID variables.

Without PostgreSQL, the app runs in an in-memory demo mode so the complete UI remains explorable.

## Scheduled notifications

All jobs use `Asia/Jerusalem` by default:

- 10:00 — daily check-in
- 17:00 — hydration reminder
- 22:00 — streak reminder

The project is delivered as a regular responsive website and does not prompt visitors to install it as an app.
