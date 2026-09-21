import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { normalizeDisplayName, type InvitationDocument } from '@aruna/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { buildShareCard, cardFonts, cardHeight, cardWidth, readCardContent } from './share-card.elements.js';

/*
 * Kartu bagikan (fase 72.7): PNG 1200×630 untuk `og:image`/`twitter:image` halaman `/i/[slug]`,
 * dirender di server dengan satori (HTML→SVG) + resvg (SVG→PNG).
 *
 * Font diambil dari paket `@fontsource/*` yang dipasang di API, bukan dari `apps/web`: pemindai
 * @nuxt/fonts menyimpan woff2 di cache build yang tidak ada di container API, sedangkan satori
 * hanya membaca TTF/OTF/WOFF. Ketiganya keluarga yang sama dengan tema web (`fontStacks`).
 */

const require = createRequire(import.meta.url);

const fontFiles: { name: string; file: string; weight: Font['weight']; style: Font['style'] }[] = [
  { name: cardFonts.serif, file: '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff', weight: 400, style: 'normal' },
  { name: cardFonts.serif, file: '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff', weight: 600, style: 'normal' },
  { name: cardFonts.script, file: '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff', weight: 400, style: 'normal' },
  { name: cardFonts.sans, file: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff', weight: 400, style: 'normal' },
  { name: cardFonts.sans, file: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff', weight: 600, style: 'normal' },
  { name: cardFonts.sans, file: '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff', weight: 700, style: 'normal' },
];

/** Batas cache di memori. Satu PNG ±60–150 KB, jadi 200 entri ≈ 30 MB paling banyak. */
const cacheLimit = 200;
/** Foto latar diunduh paling besar 6 MB dan paling lama 4 detik; lewat itu kartu jatuh ke latar tema. */
const photoByteLimit = 6 * 1024 * 1024;
const photoTimeoutMs = 4000;

@Injectable()
export class ShareCardService {
  private readonly logger = new Logger(ShareCardService.name);
  private fonts: Promise<Font[]> | null = null;
  /** `Map` menjaga urutan sisipan, jadi entri tertua ada di depan — cukup untuk LRU sederhana. */
  private readonly cache = new Map<string, Buffer>();

  constructor(private readonly prisma: PrismaService) {}

  async render(slug: string, to: string | undefined): Promise<Buffer> {
    const invitation = await this.prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED', activeRevision: { isNot: null } }, include: { activeRevision: true } });
    if (!invitation?.activeRevision) throw new NotFoundException('Undangan belum dipublikasikan');
    const guest = safeName(to);
    // Kunci per revisi terbit, bukan per draft: draft yang disunting tidak mengubah kartu sampai terbit lagi.
    const key = `${slug}|${invitation.activeRevision.id}|${guest}`;
    const hit = this.cache.get(key);
    if (hit) { this.cache.delete(key); this.cache.set(key, hit); return hit; }

    const document = invitation.activeRevision.document as unknown as InvitationDocument;
    const content = readCardContent(document);
    const wantsPhoto = content.shareCard.backgroundMode === 'foto';
    const photoUrl = wantsPhoto ? (content.shareCard.imageUrl || content.heroImage) : '';
    const photoDataUri = photoUrl ? await this.fetchPhoto(photoUrl) : '';
    const svg = await satori(buildShareCard(content, { to: guest || undefined, photoDataUri }) as never, { width: cardWidth, height: cardHeight, fonts: await this.loadFonts() });
    const png = Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: cardWidth } }).render().asPng());

    this.cache.set(key, png);
    if (this.cache.size > cacheLimit) this.cache.delete(this.cache.keys().next().value!);
    return png;
  }

  private loadFonts(): Promise<Font[]> {
    this.fonts ??= Promise.all(fontFiles.map(async (font) => ({ name: font.name, data: await readFile(require.resolve(font.file)), weight: font.weight, style: font.style })));
    return this.fonts;
  }

  /**
   * Foto dibawa ke satori sebagai data URI: satori memang bisa mengambil URL sendiri, tapi tanpa
   * batas ukuran maupun waktu, dan satu foto 20 MB akan menahan seluruh permintaan `og:image`.
   * Gagal apa pun sebabnya → kartu tetap terbit dengan latar tema.
   */
  private async fetchPhoto(url: string): Promise<string> {
    try {
      const parsed = new URL(url, process.env.API_ORIGIN ?? 'http://127.0.0.1:3001');
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      const response = await fetch(parsed, { signal: AbortSignal.timeout(photoTimeoutMs) });
      if (!response.ok) return '';
      const type = response.headers.get('content-type') ?? '';
      if (!/^image\/(jpeg|png|webp)/.test(type)) return '';
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > photoByteLimit) return '';
      return `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Foto kartu bagikan gagal diambil (${url}): ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }
}

/** Nama tamu dari `?to=` — dinormalkan seperti halaman undangan; yang tidak sah dibaca sebagai tanpa nama. */
function safeName(value: string | undefined): string {
  if (!value) return '';
  try { return normalizeDisplayName(value).slice(0, 80); } catch { return ''; }
}
