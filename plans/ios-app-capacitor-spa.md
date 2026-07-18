# TVTracker iOS-app: SPA + REST API + Capacitor

> **Status: vastgelegd, nog niet uitgevoerd.** Opgesteld 18 juli 2026. Niets in deze repo is voor dit
> plan gewijzigd — het is een ontwerp voor later. Begin bij fase 0; die is losstaand waardevol en
> verandert geen gedrag.

## Context

Je gebruikt TVTracker nu als homescherm-PWA en wilt een echte iOS-app, met PaceAssist als
blauwdruk. Twee dingen zijn tijdens het onderzoek scherp geworden:

1. **PaceAssist is geen native app.** De iPhone-app daar is een Angular-SPA in een Capacitor-schil
   met een eigen Express REST-API; alleen de Watch-app is echt Swift. "Dezelfde opzet" betekent dus:
   losse client-side SPA + REST-API + Capacitor.
2. **TVTracker heeft vandaag geen enkele API.** Alles is RSC-HTML plus Server Actions, en Auth.js
   draait op database-sessies met een httpOnly-cookie via magic link — geen JWT, geen token.
   Server Actions hebben per build wisselende ID's en zijn dus geen bruikbare RPC-laag.

Het gevolg: het leeuwendeel van dit werk zit in de backend en de SPA, niet in Xcode. De eerste vier
fases raken geen enkele iOS-file en landen gewoon op Railway.

Gekozen aanpak: React-SPA (niet Angular — TVTracker is al React 19 + Tailwind v4), een nieuwe
`/api/v1`-laag die dezelfde service-functies aanroept als de bestaande server actions, en
token-auth die de invite-only magic-link-gate volledig intact laat.

**Distributie: externe TestFlight, niet de App Store.** App Review eist werkende demo-credentials,
en een invite-only magic-link-login is daar heel slecht aan te leveren — een bekende rejection-reden.
Externe TestFlight doet tot 10.000 testers via een publieke link, één Beta App Review per major
versie, builds verlopen na 90 dagen.

---

## Fase 0 — Service-laag extraheren (geen nieuwe features)

Hoogste hefboom, moet als eerste landen. Doel: de Prisma-logica uit `app/(app)/actions.ts` en uit de
inline page-queries halen, zodat server actions én REST-handlers dezelfde functies delen.

Regel voor alles in `lib/services/`: eerste argument `userId: string`, importeert **niets** uit
`next/*`, geen `requireUser()`, geen `revalidatePath`, geen `redirect`. Puur en curl-testbaar.

Nieuwe files: `lib/services/{follows,episodes,movies,dashboard,explore,showDetail,search,settings,invites}.ts`.
`lib/library.ts` blijft ongewijzigd — die levert al schone DTO's.

Belangrijkste signatures:

```ts
// lib/services/dashboard.ts — 1:1 gelift uit app/(app)/dashboard/page.tsx
export async function getDashboard(userId: string): Promise<{
  upNext: UpNextItem[]; upcoming: UpcomingItem[]; followCount: number;
}>;
// airDate als ISO-string, niet Date (JSON-veilig); season/number toegevoegd t.o.v. nu

// lib/services/episodes.ts — elke mutatie geeft verse voortgang terug
export async function setEpisodeWatched(
  userId: string, showTmdbId: number, season: number, number: number, watched: boolean
): Promise<ShowProgress>;
export async function markWatchedThrough(userId, showTmdbId, season, number): Promise<{marked, progress}>;
export async function setSeasonWatched(userId, showTmdbId, season, watched): Promise<ShowProgress>;
export async function setShowWatched(userId, showTmdbId, watched): Promise<ShowProgress>;

// lib/services/showDetail.ts
export async function getShowDetail(
  userId: string, tmdbId: number, opts?: { sync?: boolean }   // sync default true
): Promise<ShowDetail | null>;
```

Mutaties geven bewust verse `ShowProgress` terug: de client verzoent zijn optimistische state met het
antwoord, zonder extra GET — één round-trip per tik op een mobiel netwerk.

Callers worden dun:

```ts
// app/(app)/actions.ts — na
export async function toggleSeason(showTmdbId: number, season: number, watched: boolean) {
  const user = await requireUser();
  await setSeasonWatched(user.id, showTmdbId, season, watched);
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}
```

