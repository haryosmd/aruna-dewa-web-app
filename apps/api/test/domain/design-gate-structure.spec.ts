import { describe, expect, it } from 'vitest';

import {
  createDefaultDocument, documentStructureId, restructureDocument, structures,
  type InvitationDocument,
} from '@aruna/contracts';

import { designFingerprint, hasDesignChange } from '../../src/invitations/invitations.service';

/*
 * Fase 74.11: pindah struktur, dan satu jebakan yang akan mengunci SELURUH pelanggan.
 *
 * Struktur tujuan memberi id barunya ke seluruh bagian, jadi `order` berganti seluruhnya dan
 * sidik jarinya dijamin berbeda. Kalau gerbangnya dibiarkan apa adanya, pasangan yang membayar
 * add-on `design` justru ditolak saat memakainya. Obatnya sama dengan cacat 73.1: ganti
 * PEMBANDINGNYA, bukan lewati gerbangnya.
 *
 * Jebakan yang lebih mahal ada di sidik jari: kalau ia menulis `document.structureId` MENTAH,
 * tiap draft pra-fase-74 berbalik `undefined → 'elegance'` pada simpan pertama sesudah editor
 * mulai menulis kunci itu — dan tiap pasangan tanpa add-on `design` terkunci tidak bisa
 * menyimpan apa pun. Dua tes pertama di bawah yang menjaganya.
 */
const salin = <T>(nilai: T): T => JSON.parse(JSON.stringify(nilai)) as T;
const v2 = () => createDefaultDocument('Dea', 'Haryo', 'aruna-bloom', { date: '2027-10-03' });

/** Dokumen seperti yang tersimpan SEBELUM fase 74: tanpa `themeId`, tanpa `structureId`. */
function praFase74(): InvitationDocument {
  const doc = salin(v2()) as Record<string, unknown>;
  delete doc.themeId;
  delete doc.structureId;
  return doc as unknown as InvitationDocument;
}

describe('draft pra-fase-74 tidak boleh terkunci', () => {
  it('sidik jari dokumen lama sama dengan sidik jari dokumen yang sudah membawa kedua kunci', () => {
    // Inilah pernyataan yang menahan seluruh irisan ini. Kalau ia merah, pelanggan tidak bisa
    // menyimpan apa pun — bukan sekadar sebuah tes yang gagal.
    expect(designFingerprint(praFase74())).toBe(designFingerprint(v2()));
  });

  it('menyimpan tanpa mengubah desain tetap lolos sesudah editor mulai menulis structureId', () => {
    expect(hasDesignChange(praFase74(), v2())).toBe(false);
  });

  it('mengetik nama orang tua tetap bukan perubahan desain', () => {
    const next = salin(v2());
    next.sections.find((s) => s.type === 'couple')!.data.brideParents = 'Bapak Haris & Ibu Yosi';
    expect(hasDesignChange(praFase74(), next)).toBe(false);
  });
});

describe('sidik jari membaca kedua sumbu', () => {
  it('ganti tema mengubah sidik jari meski tokens tidak disentuh', () => {
    // Lubang yang sudah ada SEBELUM fase ini: pindah tema hanya menjatuhkan gerbang secara
    // tidak langsung, karena editor kebetulan ikut menulis `tokens`.
    const next = salin(v2());
    next.themeId = 'aruna-pelita';
    expect(designFingerprint(next)).not.toBe(designFingerprint(v2()));
  });

  it('ganti struktur mengubah sidik jari', () => {
    const next = restructureDocument(salin(v2()), 'warisan');
    expect(designFingerprint(next)).not.toBe(designFingerprint(v2()));
  });
});

