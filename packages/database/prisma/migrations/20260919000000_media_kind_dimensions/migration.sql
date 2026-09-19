-- Fase 69: jenis aset tersimpan (bukan diturunkan dari contentType) dan dimensi raster.
-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'AUDIO', 'ORNAMENT');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER;

-- Backfill: aset lama hanya dua jenis, dan jenisnya terbaca dari awalan contentType.
UPDATE "MediaAsset" SET "kind" = 'AUDIO' WHERE "contentType" LIKE 'audio/%';
