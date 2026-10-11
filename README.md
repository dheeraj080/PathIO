# PathIO

A **URL shortener with built-in click analytics** — a Spring Boot REST API (PostgreSQL + Redis) and a
React single-page application, secured end-to-end with **OAuth-only authentication** (Google/GitHub)
for users and a dedicated admin console.

```
┌───────────────────────────┐        ┌─────────────────────────────────────────────┐
│  React SPA (Vite :5173)   │  HTTPS │  Spring Boot API (:8080)                    │
│  Landing · Login · Signup │ ─────► │  Security → Controllers → Services          │
│  Dashboard · Admin · …    │  JSON  │       │                  │                  │
└───────────────────────────┘        │  PostgreSQL 16     Redis 7                 │
   Google/GitHub OAuth popup          │  (Flyway V1–V9)    (cache · HLL · buffers) │
        └── postMessage ─────────────►└─────────────────────────────────────────────┘
```

- **Shortening:** `POST /api/v1/shorten` → 7-char Base62 code (or a custom alias), cached in Redis.
- **Redirects:** `GET /api/v1/{shortCode}` → `302` (public, fast, click-tracked).
- **Analytics:** total + unique clicks, daily history, referrer/device breakdowns.
- **Auth:** Google/GitHub OAuth popup for users; email/password reserved for the provisioned admin.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 27, Spring Boot 4.1.1, Spring Security + OAuth2 client, Spring Data JPA, WebMVC |
| Data | PostgreSQL 16, Redis 7, Flyway (V1–V9) |
| web | React 18, Vite 5, TypeScript, Tailwind CSS, TanStack Query, React Router 6, Recharts |
| Security | JWT (HMAC-SHA512), BCrypt, Bucket4j rate limiting, SSRF/URL safety checks |
| Observability | Micrometer + Prometheus, OpenTelemetry/OTLP tracing, Actuator |
| Infra | Docker Compose (app services + Prometheus/Grafana/Jaeger) |
| Tests | JUnit 5 + MockMvc (backend), Vitest + Testing Library + MSW (web) |

---

## Repository layout

```
pathio/
├── pom.xml                  # Maven build (backend)
├── mvnw / mvnw.cmd          # Maven wrapper
├── package.json             # Convenience scripts delegating to web/
├── .env.example             # Backend environment template
├── docker-compose.yml       # PostgreSQL + Redis
├── docker-compose.observability.yml  # Prometheus + Grafana + Jaeger
├── docker/                  # Prometheus scrape config
├── src/main/                # Spring Boot backend
│   ├── java/com/pt/pathio/
│   │   ├── controller/      # URL, analytics, admin REST endpoints
│   │   ├── config/          # Security, Web (CORS/rate limit), cache, dev profile
│   │   ├── service/         # Shortener, analytics, rate limiting, IDs
│   │   ├── auth/            # OAuth handlers, JWT, user management
│   │   ├── entity/ repository/  dto/  listener/  event/  metrics/  filter/
│   └── resources/
│       ├── application.properties
│       └── db/migration/    # Flyway V1–V9
├── src/test/                # Backend tests
├── web/                # React SPA  (see web/README.md)
└── internal/                # Local working docs (git-ignored)
```

---

## Prerequisites

- **Java 27** and Maven (or use `./mvnw` / `mvnw.cmd`).
- **Node.js 18+** (developed on Node 24) and `npm`.
- **Docker** (for PostgreSQL, Redis, and the optional observability stack).
- Google and/or GitHub **OAuth app credentials** for real sign-in (dummy values work for local dev).

---

## Getting started

### Quick start (web against a mock API — no backend required)

```bash
cd web
npm install
npm run demo          # mock API on :8081 + Vite on :5173, opens the browser
```

Sign in with the **Google** button (mock OAuth flow) or, on `/login`, use the **Administrator** tab
(`admin@pathio.local` / `admin12345`).

### Full stack

```bash
# 1. Infrastructure
docker compose up -d              # PostgreSQL :5432 + Redis :6379

# 2. Backend
cp .env.example .env              # fill in OAuth credentials and admin account
./mvnw spring-boot:run            # http://localhost:8080

# 3. web
cd web
npm install
npm run dev                       # http://localhost:5173
```

