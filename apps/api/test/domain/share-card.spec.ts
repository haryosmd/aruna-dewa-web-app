import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createLegacyDocument } from '@aruna/contracts';
import { buildShareCard, cardFonts, cardPalette, readCardContent, type CardNode } from '../../src/share-card/share-card.elements.js';

/** Pembangun elemen kartu bagikan (fase 72.7), tanpa satori: cukup isi dan warnanya yang dijaga. */
function teks(node: CardNode | CardNode[] | string | undefined): string[] {
  if (!node) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(teks);
  return teks(node.props.children);
}

const dokumen = () => createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2026-10-03', venue: 'Pendopo Aruna' });

describe('readCardContent', () => {
  it('membaca dokumen v2 dari amplop, acara, dan lokasi', () => {
    const content = readCardContent(dokumen());
    expect(content.couple).toBe('Aruna & Dewa');
    expect(content.date).toBe('Sabtu, 03 Oktober 2026');
    expect(content.venue).toBe('Lokasi Akad & Resepsi');
  });

  it('membaca dokumen v1 dari couple.partner1/2 dan judul cover', () => {
    const v1 = createLegacyDocument('Sekar', 'Jagad');
    v1.sections.find((section) => section.type === 'countdown')!.data.date = '2027-11-20';
    const content = readCardContent(v1);
    expect(content.couple).toBe('Sekar & Jagad');
    expect(content.date).toBe('Sabtu, 20 November 2027');
    expect(content.venue).toBe('Lokasi akan diumumkan');
    v1.sections.find((section) => section.type === 'cover')!.data.title = '';
    expect(readCardContent(v1).couple).toBe('Sekar & Jagad');
  });
});

describe('buildShareCard', () => {
  it('menulis nama tamu hanya bila ada ?to= dan sakelarnya tidak dimatikan', () => {
    const content = readCardContent(dokumen());
    expect(teks(buildShareCard(content, { to: 'Budi Santoso' }))).toContain('Budi Santoso');
    expect(teks(buildShareCard(content, { to: 'Budi Santoso' }))).toContain('KEPADA YTH.');
    expect(teks(buildShareCard(content))).not.toContain('KEPADA YTH.');
    const tanpaNama = readCardContent({ ...dokumen(), shareCard: { showGuestName: false } });
    expect(teks(buildShareCard(tanpaNama, { to: 'Budi Santoso' }))).not.toContain('Budi Santoso');
  });

  it('menyembunyikan tanggal dan lokasi mengikuti sakelarnya', () => {
    const semua = teks(buildShareCard(readCardContent(dokumen())));
    expect(semua.some((line) => line.includes('Sabtu, 03 Oktober 2026') && line.includes('Lokasi Akad & Resepsi'))).toBe(true);
    const tanpa = teks(buildShareCard(readCardContent({ ...dokumen(), shareCard: { showDate: false, showVenue: false } })));
    expect(tanpa.join('\n')).not.toMatch(/Oktober|Lokasi/);
  });

  it('mengambil warna dari tokens pada mode template dan dari pilihan pasangan pada mode warna', () => {
    const doc = dokumen();
    const template = cardPalette(readCardContent(doc), false);
    expect(template.background).toBe(doc.tokens.primary);
    expect(template.text).toBe(doc.tokens.background);
    const warna = cardPalette(readCardContent({ ...doc, shareCard: { backgroundMode: 'warna', backgroundColor: '#123456', accent: '#ABCDEF', text: '#FEDCBA' } }), false);
    expect(warna).toMatchObject({ background: '#123456', accent: '#ABCDEF', text: '#FEDCBA' });
    // Foto: lapisan gelap, teks putih apa pun temanya.
    expect(cardPalette(readCardContent(doc), true).text).toBe('#FFFFFF');
  });

  it('memasang foto dan lapisan gelap hanya bila data URI-nya ada', () => {
    const content = readCardContent({ ...dokumen(), shareCard: { backgroundMode: 'foto' } });
    const denganFoto = buildShareCard(content, { photoDataUri: 'data:image/png;base64,AAAA' }).props.children as CardNode[];
    expect(denganFoto[0]!.type).toBe('img');
    expect(denganFoto[0]!.props.src).toBe('data:image/png;base64,AAAA');
    const tanpaFoto = buildShareCard(content).props.children as CardNode[];
    expect(tanpaFoto.some((node) => node.type === 'img')).toBe(false);
  });

  it('gaya template memberi lingkaran, elegan memberi bingkai ganda, minimal tanpa hiasan', () => {
    const hiasan = (styleId: 'template' | 'elegan' | 'minimal') => (buildShareCard(readCardContent({ ...dokumen(), shareCard: { styleId } })).props.children as CardNode[]).filter((node) => node.type === 'div' && !node.props.children);
    expect(hiasan('template').every((node) => String(node.props.style?.borderRadius ?? '').length > 0)).toBe(true);
    expect(hiasan('template').length).toBe(4);
    expect(hiasan('elegan').length).toBe(2);
    expect(hiasan('minimal').length).toBe(0);
  });

  it('nama pasangan memakai huruf script dan kartu berukuran Open Graph', () => {
    const root = buildShareCard(readCardContent(dokumen()));
    expect(root.props.style).toMatchObject({ width: 1200, height: 630 });
    const semua = JSON.stringify(root);
    expect(semua).toContain(`"fontFamily":"${cardFonts.script}"`);
  });
});
