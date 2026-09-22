import { dateParts, type InvitationDocument, type ShareCardStyle } from '@aruna/contracts';

/*
 * Pembangun pohon elemen kartu bagikan (fase 72.7) — murni, tanpa satori dan tanpa I/O, supaya
 * isinya bisa diuji di vitest: nama tamu hanya muncul kalau sakelarnya menyala, mode latar
 * memilih sumber warnanya, dan dokumen v1 dibaca dari `couple.partner1/2`.
 *
 * Bentuk keluarannya adalah objek `{ type, props }` yang dimengerti satori — sengaja bukan JSX
 * supaya modul API tidak perlu pipeline React hanya untuk satu gambar 1200×630.
 */

export const cardWidth = 1200;
export const cardHeight = 630;

/** Nama keluarga font seperti didaftarkan ke satori di `share-card.service.ts`. */
export const cardFonts = { serif: 'Cormorant Garamond', script: 'Great Vibes', sans: 'Plus Jakarta Sans' } as const;

export interface CardNode { type: string; props: { style?: Record<string, string | number>; children?: CardNode | CardNode[] | string; src?: string } }

export interface CardContent {
  /** "Aruna & Dewa" — judul amplop/hero (v2) atau judul cover (v1); jatuh ke nama pasangan bila kosong. */
  couple: string;
  /** "Sabtu, 03 Oktober 2026" (v2 dari `event`, v1 dari `countdown.date`). Kosong = tidak ditampilkan. */
  date: string;
  /** Nama lokasi (`map.title` v2; `events[0].venue` v1). */
  venue: string;
  /** Foto hero/cover, dipakai bila mode latar `foto` tanpa foto pilihan. */
  heroImage: string;
  tokens: InvitationDocument['tokens'];
  shareCard: ShareCardStyle;
}

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Membaca isi kartu dari dokumen mana pun. Bagian yang dimatikan tetap dibaca — kartu bagikan bukan halaman publik. */
export function readCardContent(document: InvitationDocument): CardContent {
  const at = (type: string) => document.sections.find((section) => section.type === type)?.data ?? {};
  const shareCard = document.shareCard ?? {};
  if (document.schemaVersion === 2) {
    const envelope = at('opening-envelope');
    const hero = at('hero');
    const couple = at('couple');
    const event = at('event');
    const map = at('map');
    const names = [trimmed(couple.brideName), trimmed(couple.groomName)].filter(Boolean).join(' & ');
    const dateLine = [trimmed(event.day), [trimmed(event.date), trimmed(event.monthYear)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return {
      couple: trimmed(envelope.title) || trimmed(hero.title) || names,
      date: dateLine,
      venue: trimmed(map.title),
      heroImage: trimmed(hero.imageUrl),
      tokens: document.tokens,
      shareCard,
    };
  }
  const cover = at('cover');
  const couple = at('couple');
  const countdown = at('countdown');
  const events = Array.isArray(at('events').events) ? (at('events').events as Record<string, unknown>[]) : [];
  const names = [trimmed(couple.partner1), trimmed(couple.partner2)].filter(Boolean).join(' & ');
  const t = dateParts(trimmed(countdown.date) || trimmed(events[0]?.date) || undefined);
  return {
    couple: trimmed(cover.title) || names,
    date: t.day ? `${t.day}, ${t.date} ${t.monthYear}` : '',
    venue: trimmed(events[0]?.venue),
    heroImage: trimmed(cover.image),
    tokens: document.tokens,
    shareCard,
  };
}

/** Warna akhir kartu setelah mode latar dan pilihan pasangan dipertimbangkan. */
export interface CardPalette { background: string; text: string; accent: string; muted: string }

const gold = '#D9B45C';

export function cardPalette(content: CardContent, hasPhoto: boolean): CardPalette {
  const { shareCard, tokens } = content;
  const mode = shareCard.backgroundMode ?? 'template';
  // Foto selalu diberi lapisan gelap, jadi teks bawaannya putih apa pun temanya.
  const background = mode === 'warna' && shareCard.backgroundColor ? shareCard.backgroundColor : hasPhoto ? '#1F1A17' : tokens.primary;
  const text = shareCard.text ?? (hasPhoto ? '#FFFFFF' : tokens.background);
  const accent = shareCard.accent ?? gold;
  return { background, text, accent, muted: text };
}

export interface BuildOptions {
  /** Nama tamu dari `?to=`; sudah dinormalkan pemanggil. */
  to?: string;
  /** Data URI foto yang sudah diunduh service; kosong = tanpa foto. */
  photoDataUri?: string;
}

const text = (value: string, style: Record<string, string | number>): CardNode => ({ type: 'div', props: { style, children: value } });

/** Pohon elemen satori untuk satu kartu. Tidak menyentuh jaringan: foto datang sudah jadi data URI. */
export function buildShareCard(content: CardContent, options: BuildOptions = {}): CardNode {
  const { shareCard } = content;
  const styleId = shareCard.styleId ?? 'template';
  const align = shareCard.textAlign ?? 'center';
  const hasPhoto = Boolean(options.photoDataUri);
  const palette = cardPalette(content, hasPhoto);
  const showName = shareCard.showGuestName !== false && Boolean(options.to);
  const showDate = shareCard.showDate !== false && Boolean(content.date);
  const showVenue = shareCard.showVenue !== false && Boolean(content.venue);

  const layers: CardNode[] = [];
  if (hasPhoto) {
    layers.push({ type: 'img', props: { src: options.photoDataUri, style: { position: 'absolute', top: 0, left: 0, width: cardWidth, height: cardHeight, objectFit: 'cover' } } });
    layers.push({ type: 'div', props: { style: { position: 'absolute', top: 0, left: 0, width: cardWidth, height: cardHeight, backgroundColor: 'rgba(20,14,12,0.58)' } } });
  }
  if (styleId === 'template') layers.push(...decorativeCircles(palette.accent));
  if (styleId === 'elegan') layers.push(...doubleFrame(palette.accent));

  const body: CardNode[] = [
    text('UNDANGAN PERNIKAHAN', { fontFamily: cardFonts.sans, fontSize: 24, fontWeight: 600, letterSpacing: 10, color: palette.accent, textTransform: 'uppercase' }),
    text(content.couple, { fontFamily: cardFonts.script, fontSize: content.couple.length > 26 ? 84 : 104, lineHeight: 1.15, color: palette.text, marginTop: 8 }),
    { type: 'div', props: { style: { width: 220, height: 2, backgroundColor: palette.accent, marginTop: 18, marginBottom: 26, opacity: 0.9 } } },
  ];
  if (showName) {
    body.push(text('KEPADA YTH.', { fontFamily: cardFonts.serif, fontSize: 26, letterSpacing: 5, color: palette.accent }));
    body.push(text(options.to!, { fontFamily: cardFonts.sans, fontSize: options.to!.length > 28 ? 40 : 52, fontWeight: 700, color: palette.text, marginTop: 6 }));
  }
  const meta = [showDate ? content.date : '', showVenue ? content.venue : ''].filter(Boolean);
  if (meta.length) body.push(text(meta.join('  ·  '), { fontFamily: cardFonts.serif, fontSize: 30, color: palette.muted, marginTop: showName ? 30 : 6, opacity: 0.92 }));

  layers.push({ type: 'div', props: {
    style: { position: 'absolute', top: 0, left: 0, width: cardWidth, height: cardHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align === 'left' ? 'flex-start' : 'center', textAlign: align, padding: align === 'left' ? '0 120px' : '0 96px' },
    children: body,
  } });

  return { type: 'div', props: { style: { position: 'relative', width: cardWidth, height: cardHeight, display: 'flex', backgroundColor: palette.background, overflow: 'hidden' }, children: layers } };
}

/** Motif template: tiga lingkaran garis tipis di sudut, seperti kartu referensi. */
function decorativeCircles(accent: string): CardNode[] {
  const circle = (size: number, top: number, left: number, opacity: number): CardNode => ({ type: 'div', props: { style: { position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, border: `1.5px solid ${accent}`, opacity } } });
  return [circle(520, -220, -180, 0.35), circle(360, -150, -90, 0.25), circle(620, 330, 820, 0.3), circle(440, 420, 910, 0.22)];
}

/** Bingkai ganda klasik untuk gaya `elegan`. */
function doubleFrame(accent: string): CardNode[] {
  const frame = (inset: number, width: number, opacity: number): CardNode => ({ type: 'div', props: { style: { position: 'absolute', top: inset, left: inset, width: cardWidth - inset * 2, height: cardHeight - inset * 2, border: `${width}px solid ${accent}`, opacity } } });
  return [frame(28, 2, 0.9), frame(40, 1, 0.6)];
}