> The web calls `http://localhost:8080` by default. To use the mock API instead, set
> `VITE_API_BASE_URL=http://localhost:8081` in `web/.env`.

### Root convenience scripts

```bash
npm run demo         # web:install + mock API + Vite, opens browser
npm run dev          # Vite dev server only (web/)
npm run mock         # Hono mock API only (:8081)
npm run build        # type-check + production build
npm run test         # web tests
```

---

## Configuration

### Backend environment variables

Copy `.env.example` to `.env`. The application reads it at startup and only overrides real
environment variables / JVM properties if you set them.

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `pathio_db` / `postgres` / `secretpassword` | PostgreSQL connection |
| `DB_POOL_MAX` / `DB_POOL_MIN_IDLE` | `20` / `5` | HikariCP pool tuning |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / *(empty)* | Redis connection |
| `JWT_SECRET` | *(required — no default)* | HMAC secret — **must be ≥ 64 chars**. Startup is refused if missing, too short, or a known placeholder. Generate with `openssl rand -base64 48` |
| `JWT_ACCESS_TTL_SECONDS` / `JWT_REFRESH_TTL_SECONDS` | `3600` / `2592000` | Access token 1 h, refresh token 30 d |
| `APP_SHORTENER_DOMAIN` / `APP_SHORTENER_SERVICE_HOST` | `https://path.io/` / `path.io` | Short-link base URL + self-domain guard |
| `APP_CORS_ALLOWED_ORIGINS` | `localhost:5173,3000,3001` | CORS allow-list (also drives the OAuth popup origin filter) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | dummy values | Google OAuth app |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | dummy values | GitHub OAuth app |
| `TRACING_SAMPLING_PROBABILITY` | `1.0` | OTLP trace sample rate |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OpenTelemetry collector endpoint |

#### JWT signing secret (`JWT_SECRET`)

`JWT_SECRET` is **required** for non-dev startup and has **no built-in default**. The application
refuses to start when the secret is missing, blank, shorter than 64 characters, or equal to a known
insecure/placeholder value — including the legacy key that used to ship with the repository — so a
publicly-known value can never silently sign tokens. Generate a fresh random secret:

```bash
openssl rand -base64 48
```

PowerShell alternative:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

For **local development only**, you may skip setting the secret by explicitly running with
`SPRING_PROFILES_ACTIVE=dev` and `SECURITY_JWT_DEV_FALLBACK=true`. This deliberately activates a
documented dev-only fallback secret. It is never active for any non-dev environment: without the
combined `dev` profile + flag, startup still fails if no valid secret is provided.

### Admin account

There is no self-registration. The system provisions a single **environment administrator** at
startup (`DataInitializer`) when these are present:

- OS environment variables `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` — **or** in `.env`:
  `app.admin.email` / `app.admin.password`.

Seeded roles are `ROLE_USER` and `ROLE_ADMIN`. Only this account may use the email/password login
form (everyone else is `403 OAUTH_ONLY`).

### web environment (`web/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend (or mock :8081) base URL |
| `VITE_USE_MOCKS` | `false` | Start the MSW worker in-browser for dev |

---

## Authentication model

- **Users** sign in / sign up with **Google or GitHub** via a popup (`/login`, `/signup`). The
  backend completes the OAuth flow and `postMessage`s `OAUTH_AUTH_SUCCESS` back to the opener
  (origin-validated against the CORS allow-list). First sign-in creates the account.
- **Admin** (env-provisioned) may additionally sign in with email/password on `/login`.
- The **access token lives in memory only**; sessions are restored on reload via the **HttpOnly
  refresh cookie** (`POST /api/v1/auth/refresh`), which is **rotated on every refresh** and revoked
  on logout.
- All API calls are made with `credentials: 'include'` and a `Bearer` access token; a single-flight
  `401 → refresh → retry` cycle keeps sessions alive.
- The web redirects anonymous users to `/login?redirect=<path>` and returns them after sign-in.

---

## API reference

All endpoints return JSON (`ApiError` bodies on failure). Base path `/api`.