Om te zetten: `actions.ts`, `dashboard/page.tsx`, `explore/page.tsx`, `show/[tmdbId]/page.tsx`,
`search/page.tsx`, `settings/page.tsx`, `admin/invites/page.tsx`.

**Ook in fase 0:** een `shared/`-map naast `app/` en `lib/`, met `dto.ts`, `media.ts`
(`posterUrl`, `tvStatusLabel`, `parseDate`, `TMDB_IMG`, `DiscoverItem`), `format.ts`
(`epLabel`, `formatAirDate` met `nl-NL`), `theme.css` (het `@theme`-blok uit `app/globals.css`).
`lib/tmdb.ts` re-exporteert uit `@shared/media` zodat **geen enkele bestaande call-site verandert**;
`app/globals.css` importeert `../shared/theme.css`. Nodig omdat `lib/tmdb.ts` de TMDB-key op
module-scope leest — Next tree-shaket dat weg, Vite niet.

**Klaar als:** `npx tsc --noEmit` schoon en elke pagina rendert identiek. Nul gedragsverandering.

---

## Fase 1–2 — `/api/v1`

### Identifier-conventie

**Series en films: TMDB-int. Afleveringen: `(showTmdbId, season, number)` in het pad.** Interne cuids
gaan alleen mee in payloads als `id` voor React-keys, nooit als input.

Waarom: `Episode.tmdbId` is nullable en kan dus geen sleutel zijn, terwijl
`@@unique([showId, season, number])` de echte natuurlijke sleutel is. Dat maakt elke episode-URL
leesbaar, idempotent en herhaalbaar — en ruimt de huidige inconsistentie op tussen
`toggleWatched(cuid)` en `followShow(tmdbId)`.

### Endpoints (alles onder `app/api/v1/`, elk antwoord een object, nooit een kale array)

```
POST   /auth/exchange {code, deviceName?}          → {token, expiresAt, user}
GET    /auth/me                                     → {user}
POST   /auth/logout                                 → {ok}
GET    /meta                                        → {apiVersion, minClientBuild}   (open)

GET    /dashboard                                   → {upNext, upcoming, followCount}

GET    /series?filter=all|watching|finished&offset=&limit=  → {items: SeriesCard[], nextOffset}
GET    /shows/{tmdbId}?sync=0|1                     → ShowDetail
PUT    /shows/{tmdbId}/follow {status?}             → {following:true, status}
DELETE /shows/{tmdbId}/follow                       → {following:false}
PUT    /shows/{tmdbId}/watched {watched}            → {progress}
POST   /shows/{tmdbId}/watched-through {season,number} → {marked, progress}
PUT    /shows/{tmdbId}/seasons/{season}/watched {watched} → {progress}
PUT    /shows/{tmdbId}/episodes/{season}/{number}/watched {watched} → {watched, progress}

GET    /movies/watchlist                            → {items: MovieCard[]}
GET    /movies/watched?offset=&limit=               → {items, nextOffset}
PUT    /movies/{tmdbId}/watchlist                   → {state:"watchlist"}
DELETE /movies/{tmdbId}/watchlist                   → {state:"none"}
PUT    /movies/{tmdbId}/watched {watched}           → {state}      (haalt ook van watchlist)

GET    /explore                                     → {sections:[{key,title,items}]}
GET    /search?q=&type=all|tv|movie                 → {items: DiscoverItem & {following?, movieState?}}
GET    /similar/{kind}/{tmdbId}                     → {items}

GET    /settings                                    → {dailyEmails, weeklyDigest, pushNewEpisodes}
PATCH  /settings {partial}                          → settings
POST   /import   (multipart: file, mode)            → bestaande shape
GET    /admin/invites                               → {invites, users}
POST   /admin/invites {email}                       → {invite}
DELETE /admin/invites/{id}                          → {ok}
POST   /push/tokens {token, env}                    → {ok}
DELETE /push/tokens/{token}                         → {ok}
```

Response-shapes komen uit `lib/library.ts` (`SeriesCard`, `MovieCard`) en `@shared/media`
(`DiscoverItem`) — geen nieuwe DTO's waar een bestaande past. Zod voor elke request-body.

### Plumbing

`lib/api.ts` — `withApi()` wrapper met Dutch error-envelope `{error:{code,message}}`;
`ApiError` → status, `ZodError` → 400, rest → 500 met server-side log.

