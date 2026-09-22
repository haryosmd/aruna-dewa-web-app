-- Fase 72.6: template WhatsApp per undangan dan penanda "sudah dikirim" per tamu.
-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "shareSettings" JSONB;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "sentAt" TIMESTAMP(3);
