# Aruna Dewa

Wedding invitation platform: Nuxt/Vue web, modular NestJS API, PostgreSQL/Prisma, shared TypeScript contracts, and a PostgreSQL job worker.

## Local development

Requires Node 22 and pnpm 10.8.0. Copy `apps/api/.env.example` to `apps/api/.env` and configure a random JWT secret. Copy the database URL into `packages/database/.env`. Local credentials stay ignored.

```sh
pnpm install
docker compose up -d postgres mailpit
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @aruna/api dev
pnpm --filter @aruna/worker dev
pnpm --filter @aruna/web dev --host 127.0.0.1 --port 3000
```

The compose database is `postgresql://aruna:aruna-local-only@127.0.0.1:54329/aruna`. The password is for local development only; set `POSTGRES_PASSWORD` when configuring a different environment.

If Docker is unavailable, run `pnpm db:local` and `pnpm mail:local` in separate terminals. This starts a real isolated PostgreSQL cluster in `.data/postgres` and a loopback SMTP inbox writing `.data/mail/*.eml`. Keep both running while using the app. Do not use these fallback scripts in production.

- Web: http://127.0.0.1:3000 (http://localhost:3000 works too — see `WEB_ORIGIN` below)
- API: http://127.0.0.1:3001/v1
- Google login callback: http://127.0.0.1:3001/auth/google
- Mailpit UI when using Docker: http://127.0.0.1:8025

`WEB_ORIGIN` is a comma-separated list of the origins allowed to call the API; it drives both CORS and
the origin check on writes. A loopback entry automatically also accepts its sibling spellings on the
same port (`127.0.0.1`, `localhost`, `[::1]`), so the dev server is reachable either way. Production
domains never gain an alias. The first entry is the canonical one used for links the API sends out:
email verification, password reset, and the redirect after Google login.

Allowing those spellings through CORS is only half of it: session cookies are bound to a **host**, not
a port, so a page on `localhost` cannot keep a cookie issued by `127.0.0.1` — the browser drops it
silently and every authenticated request comes back 401. The web app therefore calls the API on the
same loopback spelling the page itself is open at (`apps/web/utils/api-origin.ts`). Whichever spelling
you type, the session survives; `127.0.0.1:3000` stays the canonical one because that is what the
emailed links and the Google redirect point at.

The access cookie lasts fifteen minutes and the refresh cookie thirty days, so a page rendered on the
server can meet an expired access cookie on an otherwise live session. `composables/useApi.ts` renews
it during the render and relays the new `Set-Cookie` headers to the browser, which is why reloading a
tab left open overnight lands on the dashboard rather than on `/login`. That server-side call carries
an explicit `Origin` header of `NUXT_PUBLIC_WEB_BASE`, since the API's origin check has no browser to
fill one in; keep that value inside `WEB_ORIGIN` for every environment.

Register an account through the web. Operator access is assigned explicitly through the API package CLI; no registration field grants that role. Payment credentials are Midtrans sandbox credentials. Without them checkout reports unavailable and does not activate invitations.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:integration
pnpm exec playwright test
```

Integration tests require the local API, database and SMTP inbox. They create clearly named QA accounts and invitations in the development database. Browser dashboard tests use the generated ignored `.data/qa-account.json`. Do not run fixture creation against production.

## Container deployment

`docker compose --profile app up --build` builds web/API/worker alongside PostgreSQL and Mailpit. Apply database migrations and seed before starting the application services. Configure public origins, secure cookies, provider secrets and storage for the target deployment; production deployment is outside this local foundation milestone.

Web and API must share one registrable domain — `arunadewa.id` for the web and `api.arunadewa.id` for
the API, or a single origin with the API behind a `/api` reverse proxy. Subdomains of one domain are
the *same site*, so the host-only `SameSite=Lax` session cookies are sent on every request and no
cookie `domain` attribute is needed. Splitting the two across unrelated domains (web on one hosting
provider's domain, API on another's) makes every session cookie third-party, which browsers are in the
process of blocking outright; reach for the same-origin proxy instead of loosening `SameSite`. Set
`NODE_ENV=production` — that is what turns on `Secure` on the session cookies — and point `WEB_ORIGIN`
and `API_ORIGIN` at the public HTTPS origins.

Feature decisions, original reference assets, source provenance, verification results and revision history are local under `docs/`, intentionally gitignored. Competitor screenshots are research material only; production image provenance is retained in the local feature artifacts.

The worker creates its pg-boss queue and reconciles pending Midtrans orders every 60 seconds when a server key is configured. Signed provider responses go through the same API validation as webhooks. Missing keys leave reconciliation idle without granting access. S3-compatible storage is private and delivered through scoped API routes; configure the S3 fields in the API environment.