`middleware.ts` (nieuw, root) met `config.matcher = "/api/v1/:path*"` — CORS voor de webview-origin
`capacitor://tvtracker.app`, `OPTIONS` → 204. Bewust **geen** `Allow-Credentials`: native is
bearer-only. Matcher strak op `/api/v1` houden; `/api/auth/*` mag deze middleware niet zien.

**Explore is de performance-val.** `getExplore` doet 2 trending-calls + tot 5 recommendation-calls +
N `getShowStatus`. Op het web verbergt `loading.tsx` dat; als één JSON-response voelt het kapot.
Fix: in-process per-user cache (`Map<userId,{at,payload}>`, 15 min TTL) in `lib/services/explore.ts`,
~15 regels. Zelfde klasse probleem: `getShowDetail` doet inline `syncShow()` — vandaar `?sync=0`,
zodat de client eerst de cache toont en daarna in de achtergrond met `sync=1` ververst.

**Klaar als:** `scripts/api-smoke.sh` elk endpoint met curl afloopt (eerst met sessie-cookie, later
met `$TVT_TOKEN` uit de omgeving — nooit committen). Geen iOS-werk voor dit slaagt.

---

## Fase 3 — Token-auth, invite-gate intact

De app verstuurt zelf nooit mail; hij stuurt de bestaande `/login`-pagina aan via de browser.
`isAllowedToSignIn` blijft de enige poort.

