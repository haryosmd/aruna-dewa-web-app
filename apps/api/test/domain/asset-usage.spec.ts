import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@aruna/contracts';
import { orphanAssetIds, publicMediaUrl, referencesAsset, servesAsset } from '../../src/media/asset-usage.js';

const assetId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function documentWith(place: (document: ReturnType<typeof createDefaultDocument>, url: string) => void) {
  const document = createDefaultDocument();
  place(document, publicMediaUrl(assetId));
  return document;
}

describe('penjaga penghapusan aset', () => {
  beforeEach(() => { process.env.API_ORIGIN = 'https://api.aruna.test'; });

  it('mengenali aset yang dipakai galeri versi publik', () => {
    const document = documentWith((doc, url) => {
      const gallery = doc.sections.find(section => section.type === 'gallery')!;
      gallery.data.images = [url];
    });
    expect(referencesAsset(document, assetId)).toBe(true);
    expect(servesAsset(document, assetId)).toBe(true);
  });

  it('mengenali aset yang dipakai foto cover', () => {
    const document = documentWith((doc, url) => {
      doc.sections.find(section => section.type === 'cover')!.data.image = url;
    });
    expect(referencesAsset(document, assetId)).toBe(true);
  });

  /*
   * Ini pernah salah, dan salahnya mahal.
   *
   * Penjaga penghapusan sempat memakai versi publik dokumen, yang menyaring section mati. Akibat
   * nyatanya terlihat di dasbor QA: galeri yang sedang dimatikan membuat ketujuh fotonya dianggap
   * "tidak dipakai", penghapusan diizinkan, dan revisi yang **sudah terbit** ditinggali empat
   * tautan yang berkasnya tidak ada lagi. Menolak menghapus hanya menyisakan berkas menganggur.
   */
  it('menolak menghapus aset di section yang sedang dimatikan, karena revisi terbit masih memuatnya', () => {
    const document = documentWith((doc, url) => {
      const gallery = doc.sections.find(section => section.type === 'gallery')!;
      gallery.enabled = false;
      gallery.data.images = [url];
    });
    expect(referencesAsset(document, assetId), 'masih disebut → tidak boleh dihapus').toBe(true);
    // Tapi tetap tidak boleh disajikan: section mati tidak pernah sampai ke tamu.
    expect(servesAsset(document, assetId), 'section mati tidak disajikan ke tamu').toBe(false);
  });

  it('tidak tertukar antara dua aset yang id-nya berdekatan', () => {
    const document = documentWith((doc, url) => {
      doc.sections.find(section => section.type === 'cover')!.data.image = url;
    });
    expect(referencesAsset(document, '3f2504e0-4f89-41d3-9a0c-0305e82c3302')).toBe(false);
  });

  it('memperlakukan undangan tanpa revisi aktif sebagai tidak memakai apa pun', () => {
    // Draf yang belum pernah terbit: tidak ada tamu yang bisa dipatahkan.
    expect(referencesAsset(null, assetId)).toBe(false);
    expect(servesAsset(undefined, assetId)).toBe(false);
  });

  it('mengikuti API_ORIGIN, bukan menebak host-nya', () => {
    const url = publicMediaUrl(assetId);
    expect(url).toBe(`https://api.aruna.test/v1/public/media/${assetId}`);
  });
});

describe('sapuan aset yatim setelah publish', () => {
  beforeEach(() => { process.env.API_ORIGIN = 'https://api.aruna.test'; });

  const lain = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('menahan aset yang masih dipakai versi terbit, walau sudah dilepas dari draf', () => {
    // Inilah kasus yang membuat sapuan ini ada: tamu yang sudah memegang tautan masih
    // melihat versi lama, jadi berkasnya belum boleh hilang.
    const active = { images: [publicMediaUrl(assetId)] };
    const draft = { images: [] as string[] };
    expect(orphanAssetIds([assetId], active, draft)).toEqual([]);
  });

  it('menahan foto yang baru diunggah dan baru ada di draf', () => {
    expect(orphanAssetIds([assetId], { images: [] }, { images: [publicMediaUrl(assetId)] })).toEqual([]);
  });

  it('menyapu aset yang tidak disebut di keduanya', () => {
    expect(orphanAssetIds([assetId, lain], { images: [publicMediaUrl(lain)] }, { images: [publicMediaUrl(lain)] }))
      .toEqual([assetId]);
  });

  it('tidak menyapu apa pun saat undangan belum pernah terbit dan drafnya memakai asetnya', () => {
    expect(orphanAssetIds([assetId], null, { images: [publicMediaUrl(assetId)] })).toEqual([]);
  });

  it('menemukan URL ornamen unggahan yang bersarang di ornamentOverrides.unggahan (fase 69)', () => {
    const document = documentWith((doc, url) => {
      doc.sections[0]!.data.ornamentOverrides = { unggahan: { symbol: { url, width: 200, height: 100 } } };
    });
    expect(servesAsset(document, assetId)).toBe(true);
    expect(referencesAsset(document, assetId)).toBe(true);
    expect(orphanAssetIds([assetId], document, null)).toEqual([]);
  });
});
