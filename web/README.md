# PathIO web

React + Vite + TypeScript + Tailwind single-page app for the PathIO URL shortener API.

The working feature plan lives in [`../internal/plan.md`](../internal/plan.md) (local, git-ignored).

## Requirements

- Node 18+ (developed on Node 24)
- The PathIO backend running at `http://localhost:8080` (or use the mock server / MSW)

## Getting started

### Quickest way to see the whole app (mock API + web, one command)

```bash
cd web
npm install          # first time only
npm run demo         # starts mock API on :8081 + web on :5173, opens the browser
```

Then sign in with the **Google** button (mock OAuth flow) or the **Administrator** tab
(`admin@pathio.local` / `admin12345`). Press `Ctrl+C` once to stop both.

Other commands:

```bash
cp .env.example .env      # adjust VITE_API_BASE_URL if using the real backend
npm run dev               # web only (http://localhost:5173)
npm run mock              # mock API only (http://localhost:8081)
```

### Backend CORS

The dev server runs on **http://localhost:5173**. Add it to the backend allow-list in the repo-root
`.env` (this also drives the OAuth popup origin filter):

```properties
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001
```

All API requests are sent with `credentials: 'include'` so the `HttpOnly` `refresh_token` cookie is
carried.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on :5173 |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run mock` | Start the standalone mock API on :8081 |
| `npm run demo` | Start the mock API **and** the web together (one command) |
| `npm run msw:init` | (Re)generate the MSW browser worker in `public/` |

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | `Landing` — public marketing page (redirects signed-in users to `/dashboard`) | public |
| `/login` | `Login` — Google/GitHub + admin email/password | public |
| `/signup` | `Signup` — Google/GitHub account creation | public |
| `/dashboard` | `Dashboard` — shorten form, overview, links table | auth |
| `/links/:shortCode` | `LinkDetail` — per-link analytics | auth |
| `/profile` | `Profile` — edit display name | auth |
| `/admin/users`, `/admin/links` | admin console | admin |
| `*` | `NotFound` | public |

Guards live in `src/components/auth/guards.tsx`; anonymous access to a protected route redirects
to `/login?redirect=<path>` and returns there after sign-in.

## Authentication model

- **Users** sign in with Google/GitHub via a popup (`/login`, `/signup`). The backend posts
  `OAUTH_AUTH_SUCCESS` back to the opener (origin-validated) and creates the account on first sign-in.
- **Admin** (env-provisioned) may also sign in with email/password on `/login`.
- The access token is kept **in memory only**; the session is restored on reload via the
  `HttpOnly` refresh cookie (`POST /api/v1/auth/refresh`).
- Admin UI is gated by the `roles` claim (`ROLE_ADMIN`) decoded from the access token.

## Mocking

Two layers, both contract-faithful to the current backend:

1. **MSW** — in-process handlers used by Vitest (`src/test/setup.ts`). Also usable in the browser
   by setting `VITE_USE_MOCKS=true` (run `npm run msw:init` once). Note: the OAuth *popup* cannot be
   exercised this way.
2. **Standalone mock API** — `npm run mock` (Hono) on :8081, with real cookies/CORS and a working
   OAuth popup endpoint. Point the app at it:

   ```bash
   # web/.env
   VITE_API_BASE_URL=http://localhost:8081
   ```

Seeded credentials (mock):

- Admin: `admin@pathio.local` / `admin12345`
- OAuth user: `alice@example.com` (via `/oauth2/authorization/google`)

## Project structure

```
src/
  api/         typed API modules (auth, urls, analytics, users, admin, health)
  auth/        AuthContext, popup OAuth, useAuth
  components/  UI primitives, layout, guards, charts
  features/    shorten · links · analytics · admin
  lib/         api client, errors, jwt, config, formatting
  mocks/       MSW handlers/server/browser + in-memory store
  routes/      page components
  types/       backend DTOs
  test/        Vitest setup + render helpers
mock-server/   standalone Hono mock API
```

## Notes / not implemented (backend support pending)

No local registration UI, no server-side QR/expiry/password fields, no geographic breakdown, no
API-key management, and the rate limiter ships no `Retry-After` headers (a `429` shows a generic
cooldown message).
