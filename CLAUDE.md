# CLAUDE.md

Guidance for Claude Code (and contributors) when working in this repository.

## ⚠️ This is a PUBLIC repository
`https://github.com/webmug/TVTracker` is **public**. Treat everything committed here as
world-readable and permanent (git history + search-engine/AI indexing).

**Never commit secrets or personal data.** Specifically:
- No API keys/tokens (TMDB, Resend), `AUTH_SECRET`, `CRON_SECRET`, database URLs/passwords.
- No real e-mail addresses or user data in code, examples, or docs — use placeholders
  like `jij@voorbeeld.nl`.
- Secrets live only in a local, git-ignored `.env` (see `.env.example` for the shape).
  `.gitignore` already excludes `.env`; keep it that way.
- Before committing, sanity-check the diff for anything sensitive. If a secret is ever
  committed, treat it as compromised: rotate it and scrub history.

## What this is
A self-hosted TV Time replacement: track TV shows, check off episodes, "Up Next" dashboard,
daily new-episode e-mail notifications, and an importer for the TV Time GDPR export.
Invite-only, meant for a small group (family & friends).

Stack: Next.js (App Router, TS) · Prisma + PostgreSQL · Auth.js (magic link via Resend) ·
TMDB metadata · deployed on Railway. See `README.md` for setup, local dev, and deploy steps.

## Commands
- `npm run dev` — local dev server (prints the magic-link login URL to the terminal in dev).
- `npx prisma migrate dev` — apply DB migrations locally.
- `npm run build` — production build (runs `prisma generate`).
- `npx tsc --noEmit` — typecheck.
- `node --env-file=.env scripts/trigger-cron.mjs` — trigger the new-episode notification job.

## Layout
- `app/(app)/` — protected pages: dashboard, search, show, import, admin/invites.
- `app/login/`, `lib/auth.ts`, `lib/access.ts` — invite-only magic-link auth.
- `app/api/` — auth, import, `cron/new-episodes` (secret-protected).
- `lib/tmdb.ts`, `lib/shows.ts` — TMDB client + syncing shows/episodes to the DB.
- `lib/notify.ts` — new-episode detection + e-mail.
- `lib/import/tvtime.ts` — adaptive TV Time ZIP/CSV importer (column detection varies).
- `prisma/schema.prisma` — data model.

## Conventions
- UI copy and code comments are in Dutch (nl); keep new user-facing text in Dutch.
- Keep the invite-only gate intact; new users must be admins (`ADMIN_EMAILS`) or invited.