1. App opent `Browser.open("https://<app>/login?native=1&redirect=tvtracker%3A%2F%2Fauth%2Fcallback")`
   (SFSafariViewController — deelt Safari's cookie-jar, wat stap 3 nodig heeft).
2. `/login` geeft door: `signIn("resend", { email, redirectTo: "/auth/native-handoff?redirect=" + encodeURIComponent(redirect) })`.
   Het custom scheme zit in een **query-param van een same-origin pad**, dus Auth.js' redirect-allowlist
   is tevreden zonder patches. (Beter dan PaceAssist, dat de allowlist zelf oprekt.)
3. Magic link in Mail → Safari → Auth.js verifieert → sessie-cookie → redirect naar de handoff.
4. `app/auth/native-handoff/page.tsx` (server component): `requireUser()`, `redirect` valideren tegen
   een hardcoded allowlist, one-time code slaan, client-component doet
   `location.href = "tvtracker://auth/callback?code=…"` **plus** een zichtbare NL-fallbackknop
   ("Open TV Tracker") — iOS blokkeert scheme-navigatie zonder user-gesture soms.
5. `App.addListener("appUrlOpen")` pakt de code, `Browser.close()`,
   `POST /api/v1/auth/exchange` → `{token, expiresAt, user}`.

Prisma-toevoegingen: `ApiToken` (userId, `tokenHash @unique`, name, platform, expiresAt, revokedAt,
lastUsedAt) en `AuthHandoffCode` (`codeHash @unique`, userId, redirect, expiresAt = now+60s, usedAt).
Token = `"tvt_" + randomBytes(32).base64url`, alleen als sha256 opgeslagen. 90 dagen geldig, glijdend
verlengd wanneer er minder dan 60 dagen resteren — en alleen als `lastUsedAt` ouder dan 24u is, zodat
het één write per maand per device is en niet één per request.

`Invite.token` (nu dood veld) **niet** hiervoor hergebruiken: andere levensduur, andere semantiek.

`lib/api-auth.ts`:

```ts
export async function getApiUser(req: Request): Promise<ApiUser | null>;   // bearer, anders auth()-cookie
export async function requireApiUser(req: Request): Promise<ApiUser>;      // 401 ApiError
export async function requireApiAdmin(req: Request): Promise<ApiUser>;     // 403 ApiError
```

CSRF: de cookie-route gaf je bij server actions gratis bescherming, plain route handlers niet. Dus:
cookie-auth mag geen mutatie doen zonder header `X-TVT-Client: web`, die cross-origin niet te zetten
is zonder geslaagde CORS-preflight.

**Klaar als:** volledig in een browser te testen — handoff-pagina openen, code uit de geblokkeerde
navigatie lezen, `exchange` met curl.

---

## Fase 4 — De SPA (grootste fase)

`mobile/` met Vite + React 19 + React Router v7 + TanStack Query v5.

Overwogen en verworpen: Next.js `output: "export"` om `app/(app)/` letterlijk te hergebruiken. Dat
verbiedt server actions en dynamische server components, dus elke pagina en elk interactief component
zou tóch herschreven worden — met een grotere bundle en geen SSR-voordeel.

TanStack Query verdient zijn plek drie keer: `invalidateQueries` vervangt `revalidatePath` 1:1,
`useInfiniteQuery` vervangt het handmatige offset-boekhouden in `InfiniteGrid`, en
`persistQueryClient` geeft offline warm-start gratis.

### Componenten: types, formatters en theme delen — componenten forken

Elk interactief component in `app/(app)/_components/` importeert uit `@/app/(app)/actions` en zit dus
vastgelast aan server actions; `PosterCard`/`MovieCard` hangen aan `next/image` + `next/link`. Alleen
`ExternalLinks` en `InfiniteGrid` zijn vrij. Een letterlijke port levert bovendien een website in een
webview op — je wilt juist een tab-bar, sheets, pull-to-refresh, safe-area-insets. Dat is een andere
compositie, niet dezelfde componenten met andere imports. De fork is ~900 regels en mechanisch, omdat
de Tailwind-classes verbatim meekomen via `shared/theme.css`.

| Next | SPA |
|---|---|
| `next/link` | React Router `<Link>` |
| `next/image` | `<img loading="lazy">` + `posterUrl(path,"w342")` |
| `next/navigation` | `useNavigate`, `useSearchParams`, route error elements |
| server actions | `useMutation` → `/api/v1` |
| `revalidatePath` | `queryClient.invalidateQueries` |
| `loading.tsx` | Suspense + skeletons |

### Structuur

```
mobile/src/
  lib/api.ts        fetch-wrapper: base-URL, bearer, X-TVT-Client, 401 → uitloggen
  lib/token.ts      Keychain + in-memory cache
  lib/auth.tsx      AuthProvider + boot-gate
  lib/query.ts      QueryClient + Preferences-persister
  lib/deeplink.ts   appUrlOpen-listener
  routes/           Login Dashboard Series Movies Explore Search Show Similar Settings
  components/       TabBar Screen PosterCard DiscoverCard MovieSheet FollowButton
                    WatchedRow SeasonSection Skeletons
```

`mobile/src/lib/api.ts` — base-URL absoluut op native (`import.meta.env.VITE_API_BASE`), relatief op
web; header `X-TVT-Client`; bearer uit de synchrone in-memory cache; 401 → token wissen en throwen.

### Boot-gate (het `APP_INITIALIZER`-equivalent)

Routes mogen niet mounten voordat auth is opgelost, anders zien guards stale state. In React: een
`<AuthProvider>` **boven** `<RouterProvider>` die `null` teruggeeft tijdens booten — de native splash
blijft staan dankzij `launchAutoHide: false`. Volgorde: `primeTokenCache()` → geen token? uit →
`GET /auth/me` → bij 401 token wissen en uit, **bij elke andere fout terugvallen op de gecachete
user**. Die non-401-fallback is wat de app in het vliegtuig bruikbaar houdt.

### `capacitor.config.ts`

```ts
{ appId: "nl.broekema.tvtracker", appName: "TV Tracker", webDir: "dist",
  server: { hostname: "tvtracker.app" },       // vriendelijke naam in iOS-permissieprompts
  ios: { contentInset: "always" },
  plugins: { SplashScreen: { launchAutoHide: false } } }
```

**`iosScheme` niet zetten.** Default (`capacitor`) houdt de webview-origin `capacitor://tvtracker.app`
gescheiden van het deep-link-scheme `tvtracker://` in `Info.plist`. Zet je `iosScheme: "tvtracker"`,
dan probeert de webview zijn eigen auth-callbacks af te handelen.

---

## Fase 5 — Capacitor-schil + eerste TestFlight

Van PaceAssist overnemen: SPM via lokale paden naar `node_modules`, lege Podfile-stub,
`Package.resolved` gitignored, en het post-`cap sync` patch-script (sync gooit custom plugins uit
`packageClassList`).

Verbeteren t.o.v. PaceAssist: token in **Keychain** via `@aparajita/capacitor-secure-storage`
(`kSecAttrAccessibleAfterFirstUnlock`, `synchronizable: false`), niet in Preferences/UserDefaults.

Native-gevoel-checklist — dit is wat het onderscheidt van een bookmark:
bottom tab-bar (Up Next · Series · Films · Verken · Zoeken) met `env(safe-area-inset-bottom)`;
`overscroll-behavior: none`; pull-to-refresh → `invalidateQueries`; `@capacitor/haptics`
`impact("light")` bij elke vink/volg-toggle; `user-select: none` op chrome;
`-webkit-tap-highlight-color: transparent`; MovieCard-modal wordt bottom sheet met drag-handle;
status-bar `Style.Dark`; push-tap → deep link naar `/show/{tmdbId}`.

**Doe het signing-werk vroeg in deze fase** — certificaten, provisioning, App Store Connect-record,
bundle-id, TestFlight — met een hello-world-archive, vóór je native code schrijft.

`.gitignore` uitbreiden: `*.p8`, `ios/App/App/public/`, `ios/App/Pods/`, `*.mobileprovision`,
`xcuserdata/`. `.dockerignore` (nu 56 bytes) moet `mobile/` krijgen, anders sleept Railway een
Xcode-project mee.

Build: `scripts/ios-release.sh` met lokale `xcodebuild` — genoeg voor een familie-app en gratis.
Xcode Cloud pas als het handmatige stapje echt irriteert, en dán **triggeren op git-tags `ios-v*`**,
nooit op elke `main`-commit. PaceAssist deed dat wel en liep tegen Apple's dagelijkse uploadlimiet
(ITMS-90382).

---

## Fase 6 — Push (APNs)

`lib/notify.ts` splitsen zodat de *berekening* gedeeld is en de *sinks* pluggable — cruciaal is dat
`Follow.notifiedThroughDate` precies één keer opschuift:

```ts
export async function collectNewEpisodes(now: Date): Promise<{
  digests: UserDigest[]; followIdsToAdvance: string[]; showsRefreshed: number; errors: string[];
}>;
// checkNewEpisodes() draait daarna per digest: dailyEmails → mail, pushNewEpisodes → push,
// en schuift pas daarna de cursor voor alle followIdsToAdvance op.
```

Let op: `collectNewEpisodes` mag niet meer kortsluiten op `!dailyEmails` — de digest wordt voor
iedereen opgebouwd, elke sink beslist zelf.

Schema: `PushToken` (userId, `token @unique`, platform, `env` sandbox|production, lastSeenAt, cascade)
en `User.pushNewEpisodes Boolean @default(true)`.

`lib/push.ts` met `@parse/node-apn`, twee providers (sandbox + production) gekozen op `PushToken.env`.
Key uit `APNS_KEY_P8` als base64-env-var — **nooit een `.p8`-bestand in deze publieke repo** — plus
`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`. Tokens opruimen bij `BadDeviceToken` / `Unregistered`
/ `DeviceTokenNotForTopic`.

Payload NL: title `"Nieuwe afleveringen"`, body `"Severance S02E05"` of `"… en 2 andere"`,
data `{kind:"show", tmdbId}`.

**De aps-environment-bug meteen goed doen** (PaceAssist heeft 'm): twee entitlement-files,
`App.entitlements` met `development` en `App.Release.entitlements` met `production`, via
`CODE_SIGN_ENTITLEMENTS` per build-configuratie. De app meldt zijn environment mee aan
`POST /api/v1/push/tokens` zodat de server de juiste APNs-host kiest. Deze mismatch is dé oorzaak van
"push werkt vanuit Xcode, sterft stil op TestFlight".

Ook overnemen: AppDelegate die het device-token doorgeeft via `NotificationCenter`
(`capacitorDidRegisterForRemoteNotifications`). En een NL **priming-scherm** vóór
`requestPermissions()` — je krijgt per installatie precies één systeemprompt.

Weekly digest blijft in v1 mail-only.

---

## Apple-vereisten

`PrivacyInfo.xcprivacy` is ook voor externe TestFlight verplicht:
`NSPrivacyCollectedDataTypeEmailAddress` (gelinkt aan identiteit, doel *App Functionality*, geen
tracking), `NSPrivacyTracking: false`, lege `NSPrivacyTrackingDomains`, en
`NSPrivacyAccessedAPICategoryUserDefaults` met reden `CA92.1` als Preferences gebruikt wordt (Keychain
hoeft niet gedeclareerd). Vragenlijst in App Store Connect gelijk invullen.

`Info.plist`: `CFBundleDisplayName "TV Tracker"`, region `nl`, `CFBundleURLTypes` scheme `tvtracker`,
`UIUserInterfaceStyle` dark. Sign in with Apple is **niet** vereist — je gebruikt geen social login.

---

## Nederlandse copy

Elke string in het Nederlands, exact zoals nu: `Up Next`, `Series`, `Films`, `Verken`, `Zoeken`,
`Instellingen`, `Uitnodigen`, `+ Volgen` / `Volg je`, `Wil ik zien`, `✓ Gezien`, `Laden…`, `nog {n}`,
`Binnenkort`, `Helemaal bij!`. Ook API-`message`-velden zijn Nederlands (ze renderen rechtstreeks in
toasts). Datums via één `formatAirDate` in `shared/format.ts` (`nl-NL`), gelift uit
`dashboard/page.tsx`, zodat web en app niet uit elkaar lopen. Codecommentaar in het Nederlands,
conform CLAUDE.md.

---

## Risico's

- **`next-auth@5.0.0-beta.25`** — een beta-bump kan `signIn`-redirectgedrag wijzigen en de handoff
  breken. **Pin de exacte versie** (laat de `^` vallen) vóór fase 3.
- **Root `middleware.ts` toevoegen** aan een Next+Auth.js-app is een bekende bron van verrassingen.
  Matcher strak op `/api/v1/:path*`, en verifieer dat `/api/auth/*` en page-routes onaangeroerd zijn.
- **Publieke repo**: `.gitignore`/`.dockerignore` uitbreiden zoals hierboven; geen `.p8`.
- **Grootste tijdvreters**, op volgorde: fase 4 (~9 schermen, ruim de helft van het totaal);
  eerste-keer iOS-signing (halve tot twee dagen); APNs (reken op een volle dag); explore-latency;
  `syncShow` bij het openen van een lange serie.

## Uit v1 geschrapt

Import-scherm (endpoint wél, UI niet — een GDPR-zip via de Files-picker met een 300s-request is een
slechte mobiele ervaring; verwijs naar het web), admin-invites-scherm, offline mutatie-queue, Android,
device-beheer in instellingen, weekly-digest-push, widgets/Live Activities/Siri, iPad-layout.

De offline mutatie-queue is later goedkoop toe te voegen dankzij de identifier-keuze: elke mutatie is
een idempotente `PUT`/`DELETE` op een natuurlijke sleutel, dus een replay-queue heeft geen
conflictresolutie en geen id-hermapping nodig.

---

## Verificatie

- **Fase 0**: `npx tsc --noEmit` schoon; `npm run dev` en elke pagina (dashboard, series, movies,
  explore, show, search, settings, admin/invites) handmatig langs — identiek gedrag, inclusief
  afvinken en volgen.
- **Fase 1–3**: `scripts/api-smoke.sh` loopt elk endpoint af met curl. Eerst met een sessie-cookie uit
  de browser, na fase 3 met een bearer-token uit `$TVT_TOKEN`. Assert op statuscodes en op het feit
  dat mutaties verse `progress` teruggeven. Auth-handoff end-to-end in de browser testen vóór er ook
  maar een Xcode-project bestaat.
- **Fase 4**: `npm --prefix mobile run dev` tegen `localhost:3000`, testen in desktop-Safari op
  iPhone-viewport met responsive mode. Alle flows: inloggen, Up Next afvinken, serie volgen, seizoen
  afvinken, film op watchlist, infinite scroll, offline herstart (netwerk uit → app blijft leesbaar).
- **Fase 5**: `npx cap run ios` op een fysiek toestel. Deep-link-flow echt doorlopen vanuit Mail.
  Daarna een TestFlight-build en installeren op een tweede toestel.
- **Fase 6**: push testen op een fysieke TestFlight-build (niet alleen vanuit Xcode — dat is precies
  waar de sandbox/production-mismatch zich verstopt). `node --env-file=.env scripts/trigger-cron.mjs`
  om de job handmatig te vuren en te controleren dat mail én push aankomen en de cursor één keer
  opschuift.
