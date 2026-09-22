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

# --- prod-deps --------------------------------------------------------------
# Pohon node_modules produksi, dan satu-satunya alasan stage ini terpisah adalah agar ia TIDAK
# ikut berubah tiap commit.
#
# Sebelumnya `prisma generate` dan `prune` hidup di stage `build`, di belakang `COPY . .`, jadi
# node_modules dibangun ulang untuk tiap perubahan kode sekecil apa pun. Digabung dengan satu
# `COPY /app /app` di runtime, hasilnya adalah satu lapisan 401 MB yang berubah di tiap rilis
# dan karena itu ditarik utuh oleh VPS setiap kali — terukur 2 menit dari 2 menit 50 detik
# langkah "Terapkan di server" (run 35376471340).
#
# Di sini isinya hanya bergantung pada lockfile, manifest, dan schema.prisma. Commit yang tidak
# menyentuh ketiganya menghasilkan lapisan dengan digest yang sama persis, dan `docker pull` di
# server melewatinya sama sekali.
FROM deps AS prod-deps
COPY packages/database/prisma packages/database/prisma
RUN pnpm db:generate
# Klien Prisma yang sudah digenerate hidup di dalam entri store `@prisma/client`, yang merupakan
# dependency produksi, jadi ia selamat dari prune.
RUN pnpm prune --prod
# Dijamin ada sebelum di-COPY: `COPY` yang menunjuk path tidak ada menggagalkan build, dan
# sebuah workspace package yang kebetulan kehabisan dependency produksi tidak menyisakan
# node_modules. Lebih baik direktori kosong daripada build yang merah karena hal ini.
RUN mkdir -p apps/api/node_modules apps/web/node_modules apps/worker/node_modules \
  packages/contracts/node_modules packages/database/node_modules

# --- build ------------------------------------------------------------------
# Dibangun dengan devDependency lengkap: `nuxt.config.ts` menyalakan `typescript.typeCheck`,
# jadi `vue-tsc` memang dibutuhkan di sini.
FROM deps AS build
COPY . .
RUN pnpm db:generate && pnpm build

# Pohon aplikasi tanpa node_modules dan tanpa artefak antara, disiapkan sebagai satu direktori
# supaya runtime bisa menyalinnya sebagai SATU lapisan kecil yang terpisah dari node_modules.
#
# `cp -a` lalu `rm -rf`, bukan `tar --exclude`: yang kedua bergantung pada apakah polanya
# dianggap cocok di kedalaman mana pun, dan itu pertanyaan yang tidak ingin dijawab dengan
# tebakan di jalur rilis. Menyalin 1 GB lalu menghapusnya memakan belasan detik di runner —
# bukan di VPS, dan berbarengan dengan e2e.
#
# `.nuxt` adalah keluaran antara `nuxt build`; yang dijalankan produksi adalah `.output`.
RUN cp -a /app /stage \
  && rm -rf /stage/node_modules /stage/apps/*/node_modules /stage/packages/*/node_modules \
    /stage/apps/web/.nuxt /stage/.turbo /stage/apps/*/.turbo /stage/packages/*/.turbo

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Disalin sebagai `node`, bukan root: tidak ada satu pun proses di sini yang perlu menulis ke
# luar volume media, dan media pun pergi ke S3 di produksi.
#
# Urutannya yang penting, bukan sekadar jumlah COPY-nya: node_modules lebih dulu karena ia yang
# jarang berubah, kode aplikasi belakangan karena ia yang berubah tiap commit. Lapisan Docker
# ditarik per digest, jadi rilis yang tidak menyentuh lockfile hanya mengunduh lapisan kedua.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=node:node /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=prod-deps --chown=node:node /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=prod-deps --chown=node:node /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=prod-deps --chown=node:node /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build --chown=node:node /stage ./
# Titik pasang volume media. Dibuat di sini, bukan dibiarkan Docker yang membuatnya saat
# `up`: volume bernama yang menunjuk ke path yang belum ada di image lahir milik root, dan
# proses `node` tidak bisa menulis unggahan ke sana.
RUN mkdir -p /app/.data/media && chown -R node:node /app/.data
USER node
EXPOSE 3000 3001
CMD ["node", "apps/web/.output/server/index.mjs"]
