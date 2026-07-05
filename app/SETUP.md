# Setup: cloud sync (email/password login + Neon Postgres)

The app works fully **anonymously** with zero setup - invoices live in the
browser's localStorage. The steps below are only needed to enable **signing in**
and **syncing invoices across devices**. Nothing here is required for local,
single-device use.

There are two things to provision: a **Neon** database and the **environment
variables** that connect to it. Auth is plain email/password - no third-party
provider to configure.

---

## 1. Neon Postgres (database)

1. Create a free project at <https://neon.tech>.
2. Open the project's **SQL Editor** and run the contents of
   [`db/schema.sql`](db/schema.sql) once (creates the `users` and `invoices`
   tables).
3. Go to **Connection Details** and copy the **pooled** connection string
   (the host contains `-pooler`). This is your `DATABASE_URL`.

---

## 2. Environment variables

Copy [`.env.example`](.env.example) → `.env.local` (gitignored) for local dev,
and set the **same** vars in **Vercel → Project → Settings → Environment
Variables** for production.

| Variable       | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Neon **pooled** connection string (step 1).                                          |
| `JWT_SECRET`   | Any random secret used to sign session cookies. Generate: `openssl rand -base64 32`. |

After adding the vars in Vercel, **redeploy** so the functions pick them up.

That's it - auth is email/password, so there's no OAuth provider, redirect
URI, or client secret to manage.

---

## 3. Running locally

Just `npm run dev`. A small Vite plugin ([`vite-api-plugin.ts`](vite-api-plugin.ts))
serves the `api/` functions from inside the dev server, so the frontend **and**
the backend run together on one port - no Vercel CLI needed. It also loads
`.env.local` automatically. Production is unaffected: Vercel builds `api/` itself.

---

## Security

The app is hardened for a "very secure" bar:

- **Passwords** are bcrypt-hashed (cost 12); plaintext is never stored. A policy
  requires ≥10 chars and blocks common/predictable passwords.
- **Sessions** are httpOnly, `SameSite=Strict` JWT cookies. In production the
  cookie uses the `__Host-` prefix (browser-enforced Secure + Path binding).
- **`JWT_SECRET` is enforced ≥32 chars** - the API throws at startup otherwise,
  so it can never run with a weak/forgeable signing key.
- **Rate limiting** (Postgres-backed, `auth_attempts` table): login is capped
  per IP and per email; sign-up is capped per IP. Exceeding it returns HTTP 429.
- **Security headers** ([`vercel.json`](vercel.json)): strict CSP (no inline
  scripts, no external origins), HSTS, `X-Frame-Options: DENY`, `nosniff`,
  a locked-down `Permissions-Policy`, and `no-store` on `/api`.
- **Input** is validated with zod; SQL is fully parameterized; payloads are
  size-capped (2 MB, ≤500 invoices per sync).

## Gotchas

- **Passwords have no reset flow** (no email service wired in). If a password is
  forgotten, reset it directly in the Neon SQL editor by updating that user's
  `password_hash`, or delete the row and sign up again.
- **Secret safety**: `JWT_SECRET` and the password hashes live only in the
  serverless functions under [`api/`](api/). Never expose them via a
  `VITE_`-prefixed var - those get bundled into the browser build.
- **Locked out after failed logins?** Rate limiting is per-email for ~15 minutes.
  Wait it out, or clear the rows: `delete from auth_attempts where key = 'login:email:<you@example.com>'`.

---

## How sync behaves

- **Anonymous**: everything stays in localStorage; no network calls.
- **First sign up / sign in**: local (anonymous) invoices are **merged** into
  your account - nothing is lost. Thereafter, edits push to the server
  (debounced) and pull-merge on login, using last-write-wins by `updatedAt`.
- **Sign out**: returns to anonymous mode; invoices remain in localStorage.
