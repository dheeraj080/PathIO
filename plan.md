# PathIO — URL Shortener Feature Plan

> Editable working document. Audit of the existing codebase (as of 2026-10-10) plus a prioritized
> roadmap for the missing features. Check off items as they land.
>
> **Note:** the docs in `internal/frontend-integration-docs/` and `internal/frontend-handoff/` are
> stale — they claim `user_id` and analytics endpoints don't exist, but both have since been added
> (`V3__add_user_id_to_urls.sql`, `UrlAnalyticsController`, `GET /api/v1/urls/me`).

---

## 0. Decisions (locked)

1. **OAuth-only authentication** — Google + GitHub only for regular users. No email/password
   registration or login for normal users. **Exception:** an env-provisioned local admin
   (`ADMIN_EMAIL` / `ADMIN_PASSWORD` via `DataInitializer`) may still log in with a password.
2. **No anonymous shortening** — `POST /api/v1/shorten` requires an authenticated OAuth user.
   Redirects (`GET /api/v1/{shortCode}`) remain public so shared links work for everyone.
3. **No link cap anywhere** — the earlier "10 links for unregistered users" idea is moot now
   that unregistered users can't create links. Registered users are unlimited.
4. **Dev data** — existing `user_id IS NULL` rows can be wiped with a one-off cleanup; no
   migration/backfill code path needed.
5. **Duplicate long URLs allowed** — the same long URL can be shortened many times. This is
   already the behavior (fresh ID → Feistel → new code every time); no dedup will be built.

---

## 1. Current State Audit

### ✅ Built — Core Shortening

- [x] **Shorten URL** — `POST /api/v1/shorten`, public/anonymous *today* (see Decision 2 — to be locked down), returns 201 (`UrlController`)
- [x] **Redirect** — `GET /api/v1/{shortCode}` → HTTP 302 with `Location` header
- [x] **Short code generation** — 41-bit sequence ID + 4-round Feistel cipher + Base62, fixed 7 chars (`IdGenerator`, `FeistelObfuscator`)
- [x] **URL validation / SSRF protection** — http/https only, no loopback/private/link-local IPs (DNS fail-closed), no self-domain shortening (`UrlShortenerService.validateUrlSafety`)
- [x] **Redis caching** — 7-day TTL on redirect lookup, 5-minute negative cache for unknown codes
- [x] **Short code format guard** — exact 7-char alnum regex before DB/cache hit

### ✅ Built — Ownership & Dashboard

- [x] **URL ↔ user association** — `user_id UUID` FK, `ON DELETE SET NULL` (V3 migration)
- [x] **My links list** — `GET /api/v1/urls/me`, paginated (20/page), newest first
- [x] **Anonymous shortening preserved** — *to be removed per Decision 2; column stays nullable*

### ✅ Built — Analytics (basic)

- [x] **Async click tracking** — `UrlClickedEvent` → Redis `HINCRBY` buffer → 30s batched flush (`UrlAnalyticsListener`)
- [x] **Per-link stats** — `GET /api/v1/analytics/urls/{shortCode}` (total incl. pending, ownership-enforced)
- [x] **Account overview** — `GET /api/v1/analytics/overview` (total URLs, total clicks)
- [x] **Denormalized click count** — `urls.click_count`

### ✅ Built — Authentication

- [x] Local register / login / refresh / logout (`AuthController`) — *register to be removed, login restricted to admin (Decision 1)*
- [x] JWT access (1h, HMAC-SHA512, Bearer) + refresh (30d) with DB-backed rotation & revocation
- [x] Refresh token accepted via cookie, body, or `X-Refresh-Token` header
- [x] Google + GitHub OAuth2 popup `postMessage` flow (`OAuth2SuccessHandler`) — **the primary login path**
- [x] BCrypt hashing, email format + uniqueness validation
- [x] Admin user CRUD with `@PreAuthorize` role/ownership checks (`UserController`)
- [x] Admin auto-provisioning via env vars (`DataInitializer`)
- [x] Password never serialized in DTOs (all service methods null it out)

### ✅ Built — Security & Reliability

- [x] Rate limiting — Bucket4j 60 req/min per IP, Redis-backed with in-memory fallback, 429 JSON
- [x] Method-level security — `@EnableMethodSecurity`, ownership self-checks
- [x] Standardized error handling — `GlobalExceptionHandler` (anonymous→401, authenticated→403)
- [x] CORS configured with credentials

