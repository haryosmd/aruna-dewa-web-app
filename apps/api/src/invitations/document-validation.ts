import { BadRequestException } from '@nestjs/common';
import { bankIds, giftAccountLimit, invitationDocumentSchema, type InvitationDocument } from '@aruna/contracts';

export function validatePublishableDocument(input: unknown): InvitationDocument {
  const parsed = invitationDocumentSchema.safeParse(input);
  if (!parsed.success) throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Dokumen undangan tidak valid', fieldErrors: parsed.error.flatten() });
  const document = parsed.data;
  const sections = new Map(document.sections.map((section) => [section.type, section]));
  const cover = sections.get('cover');
  const couple = sections.get('couple');
  const events = sections.get('events');
  if (!cover?.enabled || typeof cover.data.title !== 'string' || !cover.data.title.trim()) throw new BadRequestException('Cover dan judul wajib diisi sebelum publish');
  if (!couple?.enabled || typeof couple.data.partner1 !== 'string' || typeof couple.data.partner2 !== 'string' || !couple.data.partner1.trim() || !couple.data.partner2.trim()) throw new BadRequestException('Nama kedua mempelai wajib diisi sebelum publish');
  if (!events?.enabled || !Array.isArray(events.data.events) || events.data.events.length === 0) throw new BadRequestException('Minimal satu acara wajib diisi sebelum publish');
  for (const event of events.data.events) {
    if (!isRecord(event) || !isNonEmptyString(event.name) || !isNonEmptyString(event.date) || !isNonEmptyString(event.time) || !isNonEmptyString(event.venue)) throw new BadRequestException('Setiap acara harus memiliki nama, tanggal, waktu, dan lokasi');
  }
  assertGiftAccounts(sections.get('gift'));
  assertSafeUrls(document);
  return document;
}

export function publicDocument(document: InvitationDocument): InvitationDocument {
  const copy = structuredClone(document);
  copy.sections = copy.sections.filter((section) => section.enabled);
  const events = copy.sections.find((section) => section.type === 'events');
  if (events && Array.isArray(events.data.events)) {
    events.data.events = events.data.events.filter((event) => !isRecord(event) || event.public !== false);
  }
  return copy;
}

/**
 * Hanya berlaku untuk bentuk baru. Dokumen lama menyimpan satu rekening datar dan tidak
 * punya `accounts` sama sekali, jadi cabang ini dilewati dan revisi yang sudah terbit
 * tetap lolos publish tanpa migrasi.
 */
function assertGiftAccounts(gift: { enabled: boolean; data: Record<string, unknown> } | undefined): void {
  if (!gift?.enabled || !Array.isArray(gift.data.accounts)) return;
  if (gift.data.accounts.length > giftAccountLimit) throw new BadRequestException(`Maksimal ${giftAccountLimit} rekening hadiah`);
  for (const account of gift.data.accounts) {
    if (!isRecord(account)) throw new BadRequestException('Data rekening hadiah tidak valid');
    if (!(bankIds as readonly string[]).includes(String(account.bankId))) throw new BadRequestException('Bank tidak dikenal pada rekening hadiah');
    const number = typeof account.number === 'string' ? account.number.trim() : '';
    if (!number || number.length > 34) throw new BadRequestException('Nomor rekening wajib diisi, maksimal 34 karakter');
  }
}

function assertSafeUrls(value: unknown, key = ''): void {
  if (typeof value === 'string' && /(url|urls|image|images)$/iu.test(key)) {
    if (value && !isSafeUrl(value)) throw new BadRequestException(`URL tidak aman pada ${key}`);
    return;
  }
  if (Array.isArray(value)) for (const item of value) assertSafeUrls(item, key);
  else if (isRecord(value)) for (const [childKey, child] of Object.entries(value)) assertSafeUrls(child, childKey);
}

function isSafeUrl(value: string): boolean {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch { return false; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
