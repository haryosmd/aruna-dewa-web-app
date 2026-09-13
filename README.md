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

- Web: http://127.0.0.1:3000
- API: http://127.0.0.1:3001/v1
- Google login callback: http://127.0.0.1:3001/auth/google
- Mailpit UI when using Docker: http://127.0.0.1:8025

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

Feature decisions, original reference assets, source provenance, verification results and revision history are local under `docs/`, intentionally gitignored. Competitor screenshots are research material only; production image provenance is retained in the local feature artifacts.

The worker creates its pg-boss queue and reconciles pending Midtrans orders every 60 seconds when a server key is configured. Signed provider responses go through the same API validation as webhooks. Missing keys leave reconciliation idle without granting access. S3-compatible storage is private and delivered through scoped API routes; configure the S3 fields in the API environment.