### ✅ Built — Observability & Ops

- [x] Micrometer metrics (shorten success/fail, cache hit/miss, rate-limit blocks, redirect latency)
- [x] Distributed tracing (OTLP) + traceId/spanId MDC + `TraceCorrelationFilter`
- [x] `/actuator/health` public
- [x] Docker Compose (app + Postgres 16 + Redis 7) + observability compose (Prometheus/Grafana/Tempo)
- [x] Flyway migrations V1–V3
- [x] Test suite: 5 classes (ownership/analytics, method security, OAuth popup, DTO/security, context load)

---

## 2. Missing Features (Backlog)

### Auth (Phase 3) — ✅ DONE

- [x] **Block anonymous shortening** — removed `permitAll` on `POST /api/v1/shorten`; service now requires a `UserPrincipal` (`AccessDeniedException` → 401)
- [x] **Remove local registration** — deleted `POST /api/v1/auth/register`, `AuthService`, `AuthServiceImpl`
- [x] **Restrict password login to env admin** — `POST /api/v1/auth/login` succeeds only for `provider == LOCAL` + email matching `ADMIN_EMAIL`; otherwise 403 `OAUTH_ONLY` "Sign in with Google or GitHub"
- [ ] **Wipe anonymous rows** — one-off op, NOT run automatically (dev DB config mismatch). Run manually against the dev DB:
      `DELETE FROM urls WHERE user_id IS NULL;`

### Link Management (Phase 1)

- [x] **Delete a link** — `DELETE /api/v1/urls/{shortCode}` (owner-scoped, evicts Redis cache)
- [x] **Edit a link's destination URL** — `PUT /api/v1/urls/{shortCode}` (reuses `validateUrlSafety`, re-warms cache)
- [x] **Custom short alias / vanity slug** — optional `customAlias` on shorten, 1–32 chars `[a-zA-Z0-9_-]`, reserved words blocked, 409 on conflict
- [ ] **Link expiration / TTL** (Phase 6)
- [ ] **Password-protected links** (Phase 6)
- [ ] **Search / filter / tags / folders** — pagination only today (Phase 6)
- [ ] **Bulk shorten / CSV import** (Phase 6, optional)

*Removed from backlog (decided): duplicate detection (allowed by design), anonymous-link cap (no anonymous links).*

### Analytics Depth (Phase 2) — ✅ DONE (geo breakdown remains future)

- [x] **Time-series click history** — `click_rollup` table + `GET /api/v1/analytics/urls/{shortCode}/history?days=30` (zero-filled)
- [x] **Unique vs total clicks** — Redis HyperLogLog (`url:unique:{code}`), exposed as `uniqueClicks`
- [x] **Referrer / device / UA breakdowns** — `click_breakdown` table + `GET /api/v1/analytics/urls/{shortCode}/breakdown?days=30` (referrer domain + device type)
- [ ] **Geo breakdown** — not implemented (needs IP geolocation)
- [ ] **QR code generation** — no backend endpoint (Phase 6)
- [x] **Admin link management** — `GET /api/admin/urls` + `DELETE /api/admin/urls/{shortCode}` (ADMIN-gated)

### Account (mostly removed by Decision 1)

*Removed from backlog (decided): forgot/reset password, email verification, 2FA — no local users to serve.*

- [ ] **Self-service account deletion** (Phase 6 — only admin can delete today)

### API & Developer Experience (Phase 5)

- [ ] **User API keys** — no programmatic access; rate limit is IP-only (proxy-hostile, no per-user tier)
- [ ] **Rate-limit response headers** — `Retry-After` / `X-RateLimit-*` missing, bare 429 body only
- [ ] **Webhooks / integrations** (Phase 6)
- [ ] **OpenAPI annotations** — springdoc present but zero `@Operation`/`@Tag`; Swagger UI unlabelled
- [ ] **301 vs 302 redirect choice** — hardcoded 302 (Phase 6)

### Production-Readiness (Phase 4 / 6)

- [ ] **Prometheus scraping effectively disabled** — `management.endpoints.web.exposure.include=health` and `management.endpoint.prometheus.enabled=false`, so the metrics code and observability compose never receive data (Phase 4, config-only)
- [ ] **Branded / custom domains** (Phase 6)
- [ ] **Malware / phishing domain blocklist** (Phase 6)
- [ ] **CAPTCHA / abuse reporting** (Phase 6)

---

## 3. Implementation Roadmap

