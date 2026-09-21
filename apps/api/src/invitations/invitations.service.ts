import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { canEditDesign, createDefaultDocument, isLiveStructureId, isLiveTemplateId, migrateLegacyDocument, sectionFeature, type InvitationDocument } from '@aruna/contracts';
import { shareSettingsSchema, type CreateInvitationBody, type ShareSettings } from '@aruna/contracts/api';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@aruna/database';
import { MembershipService } from '../common/membership.service.js';
import { isOperator, type AuthenticatedUser } from '../common/auth.js';
import { validatePublishableDocument } from './document-validation.js';
import { orphanAssetIds } from '../media/asset-usage.js';
import { storageForAsset } from '../media/storage.js';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}

  async list(user: AuthenticatedUser) {
    const rows = isOperator(user)
      ? await this.prisma.invitation.findMany({ orderBy: { updatedAt: 'desc' } })
      : await this.prisma.invitation.findMany({ where: { members: { some: { userId: user.sub } } }, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, status: row.status }));
  }

  async create(user: AuthenticatedUser, input: CreateInvitationBody) {
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) throw new BadRequestException('Slug tidak valid');
    // Diukur terhadap tema yang HIDUP, bukan seluruh id yang diterima schema: undangan baru
    // tidak boleh lahir langsung memakai tema yang sudah pensiun dari pemilih.
    const templateId = input.templateId?.trim() || 'aruna-bloom';
    if (!isLiveTemplateId(templateId)) throw new BadRequestException('Template tidak tersedia');
    // Diukur terhadap struktur yang HIDUP, alasan yang sama persis dengan tema di atas: undangan
    // baru tidak boleh lahir memakai struktur yang sudah pensiun (`warisan`).
    const structureId = input.structureId?.trim() || 'elegance';
    if (!isLiveStructureId(structureId)) throw new BadRequestException('Struktur undangan tidak tersedia');
    // Dokumen v2 (fase 72): tanggal, lokasi, dan alamat dari form pemesanan mendarat langsung di
    // kata-kata bagian `event`/`map`/`countdown` lewat pembangun bawaannya — tidak ada lagi
    // `events.events[]` yang perlu ditulis ulang di sini.
    const document = createDefaultDocument(input.partner1.trim(), input.partner2.trim(), templateId, { date: input.date?.trim() || undefined, venue: input.venue?.trim() || undefined, address: input.address?.trim() || undefined }, structureId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.create({ data: { slug, title: input.title.trim(), partner1: input.partner1.trim(), partner2: input.partner2.trim(), eventDate: input.date ? new Date(input.date) : null, venue: input.venue?.trim(), address: input.address?.trim(), draftDocument: toJson(document), createdById: user.sub } });
        await tx.invitationMember.create({ data: { invitationId: invitation.id, userId: user.sub, role: 'OWNER' } });
        return invitation;
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) throw new ConflictException('Slug sudah digunakan');
      throw error;
    }
  }

  async get(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const invitation = await this.prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, include: { entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] }, include: { feature: true } } } });
    // Draft v1 dikirim apa adanya — editor yang memigrasinya di klien (fase 72), supaya server
    // tidak pernah menulis ulang dokumen yang belum disentuh pasangan.
    return { id: invitation.id, slug: invitation.slug, title: invitation.title, status: invitation.status, document: invitation.draftDocument, revision: invitation.draftRevision, features: invitation.entitlements.map((item) => item.featureId), activeUntil: invitation.entitlements.reduce<Date | null>((latest, item) => !latest || (item.activeUntil && item.activeUntil > latest) ? item.activeUntil : latest, null), publishedAt: invitation.publishedAt, shareSettings: readShareSettings(invitation.shareSettings) };
  }

  /** Template WhatsApp (fase 72.6). Di luar dokumen dan revisinya: menyunting pesan tidak boleh membuat draft "belum terbit". */
  async updateShareSettings(user: AuthenticatedUser, invitationId: string, input: ShareSettings) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const updated = await this.prisma.invitation.updateMany({ where: { id: invitationId }, data: { shareSettings: toJson(input) } });
    if (!updated.count) throw new NotFoundException('Undangan tidak ditemukan');
    return input;
  }

  /** `document` dan `revision` sudah lolos `saveDraftBodySchema` di batas controller. */
  async saveDraft(user: AuthenticatedUser, invitationId: string, document: InvitationDocument, revision: number) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const existing = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { draftDocument: true, entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] }, select: { featureId: true } } } });
    if (!existing) throw new NotFoundException('Undangan tidak ditemukan');
    // Aturan yang sama persis dipakai editor untuk mematikan kontrolnya, supaya kontrol
    // yang terlihat hidup tidak pernah berujung pada autosave yang ditolak.
    const designUnlocked = canEditDesign({ isOperator: isOperator(user), features: existing.entitlements.map((item) => item.featureId) });
    if (!designUnlocked && hasDesignChange(existing.draftDocument, document)) throw new BadRequestException('Perubahan warna, huruf, latar, ornamen, kata-kata, gerak, atau urutan section memerlukan add-on desain');
    const update = await this.prisma.invitation.updateMany({ where: { id: invitationId, draftRevision: revision }, data: { draftDocument: toJson(document), draftRevision: { increment: 1 } } });
    if (!update.count) {
      const current = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { draftRevision: true, draftDocument: true } });
      throw new ConflictException({ code: 'REVISION_CONFLICT', message: 'Draft telah diubah di tempat lain', current });
    }
    return { document, revision: revision + 1 };
  }

  async publish(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { id: invitationId }, include: { entitlements: { where: { revokedAt: null, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] } } } });
      if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
      if (invitation.activeRevisionId) {
        const active = await tx.publishedRevision.findUnique({ where: { id: invitation.activeRevisionId } });
        if (active?.revision === invitation.draftRevision) return { slug: invitation.slug, publishedAt: invitation.publishedAt };
      }
      const document = validatePublishableDocument(invitation.draftDocument);
      // Lewat `sectionFeature`, bukan `type` mentah: bagian v2 (`hero`, `event`, `map`, …) menumpang
      // fitur lama di katalog, jadi entitlement di basis data tidak perlu tahu tipe baru.
      const enabledFeatures = document.sections.filter((section) => section.enabled).map((section) => sectionFeature[section.type] ?? section.type);
      const granted = new Set(invitation.entitlements.map((item) => item.featureId));
      if (!isOperator(user) && enabledFeatures.some((feature) => !granted.has(feature))) throw new BadRequestException('Paket aktif belum mencakup seluruh section yang diaktifkan');
      const snapshot = await tx.publishedRevision.create({ data: { invitationId, revision: invitation.draftRevision, document: toJson(document) } });
      const publishedAt = new Date();
      await tx.invitation.update({ where: { id: invitationId }, data: { activeRevisionId: snapshot.id, status: 'PUBLISHED', publishedAt } });
      await tx.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_PUBLISHED', targetType: 'PublishedRevision', targetId: snapshot.id } });
      await this.sweepOrphanAssets(tx, invitationId, document, invitation.draftDocument);
      return { slug: invitation.slug, publishedAt };
    });
  }

  /**
   * Menyapu aset yang menggantung setelah versi terbit berganti.
   *
   * Foto yang dihapus dari draf selagi undangan sudah terbit sengaja **tidak** langsung dibuang:
   * tamu yang sudah memegang tautannya masih melihat versi lama. Penahan itu lepas di sini, dan
   * kalau tidak disapu, berkasnya tinggal selamanya sambil tetap dihitung terhadap batas 15 foto.
   *
   * Sengaja tidak pernah menggagalkan publish. Penerbitan sudah tercatat di transaksi ini;
   * berkas yatim di storage adalah kerugian yang jauh lebih kecil daripada undangan yang gagal
   * terbit karena satu penghapusan berkas bermasalah.
   */
  private async sweepOrphanAssets(tx: Prisma.TransactionClient, invitationId: string, activeDocument: unknown, draftDocument: unknown): Promise<void> {
    try {
      // `provider` ikut diambil, dan itu bukan kelengkapan: menyapu lewat penyimpanan global
      // berarti kunci warisan `LOCAL` dicoba dihapus dari bucket setelah pindah. Gagalnya ditelan
      // `catch` di bawah, berkasnya tinggal di volume selamanya, dan karena barisnya tetap
      // terhapus, kuota 15 foto bocor tanpa ada yang bisa melihat penyebabnya.
      const assets = await tx.mediaAsset.findMany({ where: { invitationId }, select: { id: true, key: true, provider: true } });
      const orphans = orphanAssetIds(assets.map((asset) => asset.id), activeDocument, draftDocument);
      if (!orphans.length) return;
      const byId = new Map(assets.map((asset) => [asset.id, asset]));
      for (const id of orphans) { const asset = byId.get(id)!; await storageForAsset(asset.provider).delete(asset.key); }
      await tx.mediaAsset.deleteMany({ where: { id: { in: orphans } } });
    } catch (error) {
      this.logger.error(`Sapuan aset yatim gagal (${invitationId})`, error instanceof Error ? error.stack : String(error));
    }
  }
}

