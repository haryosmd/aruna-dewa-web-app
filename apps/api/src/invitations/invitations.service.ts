import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { canEditDesign, createDefaultDocument, isLiveTemplateId, type InvitationDocument } from '@aruna/contracts';
import type { CreateInvitationBody } from '@aruna/contracts/api';
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
    const document = createDefaultDocument(input.partner1.trim(), input.partner2.trim(), templateId);
    const eventSection = document.sections.find((section) => section.type === 'events');
    const date = input.date?.trim() ?? '';
    if (eventSection && Array.isArray(eventSection.data.events)) {
      eventSection.data.events = eventSection.data.events.map((event) => ({ ...event, date, venue: input.venue?.trim() || 'Lokasi akan diumumkan', address: input.address?.trim() || '' }));
    }
    const countdown = document.sections.find((section) => section.type === 'countdown');
    if (countdown) countdown.data.date = date;
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
    return { id: invitation.id, slug: invitation.slug, title: invitation.title, status: invitation.status, document: invitation.draftDocument, revision: invitation.draftRevision, features: invitation.entitlements.map((item) => item.featureId), activeUntil: invitation.entitlements.reduce<Date | null>((latest, item) => !latest || (item.activeUntil && item.activeUntil > latest) ? item.activeUntil : latest, null), publishedAt: invitation.publishedAt };
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
      const enabledTypes = document.sections.filter((section) => section.enabled).map((section) => section.type);
      const granted = new Set(invitation.entitlements.map((item) => item.featureId));
      if (!isOperator(user) && enabledTypes.some((feature) => !granted.has(feature))) throw new BadRequestException('Paket aktif belum mencakup seluruh section yang diaktifkan');
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
  const cover = document.sections?.find((section) => section.type === 'cover');
  return JSON.stringify({
    // Disortir sampai ke dalam: `tokens.motion` (fase 69) adalah objek, dan `{}` ≡ absen.
    tokens: kanonikDalam(document.tokens ?? {}),
    order: document.sections?.map((section) => section.id) ?? [],
    ornaments: kanonik(cover?.data?.ornamentOverrides),
    // Kata-kata (fase 69) ikut digerbangi — keputusan pemilik: seluruh "tema sendiri" masuk
    // add-on desain. `{}` dan absen sama-sama `null`, supaya form yang dikosongkan kembali tidak
    // terbaca sebagai perubahan.
    copy: kanonikCopy(document.copy),
  });
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
    else if (typeof nilai === 'string') keluar[key] = nilai;
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
  return designFingerprint(oldDocument) !== designFingerprint(next);
}

function toJson(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
