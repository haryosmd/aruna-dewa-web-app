import { describe, expect, it } from 'vitest';

import { createLegacyDocument, type InvitationDocument } from '@aruna/contracts';

import { designFingerprint, hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * Gerbang `design` sesudah fase 59: apa yang berbayar, apa yang gratis, dan apa yang tidak
 * boleh menyala sendiri.
 *
 * Gerbang ini bisa salah ke dua arah, dan keduanya mahal dengan cara yang berbeda. False
 * negative berarti perubahan desain lolos gratis — kehilangan pendapatan, dan tenang. False
 * positive berarti simpan ditolak di tengah pasangan mengetik, untuk perubahan yang tidak
 * pernah ia buat — gejalanya tidak bisa dijelaskan ke pelanggan, dan itu yang lebih merusak.
 */

// Dokumen v1: `ornamentOverrides` di `cover`. Padanan v2-nya (`opening-envelope`) dijaga di
// `design-gate-v2.spec.ts`; yang di sini memastikan revisi lama tidak berubah sidik jarinya.
function dokumen(ubah: (doc: InvitationDocument) => void): InvitationDocument {
  const doc = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
  ubah(doc);
  return doc;
}

const cover = (doc: InvitationDocument) => doc.sections.find((section) => section.type === 'cover')!;

describe('yang digerbangi', () => {
  it('menggerbangi penukaran ornamen', () => {
    // Keputusan pemilik pada fase 59: pemilih ornamen adalah fitur desain, sekelas warna.
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => { cover(doc).data.ornamentOverrides = { divider: 'divider-leaf' }; });
    expect(hasDesignChange(lama, baru)).toBe(true);
  });

  it('menggerbangi penukaran keping ladang', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => { cover(doc).data.ornamentOverrides = { layers: { bloom: 'layer-botanical-bloom' } }; });
    expect(hasDesignChange(lama, baru)).toBe(true);
  });

  it('menggerbangi huruf body dan latar', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    expect(hasDesignChange(lama, dokumen((doc) => { doc.tokens.bodyFont = 'jost'; }))).toBe(true);
    expect(hasDesignChange(lama, dokumen((doc) => { doc.tokens.backdrop = 'kawung'; }))).toBe(true);
    expect(hasDesignChange(lama, dokumen((doc) => { doc.tokens.backdropWeight = 'tegas'; }))).toBe(true);
  });
});

describe('yang tetap gratis', () => {
  it('tidak menggerbangi kepekatan ornamen', () => {
    /*
     * `ornamentIntensity` sengaja tidak ikut, dan ini bukan kelalaian yang menunggu diperbaiki.
     * Ia sudah gratis sejak dibuat, hidup di `section.data` justru karena itu, dan fase 59 tidak
     * mengubah harganya — yang berubah hanya `ornamentOverrides` di sebelahnya.
     */
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => { cover(doc).data.ornamentIntensity = 'pekat'; });
    expect(hasDesignChange(lama, baru)).toBe(false);
  });

  it('tidak menggerbangi isi cover yang lain', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => {
      cover(doc).data.title = 'Nama Baru';
      cover(doc).data.image = '/media/foto.webp';
      cover(doc).data.layout = 'full-bleed';
    });
    expect(hasDesignChange(lama, baru)).toBe(false);
  });
});

describe('gerbang tidak menyala sendiri', () => {
  it('mengabaikan urutan key di dalam `tokens`', () => {
    /*
     * Inilah alasan `designFingerprint()` ada.
     *
     * Bentuk lama membandingkan `JSON.stringify(tokens)` mentah, jadi objek bernilai sama dengan
     * urutan key berbeda terbaca sebagai perubahan desain. Dengan tiga key opsional baru, yang
     * kadang ada dan kadang tidak, urutan itu berhenti stabil — dan pasangan tanpa add-on mulai
     * ditolak menyimpan perubahan yang tidak pernah ia buat.
     */
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const t = lama.tokens;
    const diacak = dokumen((doc) => {
      doc.tokens = { font: t.font, primary: t.primary, foreground: t.foreground, background: t.background };
    });
    expect(JSON.stringify(lama.tokens)).not.toBe(JSON.stringify(diacak.tokens));
    expect(hasDesignChange(lama, diacak)).toBe(false);
  });

  it('memperlakukan key opsional yang absen sama dengan yang bernilai undefined', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => { doc.tokens = { ...doc.tokens, bodyFont: undefined }; });
    expect(hasDesignChange(lama, baru)).toBe(false);
  });

  it('tidak melempar untuk dokumen lama tanpa section cover', () => {
    // `previous` datang sebagai JSON mentah Prisma. Dokumen yang cover-nya pernah dihapus
    // tangan tidak boleh membuat penyimpanan berikutnya gagal dengan 500.
    const tanpaCover = dokumen((doc) => { doc.sections = doc.sections.filter((section) => section.type !== 'cover'); });
    expect(() => designFingerprint(tanpaCover)).not.toThrow();
    expect(hasDesignChange(tanpaCover, tanpaCover)).toBe(false);
  });

  it('mengabaikan sampah non-string di dalam `ornamentOverrides`', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const baru = dokumen((doc) => { cover(doc).data.ornamentOverrides = { divider: 7, seal: null, layers: 'bukan objek' }; });
    expect(hasDesignChange(lama, baru)).toBe(false);
  });

  it('membiarkan penukaran yang sudah tersimpan tetap di tempatnya', () => {
    /*
     * Kejujuran soal regresi. Sampai fase 58 penukaran ornamen gratis, jadi ada pasangan tanpa
     * add-on yang sudah menyimpannya. Gerbang membandingkan lama terhadap baru, bukan baru
     * terhadap bawaan — jadi menyimpan ulang dokumen yang sama tidak pernah menagih mereka.
     * Yang tergerbang hanya suntingan berikutnya.
     */
    const dengan = dokumen((doc) => { cover(doc).data.ornamentOverrides = { divider: 'divider-leaf' }; });
    expect(hasDesignChange(dengan, dengan)).toBe(false);

    const lagi = dokumen((doc) => { cover(doc).data.ornamentOverrides = { divider: 'divider-wave' }; });
    expect(hasDesignChange(dengan, lagi)).toBe(true);
  });
});

describe('ornamen unggahan (fase 69)', () => {
  it('menggerbangi pemasangan dan penggantian unggahan, tidak peduli urutan kunci', () => {
    const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    const u = { url: 'http://127.0.0.1:3001/v1/public/media/11111111-1111-4111-8111-111111111111', width: 200, height: 100 };
    const a = dokumen((doc) => { cover(doc).data.ornamentOverrides = { unggahan: { symbol: u } }; });
    const b = dokumen((doc) => { cover(doc).data.ornamentOverrides = { unggahan: { symbol: { height: 100, width: 200, url: u.url } } }; });
    expect(hasDesignChange(lama, a)).toBe(true);
    expect(hasDesignChange(a, b)).toBe(false);
    expect(hasDesignChange(a, dokumen((doc) => { cover(doc).data.ornamentOverrides = { unggahan: {} }; }))).toBe(true);
  });
});
