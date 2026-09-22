import { BadRequestException } from '@nestjs/common';
import { bankIds, galleryPhotoLimitFor, giftAccountLimit, invitationDocumentSchema, type InvitationDocument } from '@aruna/contracts';

type Section = InvitationDocument['sections'][number];

export function validatePublishableDocument(input: unknown): InvitationDocument {
  const parsed = invitationDocumentSchema.safeParse(input);
  if (!parsed.success) throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Dokumen undangan tidak valid', fieldErrors: parsed.error.flatten() });
  const document = parsed.data;
  if (document.schemaVersion === 2) assertPublishableV2(document);
  else assertPublishableV1(document);
  assertSafeUrls(document);
  return document;
}

/**
 * Syarat terbit dokumen Elegance (fase 72). Yang diwajibkan hanya yang tanpa dia undangan tidak
 * bisa dibaca tamu: amplop dengan nama pasangan, nama kedua mempelai, dan tanggal acara. Kolom
 * lain boleh kosong — kata-kata bawaannya sudah cukup, dan pasangan menyempurnakannya kapan saja.
 */
function assertPublishableV2(document: InvitationDocument): void {
  const sections = new Map(document.sections.map((section) => [section.type, section]));
  const envelope = sections.get('opening-envelope');
  const couple = sections.get('couple');
  const event = sections.get('event');
  if (!envelope?.enabled || !isNonEmptyString(envelope.data.title)) throw new BadRequestException('Amplop pembuka dan nama mempelai wajib diisi sebelum publish');
  if (!couple?.enabled || !isNonEmptyString(couple.data.brideName) || !isNonEmptyString(couple.data.groomName)) throw new BadRequestException('Nama kedua mempelai wajib diisi sebelum publish');
  if (!event?.enabled || !isNonEmptyString(event.data.day) || !isNonEmptyString(event.data.date) || !isNonEmptyString(event.data.monthYear)) throw new BadRequestException('Hari, tanggal, serta bulan dan tahun acara wajib diisi sebelum publish');
  if (!isNonEmptyString(event.data.akadTitle) || !isNonEmptyString(event.data.akadTime)) throw new BadRequestException('Nama dan waktu acara akad wajib diisi sebelum publish');
  assertGiftAccountsV2(sections.get('gift'));
}

function assertPublishableV1(document: InvitationDocument): void {
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
}

/**
 * Dokumen v2 hanya menyaring bagian yang dimatikan. Tidak ada lagi `events[].public` —
 * acara tambahan yang tidak untuk semua tamu memakai bagian `unduh-mantu` yang bisa dimatikan.
 */
export function publicDocument(document: InvitationDocument): InvitationDocument {
  const copy = structuredClone(document);
  copy.sections = copy.sections.filter((section) => section.enabled);
  if (copy.schemaVersion === 2) return copy;
  const events = copy.sections.find((section) => section.type === 'events');
  if (events && Array.isArray(events.data.events)) {
    events.data.events = events.data.events.filter((event) => !isRecord(event) || event.public !== false);
  }
  return copy;
}

/** Rekening v2 datar: `account1` wajib bila hadiah menyala, `account2` bila rekening kedua dinyalakan. */
function assertGiftAccountsV2(gift: Section | undefined): void {
  if (!gift?.enabled) return;
  const first = typeof gift.data.account1 === 'string' ? gift.data.account1.trim() : '';
  if (!first || first.length > 34) throw new BadRequestException('Nomor rekening pertama wajib diisi, maksimal 34 karakter');
  if (gift.data.hasSecondAccount === true) {
    const second = typeof gift.data.account2 === 'string' ? gift.data.account2.trim() : '';
    if (!second || second.length > 34) throw new BadRequestException('Nomor rekening kedua wajib diisi, maksimal 34 karakter');
  }
}

/**
 * Hanya berlaku untuk bentuk baru. Dokumen lama menyimpan satu rekening datar dan tidak
 * punya `accounts` sama sekali, jadi cabang ini dilewati dan revisi yang sudah terbit
 * tetap lolos publish tanpa migrasi.
 */
function assertGiftAccounts(gift: Section | undefined): void {
  if (!gift?.enabled || !Array.isArray(gift.data.accounts)) return;
  if (gift.data.accounts.length > giftAccountLimit) throw new BadRequestException(`Maksimal ${giftAccountLimit} rekening hadiah`);
  for (const account of gift.data.accounts) {
    if (!isRecord(account)) throw new BadRequestException('Data rekening hadiah tidak valid');
    if (!(bankIds as readonly string[]).includes(String(account.bankId))) throw new BadRequestException('Bank tidak dikenal pada rekening hadiah');
    const number = typeof account.number === 'string' ? account.number.trim() : '';
    if (!number || number.length > 34) throw new BadRequestException('Nomor rekening wajib diisi, maksimal 34 karakter');
  }
}

/**
 * Menyapu seluruh dokumen, berapa pun dalamnya. Pola kuncinya menangkap kedua struktur:
 * `image`/`images` (v1) dan `imageUrl`/`imageUrls`/`mapUrl`/`calendarUrl`/`backgroundImageUrl`
 * (v2), termasuk yang bersarang di `background.imageUrl`, `settings.musicUrl`, dan
 * `shareCard.imageUrl` — karena rekursinya turun ke setiap objek, bukan hanya `sections`.
 */
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

/** Menghitung foto galeri sebuah dokumen — sumber tunggal supaya "sebelum" dan "sesudah" dihitung sama. */
export function countGalleryPhotos(document: unknown): number {
  const sections = isRecord(document) && Array.isArray(document.sections) ? document.sections : [];
  let total = 0;
  for (const section of sections) {
    if (!isRecord(section) || !isRecord(section.data)) continue;
    const urls = section.data.imageUrls ?? section.data.images;
    if (Array.isArray(urls)) total += urls.length;
  }
  return total;
}

/**
 * Kuota foto per paket, ditegakkan saat terbit (fase 75).
 *
 * **Yang dijaga pertumbuhannya, bukan keberadaannya.** Sebuah dokumen yang sudah memegang lebih
 * banyak foto daripada jatah paketnya tetap boleh terbit selama jumlahnya tidak bertambah — kalau
 * tidak, satu pasangan bisa terjebak: paketnya turun (atau baru diselesaikan di paket termurah
 * sesudah menimbun foto sebagai draft), lalu undangannya tidak bisa diterbitkan sama sekali dan
 * satu-satunya jalan keluar adalah menghapus foto yang sudah dipilih. Menolak terbit adalah
 * hukuman yang jauh lebih berat daripada menolak unggahan, dan gerbang unggah di
 * `media.service.ts` sudah menahan pertumbuhannya di hulu.
 *
 * `sebelumnya` adalah revisi yang sedang aktif; `undefined` berarti belum pernah terbit, dan di
 * situ batasnya berlaku penuh — tidak ada yang bisa terjebak oleh sesuatu yang belum ada.
 */
export function assertGalleryQuota(document: InvitationDocument, packageId: string | null | undefined, sebelumnya?: unknown): void {
  const batas = galleryPhotoLimitFor(packageId);
  const sekarang = countGalleryPhotos(document);
  if (sekarang <= batas) return;
  const dulu = sebelumnya === undefined ? 0 : countGalleryPhotos(sebelumnya);
  if (sekarang <= dulu) return;
  throw new BadRequestException(`Paket ini memuat ${batas} foto galeri; dokumen ini memakai ${sekarang}. Hapus kelebihannya atau naikkan paket sebelum publish.`);
}