/** JSON mentah Prisma yang tidak lolos skema dibaca sebagai "belum diatur", bukan 500 di halaman Generator. */
function readShareSettings(value: unknown): ShareSettings | null {
  const parsed = shareSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isPrismaUniqueError(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'; }

/**
 * Proyeksi dokumen yang digerbangi entitlement `design`.
 *
 * **Urutan key tidak boleh ikut menentukan, dan sebelum fase 59 ia menentukan.** Bentuk lamanya
 * membandingkan `JSON.stringify(tokens)` langsung, jadi dua objek bernilai sama dengan urutan
 * key berbeda terbaca sebagai perubahan desain. Selama `tokens` punya empat key wajib yang
 * selalu ditulis dalam urutan yang sama, itu tidak pernah menyala. Fase 59 menambah tiga key
 * **opsional** — yang kadang ada, kadang tidak, dan mendarat di tengah objek begitu ditulis
 * lewat `{ ...tokens, bodyFont }` — dan sejak itu false positive berhenti jadi teori. Gejalanya
 * mahal dan membingungkan: simpan ditolak `BadRequestException` untuk perubahan yang tidak
 * pernah dibuat pasangan.
 *
 * `ornamentOverrides` ikut digerbangi sejak fase 59, atas keputusan pemilik: pemilih ornamen
 * yang dibuka Studio adalah fitur desain, sekelas dengan warna dan huruf. `ornamentIntensity`
 * dan seluruh isi cover lainnya — judul, foto, komposisi — **sengaja tidak ikut** dan tetap
 * gratis.
 *
 * Penggerbangannya membandingkan lama terhadap baru, jadi penukaran yang sudah tersimpan saat
 * masih gratis tetap di tempatnya; yang tergerbang hanya suntingan berikutnya.
 */
export function designFingerprint(document: InvitationDocument): string {
  // Fase 72: pada dokumen v2 `ornamentOverrides` tinggal di `opening-envelope` (migrator memindahkannya
  // dari `cover`); dokumen v1 tetap dibaca dari `cover` supaya revisi lama tidak berubah sidik jarinya.
  // `sections` datang dari JSON basis data: seluruh berkas ini memperlakukan bentuk yang tidak
  // berbentuk sebagai "tidak ada bagian" supaya draft rusak berujung 400, bukan 500.
  const sections = Array.isArray(document.sections) ? document.sections : [];
  const gerbang = sections.find((section) => section.type === (document.schemaVersion === 2 ? 'opening-envelope' : 'cover'));
  return JSON.stringify({
    // Disortir sampai ke dalam: `tokens.motion` (fase 69) adalah objek, dan `{}` ≡ absen.
    // `tokens.layout` (fase 72) ikut di sini tanpa cabang baru.
    tokens: kanonikDalam(document.tokens ?? {}),
    order: sections.map((section) => section.id),
    ornaments: kanonik(gerbang?.data?.ornamentOverrides),
    // Kata-kata (fase 69) ikut digerbangi — keputusan pemilik: seluruh "tema sendiri" masuk
    // add-on desain. `{}` dan absen sama-sama `null`, supaya form yang dikosongkan kembali tidak
    // terbaca sebagai perubahan.
    copy: kanonikCopy(document.copy),
    // Fase 72.4–72.5: gaya teks per kolom, latar, dan gerak masuk tiap bagian adalah desain.
    // Kata-kata di `data` (judul, nama, tanggal) **sengaja tidak** ikut — itu isi, bukan desain —
    // begitu pula `settings` (musik) dan `shareCard` (kartu bagikan) yang tinggal di luar sini.
    // Hanya v2: `gallery.data.motion` sudah ada di dokumen v1 (gerak galeri) dan tidak pernah
    // digerbangi — membacanya di sini akan mengubah sidik jari revisi lama tanpa ada yang menyentuhnya.
    sections: document.schemaVersion === 2 ? kanonikBagian(sections) : [],
  });
}

/**
 * Proyeksi desain per bagian: `{ id, textStyles, background, motion }`. Objek kosong ≡ absen,
 * dan bagian tanpa satu pun dari ketiganya dibuang, supaya dokumen v1 (yang tidak punya kunci
 * ini) menghasilkan `[]` — sama seperti sebelum fase 72 — dan sidik jari revisi lamanya tetap.
 */
function kanonikBagian(sections: InvitationDocument['sections'] | undefined): unknown[] {
  const keluar: unknown[] = [];
  for (const section of sections ?? []) {
    const data = (section.data ?? {}) as Record<string, unknown>;
    const entry: Record<string, unknown> = {};
    const textStyles = kanonikDalam(data.textStyles);
    if (textStyles && typeof textStyles === 'object' && Object.keys(textStyles as object).length) entry.textStyles = textStyles;
    const background = kanonikDalam(data.background);
    if (background && typeof background === 'object' && Object.keys(background as object).length) entry.background = background;
    if (typeof data.motion === 'string' && data.motion) entry.motion = data.motion;
    if (Object.keys(entry).length) keluar.push({ id: section.id, ...entry });
  }
  return keluar;
}

/** Objek biasa disortir rekursif; primitif dibiarkan; objek kosong dibuang supaya `{}` ≡ absen. */
function kanonikDalam(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const masuk = value as Record<string, unknown>;
  const keluar: Record<string, unknown> = {};
  for (const key of Object.keys(masuk).sort()) {
    const nilai = kanonikDalam(masuk[key]);
    if (nilai === undefined) continue;
    if (nilai && typeof nilai === 'object' && !Array.isArray(nilai) && !Object.keys(nilai as object).length) continue;
    keluar[key] = nilai;
  }
  return keluar;
}

/** Hanya string, kunci tersortir; kosong → `null`. Kunci asing tidak dibuang di sini — schema sudah menolaknya. */
function kanonikCopy(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const masuk = value as Record<string, unknown>;
  const keluar: Record<string, string> = {};
  for (const key of Object.keys(masuk).sort()) {
    const nilai = masuk[key];
    if (typeof nilai === 'string') keluar[key] = nilai;
  }
  return Object.keys(keluar).length ? keluar : null;
}

/**
 * Bentuk `ornamentOverrides` yang bisa dibandingkan, dari nilai yang belum tentu berbentuk.
 *
 * `previous` datang sebagai JSON mentah Prisma dan `section.data` adalah `z.record(z.unknown())`,
 * jadi apa pun bisa ada di sana — termasuk dokumen lama yang tidak punya section cover sama
 * sekali. Nilai non-string dibuang supaya sampah tidak bisa dipakai memicu gerbang.
 */
function kanonik(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const masuk = value as Record<string, unknown>;
  const keluar: Record<string, unknown> = {};
  for (const key of Object.keys(masuk).sort()) {
    const nilai = masuk[key];
    // `layers` diperiksa LEBIH DULU, bukan sesudah cabang string. Diperiksa belakangan, sebuah
    // `layers: 'apa saja'` lolos sebagai string biasa dan menyalakan gerbang dari sampah.
    if (key === 'layers') { const bersarang = kanonik(nilai); if (bersarang) keluar[key] = bersarang; }
    // `unggahan` (fase 69): per slot sebuah objek { url, width, height }; hanya tiga kunci itu yang dibaca.
    else if (key === 'unggahan') { const bersarang = kanonikUnggahan(nilai); if (bersarang) keluar[key] = bersarang; }
    else if (typeof nilai === 'string') keluar[key] = nilai;
  }
  return Object.keys(keluar).length ? keluar : null;
}

function kanonikUnggahan(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const masuk = value as Record<string, unknown>;
  const keluar: Record<string, unknown> = {};
  for (const key of Object.keys(masuk).sort()) {
    const item = masuk[key];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const { url, width, height } = item as Record<string, unknown>;
    if (typeof url !== 'string') continue;
    keluar[key] = { url, width: typeof width === 'number' ? width : null, height: typeof height === 'number' ? height : null };
  }
  return Object.keys(keluar).length ? keluar : null;
}

export function hasDesignChange(previous: unknown, next: InvitationDocument): boolean {
  if (!previous || typeof previous !== 'object') return true;
  const oldDocument = previous as InvitationDocument;
  /*
   * Satu pembebasan: pindah KELUAR dari tema yang sudah dipensiunkan selalu boleh.
   *
   * Tanpa ini pasangan tanpa add-on `design` terkunci di tema yang tidak ada lagi di pemilih
   * mana pun — kami yang menghapus temanya, lalu menagih mereka untuk keluar dari sana.
   * Pembebasannya sempit dengan sengaja: hanya berlaku saat id LAMA pensiun, jadi pindah
   * antar tema hidup tetap digerbangi seperti biasa, dan sekali pasangan sudah pindah ia
   * tidak bisa dipakai lagi.
   */
  if (!isLiveTemplateId(oldDocument.templateId)) return false;
  /*
   * Simpan pertama sesudah migrasi v1→v2 diukur terhadap HASIL MIGRASI, bukan terhadap dokumen
   * v1-nya.
   *
   * Editor memigrasi draft saat memuatnya lalu menyuruh pasangan menyimpan. Sidik jari membaca
   * `order` (dua belas id bagian berganti sekaligus) dan `copy` (migrator membuangnya), jadi ia
   * SELALU berbeda — dan pasangan tanpa add-on `design` tidak bisa menyimpan apa pun lagi
   * selamanya, termasuk mengetik nama orang tuanya.
   *
   * Yang diganti adalah pembandingnya, bukan gerbangnya: dokumen lama dimigrasikan dengan
   * migrator yang sama persis dengan yang dipakai editor, lalu dibandingkan seperti biasa.
   * Migrasi murni lolos; satu warna, satu urutan, atau satu `textStyles` yang diselundupkan dalam
   * simpan itu tetap tertangkap. Pembebasannya habis sendiri — sesudah tersimpan, `schemaVersion`
   * lama sudah 2 dan cabang ini tidak pernah dimasuki lagi.
   *
   * `Array.isArray` bukan hiasan: `previous` adalah JSON mentah dari basis data, dan migrator
   * memetakan `document.sections`. Tanpa penjaga itu, sebuah draft rusak berubah dari 400 menjadi
   * 500. Dan satu risiko yang harus diketahui: sidik jari sisi sini dihitung oleh migrator API,
   * sidik jari `next` oleh migrator bundel web — mengubah urutan `eleganceSectionTypes` atau
   * pembawaan ornamen di antara dua deploy yang tidak sinkron akan menolak simpan pertama.
   */
  const perluMigrasi = oldDocument.schemaVersion !== 2 && next.schemaVersion === 2 && Array.isArray(oldDocument.sections);
  const dasar = perluMigrasi ? migrateLegacyDocument(oldDocument) : oldDocument;
  return designFingerprint(dasar) !== designFingerprint(next);
}

function toJson(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
