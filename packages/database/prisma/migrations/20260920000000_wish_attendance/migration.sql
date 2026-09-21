-- Fase 72: form ucapan Elegance menggabungkan buku tamu dan kehadiran, jadi kehadirannya
-- disimpan di baris ucapan (teks bebas `hadir`/`belum-pasti`/`berhalangan`, bukan enum RSVP,
-- karena ucapan tanpa tautan personal tidak punya tamu untuk digantungi baris RSVP).
-- AlterTable
ALTER TABLE "Wish" ADD COLUMN "attendance" TEXT;