### Phase 1 — Link CRUD + Custom Aliases (highest user value) — ✅ DONE

Implemented and verified (all tests green):

- **1a. Delete a link** — `DELETE /api/v1/urls/{shortCode}` → 204. Owner-scoped via `findByShortCodeAndUserId`; 404 for non-owners. Evicts `url:{shortCode}` and plants a 5-min negative cache to block stale-cache resurrection. `UrlShortenerService.deleteUrl`.
- **1b. Edit destination URL** — `PUT /api/v1/urls/{shortCode}` with `{ "longUrl": "..." }`. Reuses `validateUrlSafety`, re-warms the cache, returns the updated `UserUrlResponse`. `UrlShortenerService.updateUrl`.
- **1c. Custom alias** — optional `customAlias` field on `POST /api/v1/shorten` (V4 migration widens `short_code` to `VARCHAR(32)`). Rules: 1–32 chars `[a-zA-Z0-9_-]`, reserved words blocked (`api`, `auth`, `admin`, `users`, `urls`, `analytics`, `actuator`, `swagger`, `v3`, `login`, `error`, `public`, `health`, `favicon.ico`), 409 `ConflictException` on duplicate/race. Redirect format guard widened to 1–32 chars.
- New: `ConflictException` + 409 handler, `UpdateUrlRequest`, best-effort cache warming on shorten (fixes the doc/code mismatch where aliases re-created after delete needed a warm cache), Micrometer counters `pathio.url.deleted` / `pathio.url.updated`.
- Tests: `UrlLinkManagementTest` (8 cases) — alias create/duplicate/reserved/invalid, generated-code format, owner/non-owner update, owner/non-owner delete.

### Phase 2 — Richer Analytics — ✅ DONE

Implemented and verified (all tests green):

- **2a. Time-series clicks** — `V5__click_analytics_depth.sql` adds `click_rollup(click_date, short_code, clicks)`. Listener buffers per-day counts in `url:pending_daily:{date}` and upserts them during the 30s flush. `GET /api/v1/analytics/urls/{shortCode}/history?days=30` returns a zero-filled `[{date, clicks}]` series (max 365 days).
- **2b. Unique clicks** — Redis HyperLogLog `url:unique:{code}` keyed by SHA-256(clientIp|userAgent) (no raw PII stored), 90-day TTL. Exposed as `uniqueClicks` on `UrlAnalyticsResponse`.
- **2c. Referrer / device capture** — `UrlClickedEvent` widened to `{shortCode, referrer, userAgent, occurredAt}`; redirect controller passes `X-Forwarded-For`/`RemoteAddr`, `User-Agent`, `Referer`. Listener buffers `url:pending_breakdown:{date}` and upserts into `click_breakdown(click_date, short_code, dimension, dimension_value, clicks)` with `REFERRER`/`DEVICE` dimensions. `GET /api/v1/analytics/urls/{shortCode}/breakdown?days=30`.
- **2d. Admin link management** — `AdminUrlController`: `GET /api/admin/urls` (paginated, all users) + `DELETE /api/admin/urls/{shortCode}`, protected by the existing `/api/admin/** → hasRole("ADMIN")` rule.
- New: entities/repos `ClickRollupEntity`, `ClickBreakdownEntity`, `ClickRollupRepository`, `ClickBreakdownRepository`; DTOs `ClickHistoryPoint`, `ClickBreakdownResponse`; ownership-guarded `requireOwnedUrl` helper in `UrlAnalyticsService`.
- Tests: `UrlAnalyticsDepthTest` (4 cases: unique HLL, flush→history/breakdown, zero-fill, ownership) + admin list/delete case in `UrlLinkManagementTest`.

### Phase 3 — OAuth-Only Auth + Admin Password Login ✅ DONE (net code *removal*)

Implemented and verified (all 34 tests green):

1. **Registration removed** — `POST /api/v1/auth/register`, `AuthService` and `AuthServiceImpl` deleted.
   OAuth account creation stays in `OAuth2SuccessHandler` (first login creates the account).
   The admin-only `POST /api/v1/users` path (`UserController` + `UserServiceImpl.createUser`) is unchanged.
2. **Login restricted** — `AuthController.login` looks up the email first: password login is allowed only for
   `provider == Provider.LOCAL` **and** email `equalsIgnoreCase(ADMIN_EMAIL)`. Anyone else (OAuth users,
   self-registered local users) gets `403` with `{"error": "OAUTH_ONLY", "message": "Sign in with Google or GitHub"}`
   via the new `OAuthOnlyException` + `GlobalExceptionHandler.handleOAuthOnly`. Unknown emails still 401 (bad credentials).
