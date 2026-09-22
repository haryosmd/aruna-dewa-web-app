import { describe, expect, it } from 'vitest';
import { createDefaultDocument, galleryPhotoLimitFor, type InvitationDocument } from '@aruna/contracts';
import { assertGalleryQuota, countGalleryPhotos } from '../../src/invitations/document-validation.js';
import { packageFromSnapshot } from '../../src/payments/payment-activation.js';

/*
 * Kuota foto per paket (fase 75). Aturan yang dijaga berkas ini cuma satu kalimat, dan
 * kalimatnya sengaja tentang PERTUMBUHAN, bukan keberadaan:
 *
 *   Batas yang turun tidak boleh membuat dokumen yang sudah terbit gagal terbit lagi.
 *
 * Tanpa itu, pasangan yang menimbun foto sebagai draft lalu menyelesaikan paket termurah akan
 * mendapati undangannya tidak bisa diterbitkan sama sekali, dan satu-satunya jalan keluar adalah
 * menghapus foto yang sudah dipilih. Gerbang unggah di `media.service.ts` yang menahan hulunya.
 */

function dokumenBerfoto(jumlah: number): InvitationDocument {
  const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2026-10-03', venue: 'Pendopo' });
  const galeri = doc.sections.find((section) => section.type === 'gallery');
  if (!galeri) throw new Error('Dokumen bawaan kehilangan bagian galeri');
  galeri.data.imageUrls = Array.from({ length: jumlah }, (_, i) => `https://contoh.test/${i}.webp`);
  return doc;
}

describe('countGalleryPhotos', () => {
  it('menghitung dari isi dokumen, dan nol untuk dokumen tanpa foto', () => {
    expect(countGalleryPhotos(dokumenBerfoto(7))).toBe(7);
    expect(countGalleryPhotos(dokumenBerfoto(0))).toBe(0);
  });

  it('tidak jatuh pada bentuk yang bukan dokumen', () => {
    for (const nilai of [null, undefined, 42, 'dokumen', {}, { sections: 'bukan larik' }]) {
      expect(countGalleryPhotos(nilai)).toBe(0);
    }
  });
});

describe('assertGalleryQuota', () => {
  it('meloloskan jumlah yang pas dan di bawah batas paketnya', () => {
    expect(() => assertGalleryQuota(dokumenBerfoto(15), 'mula')).not.toThrow();
    expect(() => assertGalleryQuota(dokumenBerfoto(30), 'mekar')).not.toThrow();
    expect(() => assertGalleryQuota(dokumenBerfoto(60), 'purnama')).not.toThrow();
  });

  it('menolak yang melewati batas, dengan pesan yang menyebut kedua angkanya', () => {
    expect(() => assertGalleryQuota(dokumenBerfoto(16), 'mula')).toThrow(/15 foto galeri.*memakai 16/s);
    expect(() => assertGalleryQuota(dokumenBerfoto(31), 'mekar')).toThrow(/30 foto galeri/);
  });

  it('draft tanpa paket memakai angka paket termurah', () => {
    expect(() => assertGalleryQuota(dokumenBerfoto(15), null)).not.toThrow();
    expect(() => assertGalleryQuota(dokumenBerfoto(16), null)).toThrow();
    expect(galleryPhotoLimitFor(null)).toBe(15);
  });

  /* INI aturannya. Tiga bentuk yang sama sekali berbeda nasibnya. */
  it('berdiri di tempat selalu boleh, tumbuh melewati batas tidak', () => {
    const terbit = dokumenBerfoto(40); // dulu terbit sebagai Purnama
    // Sama persis jumlahnya, meski paketnya kini cuma memuat 15 — terbit ulang harus tetap bisa.
    expect(() => assertGalleryQuota(dokumenBerfoto(40), 'mula', terbit)).not.toThrow();
    // Berkurang, meski masih di atas batas — memperbaiki keadaan tidak boleh dihukum.
    expect(() => assertGalleryQuota(dokumenBerfoto(38), 'mula', terbit)).not.toThrow();
    // Bertambah satu — inilah yang ditolak.
    expect(() => assertGalleryQuota(dokumenBerfoto(41), 'mula', terbit)).toThrow();
  });

  it('pengecualian itu tidak berlaku untuk yang belum pernah terbit', () => {
    expect(() => assertGalleryQuota(dokumenBerfoto(40), 'mula', undefined)).toThrow();
  });

  it('pengecualian tidak membuka pintu di bawah batas paket berikutnya', () => {
    // Revisi aktif 20 foto; paket Mula (15). Naik ke 21 tetap ditolak walau masih "sekitar" 20.
    expect(() => assertGalleryQuota(dokumenBerfoto(21), 'mula', dokumenBerfoto(20))).toThrow();
    expect(() => assertGalleryQuota(dokumenBerfoto(20), 'mula', dokumenBerfoto(20))).not.toThrow();
  });
});

describe('packageFromSnapshot', () => {
  it('membaca id paket dari snapshot harga yang dikunci saat pesanan dibuat', () => {
    expect(packageFromSnapshot({ package: { id: 'mekar', name: 'Mekar', price: 449000 }, features: [] })).toBe('mekar');
  });

  /*
   * Mengembalikan null, bukan menebak paket termurah: pemanggilnya yang memutuskan arti
   * "tidak tahu", dan di `orders.service.ts` artinya "jangan cap apa pun" — bukan
   * "cap paket termurah pada pesanan yang mungkin saja Purnama".
   */
  it('bentuk yang tidak dikenali jadi null, bukan tebakan', () => {
    for (const nilai of [null, undefined, 42, 'mekar', {}, { package: {} }, { package: { id: 42 } }, { package: { id: '  ' } }, { features: ['gift'] }]) {
      expect(packageFromSnapshot(nilai)).toBeNull();
    }
  });
});
