import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createLegacyDocument } from '@aruna/contracts';
import { publicDocument, validatePublishableDocument } from '../../src/invitations/document-validation.js';

describe('public invitation snapshots (v1)', () => {
  it('does not expose disabled sections or private events', () => {
    const document = createLegacyDocument('Aruna', 'Dewa');
    const story = document.sections.find((section) => section.type === 'story')!;
    story.enabled = false;
    const events = document.sections.find((section) => section.type === 'events')!;
    events.data.events = [{ id: 'public', public: true }, { id: 'private', public: false }];

    const result = publicDocument(document);

    expect(result.sections.some((section) => section.type === 'story')).toBe(false);
    expect((result.sections.find((section) => section.type === 'events')!.data.events as { id: string }[])).toEqual([{ id: 'public', public: true }]);
  });
});

describe('cover wajib menyala saat publish (v1)', () => {
  it('menolak dokumen tanpa cover aktif', () => {
    // Inilah yang membuat musik selalu punya gestur untuk menumpang: tidak ada undangan terbit
    // yang tanpa gerbang, jadi renderer tidak perlu jaring pengaman untuk keadaan itu.
    const document = createLegacyDocument();
    document.sections.find((section) => section.type === 'cover')!.enabled = false;
    expect(() => validatePublishableDocument(document)).toThrow('Cover dan judul wajib diisi sebelum publish');
  });
});

/** Dokumen Elegance (fase 72): yang wajib hanya yang tanpa dia undangan tidak terbaca tamu. */
describe('syarat terbit dokumen v2', () => {
  const siap = () => {
    const document = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2027-06-12', venue: 'Pendopo Aruna' });
    document.sections.find((section) => section.type === 'gift')!.data.account1 = '1234567890';
    return document;
  };

  it('menerima dokumen bawaan yang tanggalnya terisi dan rekeningnya diisi', () => {
    expect(() => validatePublishableDocument(siap())).not.toThrow();
  });

  it('hanya menyaring bagian yang dimatikan pada versi publik', () => {
    const document = siap();
    document.sections.find((section) => section.type === 'quote')!.enabled = false;
    const result = publicDocument(document);
    expect(result.sections.some((section) => section.type === 'quote')).toBe(false);
    expect(result.sections.some((section) => section.type === 'unduh-mantu'), 'unduh-mantu mati secara bawaan').toBe(false);
    expect(result.sections.some((section) => section.type === 'hero')).toBe(true);
  });

  it('menolak amplop pembuka tanpa nama mempelai', () => {
    const document = siap();
    document.sections.find((section) => section.type === 'opening-envelope')!.data.title = '   ';
    expect(() => validatePublishableDocument(document)).toThrow('Amplop pembuka dan nama mempelai wajib diisi');
  });

  it('menolak nama mempelai yang kosong', () => {
    const document = siap();
    document.sections.find((section) => section.type === 'couple')!.data.groomName = '';
    expect(() => validatePublishableDocument(document)).toThrow('Nama kedua mempelai wajib diisi');
  });

  it('menolak acara tanpa hari/tanggal/bulan-tahun atau tanpa waktu akad', () => {
    const tanpaTanggal = siap();
    tanpaTanggal.sections.find((section) => section.type === 'event')!.data.monthYear = '';
    expect(() => validatePublishableDocument(tanpaTanggal)).toThrow('Hari, tanggal, serta bulan dan tahun acara wajib diisi');
    const tanpaAkad = siap();
    tanpaAkad.sections.find((section) => section.type === 'event')!.data.akadTime = '';
    expect(() => validatePublishableDocument(tanpaAkad)).toThrow('Nama dan waktu acara akad wajib diisi');
  });

  it('menuntut rekening hanya bila bagian hadiah menyala', () => {
    const kosong = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2027-06-12' });
    expect(() => validatePublishableDocument(kosong)).toThrow('Nomor rekening pertama wajib diisi');
    kosong.sections.find((section) => section.type === 'gift')!.enabled = false;
    expect(() => validatePublishableDocument(kosong)).not.toThrow();
    const kedua = siap();
    kedua.sections.find((section) => section.type === 'gift')!.data.hasSecondAccount = true;
    expect(() => validatePublishableDocument(kedua)).toThrow('Nomor rekening kedua wajib diisi');
    // Lebih dari 34 karakter sudah ditolak skema kolomnya (`sectionFields.gift.account2`), sebelum sampai ke cabang ini.
    kedua.sections.find((section) => section.type === 'gift')!.data.account2 = '0'.repeat(35);
    expect(() => validatePublishableDocument(kedua)).toThrow('Dokumen undangan tidak valid');
  });

  it('menolak URL yang tidak aman di kolom v2 mana pun, termasuk yang bersarang', () => {
    for (const ubah of [
      (doc: ReturnType<typeof siap>) => { doc.sections.find((section) => section.type === 'hero')!.data.imageUrl = 'javascript:alert(1)'; },
      (doc: ReturnType<typeof siap>) => { doc.sections.find((section) => section.type === 'map')!.data.mapUrl = 'ftp://peta'; },
      (doc: ReturnType<typeof siap>) => { doc.sections.find((section) => section.type === 'gallery')!.data.imageUrls = ['http://evil.example/x.png']; },
      (doc: ReturnType<typeof siap>) => { doc.sections.find((section) => section.type === 'countdown')!.data.background = { imageUrl: 'data:text/html,hi' }; },
      (doc: ReturnType<typeof siap>) => { doc.settings = { musicUrl: 'http://evil.example/a.mp3' }; },
      (doc: ReturnType<typeof siap>) => { doc.shareCard = { imageUrl: 'http://evil.example/a.png' }; },
    ]) {
      const document = siap();
      ubah(document);
      expect(() => validatePublishableDocument(document)).toThrow('URL tidak aman');
    }
    const aman = siap();
    aman.sections.find((section) => section.type === 'hero')!.data.imageUrl = 'https://cdn.aruna.test/hero.webp';
    aman.sections.find((section) => section.type === 'map')!.data.mapUrl = 'https://maps.app.goo.gl/abc';
    expect(() => validatePublishableDocument(aman)).not.toThrow();
  });
});