describe('pindah struktur lolos gerbang, penyelundup tidak', () => {
  it('pindah struktur murni bukan perubahan desain', () => {
    const lama = v2();
    const next = restructureDocument(salin(lama), 'warisan');
    expect(hasDesignChange(lama, next)).toBe(false);
  });

  it('satu warna yang diselundupkan dalam simpan yang sama tetap tertangkap', () => {
    const lama = v2();
    const next = restructureDocument(salin(lama), 'warisan');
    next.tokens.primary = '#123456';
    expect(hasDesignChange(lama, next)).toBe(true);
  });

  it('satu urutan yang digeser dalam simpan yang sama tetap tertangkap', () => {
    const lama = v2();
    const next = restructureDocument(salin(lama), 'warisan');
    const [pertama, ...sisa] = next.sections;
    next.sections = [...sisa, pertama!];
    expect(hasDesignChange(lama, next)).toBe(true);
  });

  it('pembebasannya habis sendiri: sesudah tersimpan, simpan berikutnya digerbangi seperti biasa', () => {
    const tersimpan = restructureDocument(salin(v2()), 'warisan');
    const berikut = salin(tersimpan);
    berikut.tokens.primary = '#123456';
    expect(hasDesignChange(tersimpan, berikut)).toBe(true);
  });

  it('draft rusak tidak melempar 500 saat strukturnya berganti', () => {
    const rusak = { schemaVersion: 2, templateId: 'aruna-bloom', structureId: 'elegance', sections: 'bukan larik' } as unknown as InvitationDocument;
    const next = restructureDocument(salin(v2()), 'warisan');
    expect(() => hasDesignChange(rusak, next)).not.toThrow();
    expect(hasDesignChange(rusak, next)).toBe(true);
  });
});

describe('restructureDocument itu sendiri', () => {
  it('murni dan idempoten', () => {
    const lama = v2();
    const semula = JSON.stringify(lama);
    const hasil = restructureDocument(lama, 'warisan');
    expect(JSON.stringify(lama)).toBe(semula);
    expect(restructureDocument(hasil, 'warisan')).toBe(hasil);
  });

  it('memakai bagian struktur tujuan, dan menyetel schemaVersion-nya', () => {
    const hasil = restructureDocument(v2(), 'warisan');
    expect(documentStructureId(hasil)).toBe('warisan');
    expect(hasil.schemaVersion).toBe(1);
    expect(hasil.sections.map((s) => s.type)).toEqual([...structures.warisan.sectionTypes]);
  });

  it('membawa isi menurut TIPE, bukan menurut posisi', () => {
    const lama = salin(v2());
    lama.sections.find((s) => s.type === 'gallery')!.data.imageUrls = ['/a.webp', '/b.webp'];
    const hasil = restructureDocument(lama, 'warisan');
    expect(hasil.sections.find((s) => s.type === 'gallery')!.data.imageUrls).toEqual(['/a.webp', '/b.webp']);
  });

  it('kolom yang belum diisi mendapat kata-kata bawaan tujuan, yang sudah diisi menang', () => {
    const lama = salin(v2());
    lama.sections.find((s) => s.type === 'closing')!.data.title = 'Sampai jumpa';
    const hasil = restructureDocument(lama, 'warisan');
    const closing = hasil.sections.find((s) => s.type === 'closing')!;
    expect(closing.data.title).toBe('Sampai jumpa');
    expect(closing.data.text).toBeTruthy();
  });

  it('tema dan pengaturan tidak ikut pindah sumbu', () => {
    const lama = salin(v2());
    lama.themeId = 'aruna-sekar';
    lama.tokens.primary = '#7A5C44';
    const hasil = restructureDocument(lama, 'warisan');
    expect(hasil.themeId).toBe('aruna-sekar');
    expect(hasil.tokens.primary).toBe('#7A5C44');
  });

  it('tipe yang tidak ada di tujuan hilang — kehilangan yang diakui, bukan diselundupkan', () => {
    const lama = salin(v2());
    lama.sections.find((s) => s.type === 'unduh-mantu')!.data.address = 'Jl. Mantu 1';
    const hasil = restructureDocument(lama, 'warisan');
    expect(hasil.sections.some((s) => s.type === 'unduh-mantu')).toBe(false);
    expect(JSON.stringify(hasil)).not.toContain('Jl. Mantu 1');
  });

  it('bagian wajib tujuan dipaksa menyala, bukan mewarisi enabled: false', () => {
    const lama = salin(createDefaultDocument('Dea', 'Haryo', 'aruna-bloom', {}, 'warisan'));
    lama.sections.find((s) => s.type === 'couple')!.enabled = false;
    const hasil = restructureDocument(lama, 'elegance');
    expect(hasil.sections.find((s) => s.type === 'couple')!.enabled).toBe(true);
  });
});