3. **Shortening locked down** —
   - `SecurityConfig`: removed `.requestMatchers(HttpMethod.POST, "/api/v1/shorten").permitAll()`
     (falls to `anyRequest().authenticated()` → the existing 401 JSON entry point).
   - `UrlShortenerService.shortenUrl`: `requireCurrentUser()` throws `AccessDeniedException` when there is no
     `UserPrincipal`; the `user == null` branch is gone.
   - `GET /api/v1/{shortCode}` (single-segment GET matcher) stays public → anonymous redirects still 302.
4. **Anonymous rows** — one-off `DELETE FROM urls WHERE user_id IS NULL;` is **not** run automatically
   (running dev container exposes `pluto_db`, while `.env` targets `pathio_db`). Run it manually against the dev DB.
5. **User cleanup (optional, later)** — non-admin `LOCAL` users created before this change simply can't log in anymore.
6. **Tests** — `AuthPhase3SecurityTest` (MockMvc): anonymous shorten → 401; OAuth user shorten → 201 with
   `user_id` set; local non-admin login → 403 `OAUTH_ONLY`; env admin login → 200; register → 404; public redirect → 302.
   Also fixed a latent bug: unknown endpoints returned 500 because the catch-all handler swallowed Spring's
   404 — `GlobalExceptionHandler` now maps `NoResourceFoundException`/`NoHandlerFoundException` → 404.

**Frontend impact:** hero form must gate on auth — unauthenticated visitors get the
Google/GitHub popup before their URL is submitted.

### Phase 4 — Observability Fixes (config-only, cheap win)

- `management.endpoints.web.exposure.include=health,prometheus`
- `management.endpoint.prometheus.enabled=true`
- Verify `docker-compose.observability.yml` scrapes the app; add
  `management.metrics.tags.application=pathio`.

### Phase 5 — API Keys + Developer Experience

- Migration V6: `api_keys(id, user_id, key_hash, label, last_used_at, revoked_at)`.
- `POST/GET/DELETE /api/v1/api-keys` (plaintext key returned once, store SHA-256 hash).
- Auth: `X-API-Key` → same `UserPrincipal` (dedicated filter alongside `JwtAuthenticationFilter`).
- Rate limiting: key by `user:{id}` when authenticated, fall back to IP when anonymous
  (public redirects still hit the limiter).
- Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` on 429.
- OpenAPI: `@Tag`/`@Operation` on all controllers + `@SecurityScheme` for Bearer and API key.

### Phase 6 — Optional / Later

- Link expiration (`expires_at` column + check in `getOriginalUrl` + cache TTL must respect expiry)
- Password-protected links (unlock prompt page)
- Search/filter/tags on `/urls/me` (`?q=&sort=`)
- QR code endpoint (`GET /api/v1/urls/{shortCode}/qr`, e.g. `zxing`)
- Self-service account deletion
- Custom/branded domains
- Malware blocklist (Google Safe Browsing / DNSBL)
- 301/302 toggle on shorten
- Webhooks (e.g. callout on N clicks)
- Bulk shorten / CSV import

---

## 4. Cross-Cutting Concerns (apply to every phase)

- **Tests:** every endpoint needs owner/non-owner/anonymous cases; follow
  `UrlOwnershipAndAnalyticsTest`, `UserMethodSecurityIntegrationTest`.
- **Cache:** any mutation (delete/edit/expire) must invalidate `url:{shortCode}` in Redis —
  current code only writes the cache on redirect miss.
- **Metrics:** add Micrometer counters for new actions in `PathioMetrics`.
- **Docs:** update `internal/frontend-integration-docs/` after each phase — they are already
  out of date.
- **Migrations:** always add a new `Vn__*.sql`, never edit applied ones.
- **CORS:** remember Vite's 5173 is not in the default allow-list.

---

## 5. Open Questions

1. Unique-click accuracy: HyperLogLog approximation vs stored visitor hashes (privacy)? (Phase 2b)
2. Anonymous-row wipe: manual `DELETE` vs V5 migration? (dev DB → manual is fine)
3. Non-admin pre-existing LOCAL users: delete or leave dormant?
4. Custom alias: 1–32 chars confirmed, reserved-word list above OK?
