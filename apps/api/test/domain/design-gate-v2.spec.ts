import { describe, expect, it } from 'vitest';

import { createDefaultDocument, createLegacyDocument, migrateLegacyDocument, type InvitationDocument } from '@aruna/contracts';

import { designFingerprint, hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * Gerbang `design` pada dokumen Elegance (fase 72). Yang berbayar: `tokens` (termasuk `layout`),
 * urutan bagian, ornamen di amplop pembuka, dan gaya teks/latar/gerak per bagian. Yang gratis:
 * kata-kata di `data`, musik (`settings`), dan kartu bagikan (`shareCard`).
 */
function dokumen(ubah: (doc: InvitationDocument) => void = () => {}): InvitationDocument {
  const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2027-06-12' });
  ubah(doc);
  return doc;
}
const bagian = (doc: InvitationDocument, type: string) => doc.sections.find((section) => section.type === type)!;

describe('yang digerbangi pada v2', () => {
  it('membaca ornamentOverrides dari opening-envelope, bukan cover', () => {
    const baru = dokumen((doc) => { bagian(doc, 'opening-envelope').data.ornamentOverrides = { divider: 'divider-leaf' }; });
    expect(hasDesignChange(dokumen(), baru)).toBe(true);
    // Sebuah `cover` nyasar di dokumen v2 tidak dibaca — ia bukan bagian v2.
    const nyasar = dokumen((doc) => { doc.sections.push({ id: 'cover', type: 'cover', enabled: false, data: { ornamentOverrides: { divider: 'divider-leaf' } } }); });
    const tanpa = dokumen((doc) => { doc.sections.push({ id: 'cover', type: 'cover', enabled: false, data: {} }); });
    expect(hasDesignChange(tanpa, nyasar)).toBe(false);
  });

  it('menggerbangi gaya teks per kolom', () => {
    const baru = dokumen((doc) => { bagian(doc, 'hero').data.textStyles = { title: { fontFamily: 'great-vibes', fontSize: 48 } }; });
    expect(hasDesignChange(dokumen(), baru)).toBe(true);
  });

  it('menggerbangi latar dan gerak masuk bagian', () => {
    expect(hasDesignChange(dokumen(), dokumen((doc) => { bagian(doc, 'event').data.background = { color: '#FFF7F0' }; }))).toBe(true);
    expect(hasDesignChange(dokumen(), dokumen((doc) => { bagian(doc, 'gallery').data.motion = 'iris'; }))).toBe(true);
  });

  it('menggerbangi fokus tata letak di tokens', () => {
    expect(hasDesignChange(dokumen(), dokumen((doc) => { doc.tokens.layout = 'penuh'; }))).toBe(true);
  });

  it('menggerbangi urutan bagian', () => {
    const baru = dokumen((doc) => { const [a, b] = [doc.sections[3]!, doc.sections[4]!]; doc.sections[3] = b; doc.sections[4] = a; });
    expect(hasDesignChange(dokumen(), baru)).toBe(true);
  });
});

describe('yang gratis pada v2', () => {
  it('kata-kata di data bukan desain', () => {
    const baru = dokumen((doc) => { bagian(doc, 'hero').data.title = 'Sekar & Jagad'; bagian(doc, 'event').data.akadTime = '09.00 WIB'; });
    expect(hasDesignChange(dokumen(), baru)).toBe(false);
  });

  it('musik dan kartu bagikan tidak digerbangi', () => {
    const musik = dokumen((doc) => { doc.settings = { musicUrl: 'https://cdn.aruna.test/lagu.mp3', musicVolume: 0.4 }; });
    const kartu = dokumen((doc) => { doc.shareCard = { styleId: 'elegan', accent: '#D9B45C', showGuestName: false }; });
    expect(hasDesignChange(dokumen(), musik)).toBe(false);
    expect(hasDesignChange(dokumen(), kartu)).toBe(false);
  });

  it('menyalakan atau mematikan bagian bukan desain', () => {
    expect(hasDesignChange(dokumen(), dokumen((doc) => { bagian(doc, 'quote').enabled = false; }))).toBe(false);
  });
});

describe('bentuk "tidak ada perubahan"', () => {
  it('objek kosong sama dengan absen', () => {
    const kosong = dokumen((doc) => { bagian(doc, 'hero').data.textStyles = {}; bagian(doc, 'hero').data.background = {}; });
    expect(hasDesignChange(dokumen(), kosong)).toBe(false);
    expect(hasDesignChange(kosong, dokumen())).toBe(false);
    const gayaKosong = dokumen((doc) => { bagian(doc, 'hero').data.textStyles = { title: {} }; });
    expect(hasDesignChange(dokumen(), gayaKosong)).toBe(false);
  });

  it('tidak peduli urutan kunci di dalam gaya', () => {
    const a = dokumen((doc) => { bagian(doc, 'hero').data.textStyles = { title: { fontSize: 48, color: '#112233' } }; });
    const b = dokumen((doc) => { bagian(doc, 'hero').data.textStyles = { title: { color: '#112233', fontSize: 48 } }; });
    expect(hasDesignChange(a, b)).toBe(false);
  });

  it('sidik jari dokumen v1 tidak berubah oleh cabang v2', () => {
    // Revisi lama tidak punya textStyles/background/motion, jadi proyeksi bagiannya kosong dan
    // ornamen tetap dibaca dari `cover` — sama seperti sebelum fase 72.
    const v1 = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    v1.sections.find((section) => section.type === 'cover')!.data.ornamentOverrides = { divider: 'divider-leaf' };
    const sidik = JSON.parse(designFingerprint(v1));
    expect(sidik.ornaments).toEqual({ divider: 'divider-leaf' });
    expect(sidik.sections).toEqual([]);
  });

  it('migrasi v1→v2 membawa ornamen ke amplop pembuka dan tetap terbaca gerbang', () => {
    const v1 = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
    v1.sections.find((section) => section.type === 'cover')!.data.ornamentOverrides = { divider: 'divider-leaf' };
    const v2 = migrateLegacyDocument(v1);
    expect(JSON.parse(designFingerprint(v2)).ornaments).toEqual({ divider: 'divider-leaf' });
  });
});