### URLs

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/shorten` | auth | Create a short link (supports `customAlias`) → `201` |
| `GET` | `/api/v1/urls/me` | auth | Paginated list of your links (20/page, newest first) |
| `GET` | `/api/v1/{shortCode}` | public | `302` redirect to the original URL (records a click) |
| `PUT` | `/api/v1/urls/{shortCode}` | owner | Edit the destination URL |
| `DELETE` | `/api/v1/urls/{shortCode}` | owner | Delete a link → `204` |

### Analytics (`/api/v1/analytics`)

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/urls/{shortCode}` | owner | Total + unique clicks, created date |
| `GET` | `/urls/{shortCode}/history?days=30` | owner | Zero-filled daily click series (max 365) |
| `GET` | `/urls/{shortCode}/breakdown?days=30` | owner | Referrer and device breakdowns |
| `GET` | `/overview` | auth | Your total links + clicks |

### Admin (`/api/admin`) — `ROLE_ADMIN` only

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/urls` | Paginated list of all links |
| `DELETE` | `/api/admin/urls/{shortCode}` | Delete any link |
| `GET/POST/PUT/DELETE` | `/api/v1/users` | User CRUD (self-service reads/updates allowed) |

### Auth (`/api/v1/auth`)

`POST /login` (admin only), `POST /refresh` (cookie/body/header), `POST /logout`.
OAuth login goes through Spring Security at `/oauth2/authorization/{google|github}`.

### Other

- `GET /actuator/health` (public) and `GET /actuator/prometheus` (exposed).
- Swagger UI at `/swagger-ui.html` (springdoc is wired; controllers are not yet annotated with
  `@Operation`/`@Tag`).

---

## How shortening & analytics work

1. **IDs:** a range-based `IdGenerator` maintains 40-bit sequence IDs in PostgreSQL
   (`id_generator`, step 10 000, async pre-fetch on virtual threads) so `nextId()` never touches the
   DB in the hot path.
2. **Obfuscation:** the ID passes through a 4-round **Feistel cipher** and is encoded as a 7-char
   Base62 code — short, non-sequential and collision-safe.
3. **Custom aliases** (1–32 chars, `[a-zA-Z0-9_-]`) skip generation; reserved words are blocked and
   conflicts return `409`.
4. **Safety:** every destination is URL/SSRF-checked (no loopback/private/link-local/multicast IPs,
   DNS fail-closed, self-domain blocked).
5. **Cache:** `url:{shortCode}` in Redis with a 7-day TTL; unknown codes get a 5-minute *negative*
   cache entry; edits/deletes evict and re-warm.
6. **Clicks:** each redirect publishes an async event that buffers counts in Redis
   (`url:pending_*` hashes) and flushes every 30 s into PostgreSQL — redirects stay fast and
   analytics are eventually consistent.
7. **Unique clicks:** Redis **HyperLogLog** keyed by `SHA-256(clientIp|userAgent)` (no raw PII,
   90-day TTL).

---

## Security

- **OAuth-only** for users — no email/password registration (removed deliberately).
- JWT access tokens (HMAC-SHA512, 1 h) + DB-backed rotating refresh tokens (30 d, HttpOnly cookie).
- Method-level security (`@EnableMethodSecurity`) with **ownership checks** — you can only read/edit/
  delete your own links; anonymous callers get `401`, authenticated non-owners get `403`/`404`.
- **Rate limiting** with Bucket4j: 60 req/min per IP on `/api/**`, Redis-backed with an in-memory
  fallback.
- Passwords are BCrypt-hashed and **never** serialized in DTOs.
- CORS configured with credentials; the OAuth popup only accepts `postMessage` from allow-listed
  origins.
- ⚠️ A `dev` Spring profile (`DevSecurityConfig`) disables all security — never use it outside your
  local machine.

---

## Observability

```bash
docker compose -f docker-compose.observability.yml up -d
```

| Service | URL | Login |
|---|---|---|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | `admin` / `admin` |
| Jaeger | http://localhost:16686 | — |

Prometheus scrapes `http://localhost:8080/actuator/prometheus` (job `pathio-app`). Custom metrics:
`pathio.url.shorten`, `pathio.url.redirect.cache`, `pathio.ratelimit.blocked`, `pathio.url.deleted`,
`pathio.url.updated`, `pathio.url.redirect.latency`, `pathio.analytics.flushed.clicks`. Distributed
tracing sends OTLP to Jaeger (`:4318`) with `traceId`/`spanId` in the logs.

---

## web

The web is a multi-route React SPA. See **`web/README.md`** for the full build plan,
mock/demo instructions, and project structure.

| Route | Page | Access |
|---|---|---|
| `/` | Marketing landing (signed-in users go to `/dashboard`) | public |
| `/login` | Google/GitHub + admin email/password | public |
| `/signup` | Google/GitHub account creation (OAuth-only) | public |
| `/dashboard` | Shorten form, account overview, links table | auth |
| `/links/:shortCode` | Per-link analytics (history chart, referrers, devices) | auth |
| `/profile` | Edit display name | auth |
| `/admin/users`, `/admin/links` | Admin console | admin |
| `*` | 404 | public |

Development doubles as a test bed: **MSW** handlers power the Vitest suite and in-browser mocking
(`VITE_USE_MOCKS=true`), and a standalone **Hono mock API** (`npm run mock` → `:8081`) implements the
full contract with real cookies and a working OAuth popup.

---

## Testing

**Backend** (`./mvnw test`, 19 classes): ownership & analytics, link management (aliases, update,
delete for owner/non-owner), analytics depth (HLL, rollups, breakdowns) plus alias-reuse binding,
method security, OAuth popup, refresh-family rotation, JWT/cookie services, analytics flush, ID
generation/Feistel units, redirect cache fallback, and the auth policy (anonymous shorten → `401`,
non-admin login → `403 OAUTH_ONLY`, admin login → `200`, missing endpoint → `404`).

**web** (`cd web && npm test`, 34 tests): OAuth popup helper, API client refresh/retry and session
teardown on silent-refresh failure, shorten forms, links table pagination, analytics panel, admin
user management, auth flows.

---

## Database & migrations

Flyway migrations run automatically on startup (`ddl-auto=validate`):

| Migration | Change |
|---|---|
| `V1` | `id_generator` sequence table |
| `V2` | `users`, `roles`, `user_roles`, `refresh_token`, `urls`, `id_generator` |
| `V3` | `urls.user_id` FK → `users` (ownership) |
| `V4` | `short_code` widened to 32 chars (custom aliases) |
| `V5` | `click_rollup` + `click_breakdown` analytics tables |
| `V6` | `refresh_token_family` — token families for rotation & reuse-revocation |
| `V7` | analytics bound to immutable `urls.id` (FK `ON DELETE CASCADE`) |
| `V8` | `id_generator` ceiling aligned to the 40-bit ID space (`chk_40bit_limit`) |
| `V9` | `api_keys` — user API keys (only SHA-256 `key_hash` is stored) |

---

## Troubleshooting

- **web shows "API offline" / CORS errors:** the API base URL must match a CORS allow-list entry
  (`APP_CORS_ALLOWED_ORIGINS`), e.g. `http://localhost:5173`.
- **OAuth sign-in bounces or never resolves:** add your app origin to `APP_CORS_ALLOWED_ORIGINS`
  (it also gates the popup `postMessage`), and confirm the provider client IDs/secrets.
- **Admin password login fails:** the account is provisioned only when `app.admin.email` /
  `app.admin.password` (or `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`) are set on first startup.
- **Rate-limited while testing:** the default is 60 requests/min per IP — short waits reset the bucket.
- **The `dev` profile disables security entirely** — use it only locally.

---

## Roadmap

Phase 1–4 (link CRUD + aliases, richer analytics, OAuth-only auth, observability fixes) are complete.
Open items include API keys + rate-limit headers, geo analytics, link expiry / password-protected
links, search/tags, self-service account deletion, custom domains, and webhooks. The working feature
plan lives in `internal/plan.md` (git-ignored, local only).

---

## License

This project is under active development for the PathIO URL shortener — see the repository for the
latest state.