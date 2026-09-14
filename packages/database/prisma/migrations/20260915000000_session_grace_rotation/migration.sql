-- CreateEnum
CREATE TYPE "SessionRevokeReason" AS ENUM ('LOGOUT', 'REPLACED', 'REUSE_DETECTED', 'PASSWORD_RESET', 'ACCOUNT_RECLAIMED');

-- Satu baris Session berhenti berarti "satu token" dan mulai berarti "satu login".
-- `expiresAt` yang dulu digeser tiap rotasi menjadi batas idle; batas absolut lahir dari
-- nilai yang sama, jadi sesi yang sedang hidup tidak ikut tertendang oleh migrasi ini.
ALTER TABLE "Session" RENAME COLUMN "expiresAt" TO "idleExpiresAt";
ALTER TABLE "Session" ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3);
UPDATE "Session" SET "absoluteExpiresAt" = "idleExpiresAt";
ALTER TABLE "Session" ALTER COLUMN "absoluteExpiresAt" SET NOT NULL;

-- Slot tenggang: token yang sudah digantikan masih dilayani sampai `graceExpiresAt`,
-- sebanyak-banyaknya `graceUses` kali, supaya dua tab yang menyegarkan bersamaan berhenti
-- saling menuduh. Berupa daftar karena satu rentetan bisa menerbitkan beberapa token yang
-- sama-sama beredar di browser yang sama.
ALTER TABLE "Session"
    ADD COLUMN "graceTokenHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "graceExpiresAt" TIMESTAMP(3),
    ADD COLUMN "graceUses" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "revokedReason" "SessionRevokeReason";

DROP INDEX "Session_userId_expiresAt_idx";
CREATE INDEX "Session_userId_idleExpiresAt_idx" ON "Session"("userId", "idleExpiresAt");
