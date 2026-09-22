-- Fase 75: empat kolom tamu yang meniru lembar tamu pemilik.
--
-- Semua nullable dan tanpa default. Tidak ada CHECK pada "childCount": pemilik memintanya tegas —
-- kolom anak murni pendataan, kosong tetap sah, dan tidak boleh pernah memblokir satu baris impor.
-- Nilai negatif pun dibiarkan basis data; yang menolaknya zod di batas controller, supaya
-- penolakannya sampai ke form sebagai 400 ber-fieldErrors alih-alih galat constraint.
--
-- Tidak ada kolom untuk "Status": ia sudah diturunkan dari "sentAt" dan tabel RSVP.
ALTER TABLE "Guest" ADD COLUMN "guestFrom" TEXT;
ALTER TABLE "Guest" ADD COLUMN "childCount" INTEGER;
ALTER TABLE "Guest" ADD COLUMN "invitationKind" TEXT;
ALTER TABLE "Guest" ADD COLUMN "notes" TEXT;
