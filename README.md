# TV Tracker

Je eigen zelf-gehoste serie-tracker (TV Time-vervanger) voor jezelf, familie & vrienden.
Series volgen, afleveringen afvinken, een "Up Next"-dashboard, e-mailmeldingen bij nieuwe
afleveringen, en import van je TV Time-export. Invite-only.

## Stack
Next.js (App Router, TS) · PostgreSQL + Prisma · Auth.js (magic link via Resend) ·
TMDB voor metadata · Railway voor hosting.

---

## ⏰ Eerst: exporteer je TV Time-data (vóór 15 juli 2026!)
TV Time stopt op 15 juli 2026 en verwijdert daarna alle data.
Vraag je export aan op <https://gdpr.tvtime.com/gdpr/self-service> en bewaar de `.zip`.
Doe dit ook voor familie/vrienden die hun historie willen meenemen.

---

## Benodigde accounts / sleutels
1. **TMDB** — gratis op <https://www.themoviedb.org> → *Settings → API* → kopieer de
   **API Key (v3 auth)**. Zet als `TMDB_API_KEY`. (Of gebruik het v4 Read Access Token als
   `TMDB_BEARER`.)
2. **Resend** — <https://resend.com>. Maak een API key (`RESEND_API_KEY`). Voor betrouwbare
   verzending naar familie/vrienden: verifieer een eigen domein en gebruik dat in `EMAIL_FROM`.
   Zonder eigen domein kun je testen met `onboarding@resend.dev` (alleen naar je eigen adres).
3. **Railway** — project waarin je deze repo deployt + een PostgreSQL-plugin.

Alle env-variabelen staan in [`.env.example`](./.env.example).

---

## Lokaal draaien
```bash
npm install
cp .env.example .env          # vul de waarden in

# Postgres via Docker (of gebruik je eigen):
docker run -d --name tvtracker-pg -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=tvtracker \
  -p 5433:5432 postgres:16-alpine
# zet in .env: DATABASE_URL="postgresql://postgres:pass@localhost:5433/tvtracker?schema=public"

npx prisma migrate dev        # maakt de tabellen
npm run dev                   # http://localhost:3000
```

### Lokaal inloggen zonder e-mail (testaccount)
Er is geen wachtwoord-testaccount; login gaat via een magic link. **Lokaal** (of zonder
`RESEND_API_KEY`) wordt de inloglink niet gemaild maar **in de terminal geprint**:
1. Ga naar <http://localhost:3000/login> en vul een adres uit `ADMIN_EMAILS` in
   (het adres dat je in `ADMIN_EMAILS` hebt gezet) → dat account wordt automatisch **admin**.
2. Kopieer de `🔑 [dev] Inloglink` uit de terminal van `npm run dev` en open die in je browser.
3. Je bent ingelogd. Andere testgebruikers: nodig ze uit via **Uitnodigen** en herhaal
   stap 1–2 met hun adres (de link verschijnt ook weer in de terminal).

Zodra `RESEND_API_KEY` is gezet, worden links echt gemaild (in dev óók nog geprint).

### Meldingen lokaal testen
```bash
# start de app, dan in een tweede terminal:
node --env-file=.env scripts/trigger-cron.mjs
```

---

## Deployen op Railway
1. **Push** deze repo naar GitHub en maak in Railway een project *from repo*.
2. Voeg een **PostgreSQL**-plugin toe. Railway zet automatisch `DATABASE_URL` (koppel die
   variabele aan de web-service via *Variables → Reference*).
3. Zet de overige **Variables** op de web-service:
   `AUTH_SECRET` (genereer: `openssl rand -base64 32`), `NEXTAUTH_URL` (de publieke Railway-URL),
   `APP_URL` (zelfde URL), `TMDB_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`,
   `CRON_SECRET` (genereer: `openssl rand -hex 24`).
4. Deploy. De `startCommand` in `railway.json` draait automatisch `prisma migrate deploy`
   vóór het starten.

### Cron-service voor meldingen
Voeg in hetzelfde Railway-project een **tweede service** toe vanuit dezelfde repo:
- **Start command:** `node scripts/trigger-cron.mjs`
- **Variables:** `APP_URL` (publieke URL van de web-service) en `CRON_SECRET` (zelfde waarde).
- **Cron Schedule** (service-instelling): bijv. `0 8 * * *` voor dagelijks 08:00.

De cron-service roept het beveiligde endpoint `/api/cron/new-episodes` aan, dat de series
ververst en per gebruiker een mail stuurt met nieuw uitgezonden afleveringen.

---

## Je TV Time-historie importeren
In de app: **Import** → upload je `.zip` → **Voorbeeld tonen** (dry-run, schrijft niets weg) →
controleer de herkende series → **Import bevestigen**.

Het exportformaat van TV Time varieert; de importer detecteert de kolommen automatisch.
Herkent hij een serie niet, dan zie je dat in het rapport. Lever bij problemen één echte
export aan, dan stemmen we de kolomherkenning in `lib/import/tvtime.ts` daarop af.

---

## Structuur
```
app/(app)/          Beveiligde pagina's: dashboard, search, show, import, admin/invites
app/login/          Magic-link login
app/api/            auth, import, cron/new-episodes
lib/tmdb.ts         TMDB-client
lib/shows.ts        Serie + afleveringen syncen naar DB
lib/notify.ts       Nieuwe-afleveringen check + mail
lib/import/tvtime.ts  Adaptieve TV Time ZIP/CSV-importer
prisma/schema.prisma  Datamodel
scripts/trigger-cron.mjs  Railway Cron-trigger
```
