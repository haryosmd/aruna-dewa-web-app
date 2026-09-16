# syntax=docker/dockerfile:1

# Satu image untuk web, API, dan worker; perintahnya dipilih per service di compose.
#
# `tsx` ada di `dependencies` api dan worker, bukan devDependencies, dan itu disengaja:
# `@aruna/database` dan `@aruna/contracts` mengekspor berkas `.ts` mentah, jadi API yang sudah
# dikompilasi pun tetap mengimpor TypeScript saat runtime. Tanpa itu, tahap yang sudah dipangkas
# di bawah akan mati saat start.

FROM node:22-bookworm-slim AS base
# openssl wajib untuk engine Prisma; tanpa itu `PrismaClient` gagal memuat, bukan gagal query.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app

# --- deps -------------------------------------------------------------------
# Hanya manifest dan lockfile yang disalin di sini. Selama keduanya tidak berubah, seluruh
# instalasi diambil dari cache — versi sebelumnya melakukan `COPY . .` lebih dulu, sehingga
# satu baris kode yang berubah membatalkan instalasi penuh.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
RUN pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
# Dibangun dengan devDependency lengkap: `nuxt.config.ts` menyalakan `typescript.typeCheck`,
# jadi `vue-tsc` memang dibutuhkan di sini.
FROM deps AS build
COPY . .
RUN pnpm db:generate && pnpm build

# Baru dipangkas setelah artefaknya jadi. Klien Prisma yang sudah digenerate hidup di dalam
# entri store `@prisma/client`, yang merupakan dependency produksi, jadi ia ikut selamat.
RUN pnpm prune --prod

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Disalin sebagai `node`, bukan root: tidak ada satu pun proses di sini yang perlu menulis ke
# luar volume media, dan media pun pergi ke S3 di produksi.
COPY --from=build --chown=node:node /app /app
# Titik pasang volume media. Dibuat di sini, bukan dibiarkan Docker yang membuatnya saat
# `up`: volume bernama yang menunjuk ke path yang belum ada di image lahir milik root, dan
# proses `node` tidak bisa menulis unggahan ke sana.
RUN mkdir -p /app/.data/media && chown -R node:node /app/.data
USER node
EXPOSE 3000 3001
CMD ["node", "apps/web/.output/server/index.mjs"]
