-- Fase 75: undangan akhirnya menyimpan paketnya sendiri.
--
-- Entitlement cuma daftar fitur, dan paket tidak bisa disimpulkan dari situ — dua paket bisa
-- membuka fitur yang sama dengan kuota berbeda. Sebelum ini identitas paket hanya bisa dicapai
-- dengan menjejak balik ke `Order.priceSnapshot.package.id`, dan jalur unggah media tidak pernah
-- memuat order sama sekali.
--
-- Nullable dan tanpa default: null berarti "belum ada pesanan lunas", dan itu keadaan yang sah
-- bagi tiap draft gratis. `ON DELETE SET NULL` supaya menonaktifkan sebuah paket tidak pernah
-- menghapus undangan orang.
ALTER TABLE "Invitation" ADD COLUMN "packageId" TEXT;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill dari pesanan yang benar-benar teraktivasi, yang terbaru bila ada lebih dari satu.
-- `OrderItem.packageId` dipakai sebagai sumber, bukan `priceSnapshot` — ia kolom sungguhan dengan
-- foreign key, sementara snapshot JSON bisa saja ditulis versi lama dengan bentuk lain.
UPDATE "Invitation" AS i
SET "packageId" = sub."packageId"
FROM (
  SELECT DISTINCT ON (o."invitationId") o."invitationId", oi."packageId"
  FROM "Order" o
  JOIN "OrderItem" oi ON oi."orderId" = o."id"
  WHERE o."activatedAt" IS NOT NULL AND oi."packageId" IS NOT NULL
  ORDER BY o."invitationId", o."activatedAt" DESC
) AS sub
WHERE sub."invitationId" = i."id";
