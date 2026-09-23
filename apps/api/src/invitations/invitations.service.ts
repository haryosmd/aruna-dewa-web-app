import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { canEditDesign, createDefaultDocument, documentStructureId, documentThemeId, galleryPhotoLimitFor, invitationDocumentSchema, isLiveStructureId, isLiveTemplateId, migrateLegacyDocument, restructureDocument, sectionFeature, type InvitationDocument } from '@aruna/contracts';
import { shareSettingsSchema, type CreateInvitationBody, type ShareSettings } from '@aruna/contracts/api';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@aruna/database';
import { MembershipService } from '../common/membership.service.js';
import { assertOperator, isOperator, type AuthenticatedUser } from '../common/auth.js';
import { assertGalleryQuota, validatePublishableDocument } from './document-validation.js';
import { orphanAssetIds } from '../media/asset-usage.js';
import { revisionsToDropOnArchive } from './lifecycle.js';
import { storageForAsset } from '../media/storage.js';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}

  /**
   * Undangan yang boleh muncul di "Undangan kalian".
   *
   * `ARCHIVED` dikecualikan di **kedua** cabang, operator maupun bukan: arsip berarti keluar
   * dari daftar, dan operator yang ingin melihatnya punya tempatnya sendiri di `/bo`.
   *
   * `publishedAt` dan `updatedAt` ikut sejak fase 78, dan itu memperbaiki cacat yang sudah lama
   * hidup: kartu dasbor membaca `invitation.publishedAt` dari jawaban ini, yang tidak pernah
   * mengirimnya — jadi **setiap** kartu berbunyi "Belum dipublikasikan", termasuk yang tayang.
   */
  async list(user: AuthenticatedUser) {
    const where = isOperator(user)
      ? { status: { not: 'ARCHIVED' as const } }
      : { status: { not: 'ARCHIVED' as const }, members: { some: { userId: user.sub } } };
    const rows = await this.prisma.invitation.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /**
   * Mengeluarkan undangan dari daftar publik **tanpa menyentuh suntingannya**.
   *
   * Ini yang dimaksud "jadikan draf": `status` kembali `DRAFT`, jadi `public.service.ts` —
   * yang menuntut `PUBLISHED` **dan** `activeRevision` — berhenti menyajikannya. Yang sengaja
   * TIDAK dilepas: `activeRevisionId`, riwayat revisi, dan `publishedAt`. Ketiganya membuat
   * "terbitkan lagi" jadi satu klik alih-alih satu pemulihan, dan `publishedAt` tetap berarti
   * "terakhir terbit", bukan "sedang terbit" — yang menjawab pertanyaan kedua adalah `status`.
   */
  async unpublish(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { status: true } });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
    if (invitation.status === 'ARCHIVED') throw new BadRequestException('Undangan ini sudah diarsipkan');
    if (invitation.status !== 'PUBLISHED') return { status: invitation.status };
    await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: 'DRAFT' } });
    await this.prisma.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_UNPUBLISHED', targetType: 'Invitation', targetId: invitationId } });
    return { status: 'DRAFT' as const };
  }

  /**
   * Mengarsipkan undangan — dan memangkas yang berat di detik yang sama.
   *
   * Pemilik menerima arsip dengan satu syarat: ia tidak boleh menumpuk memori. Jadi arsip di
   * sini bukan sekadar mengganti status. Dua hal dibuang saat itu juga:
   *
   *   1. **Aset yang tidak dirujuk draf.** Berkasnya di penyimpanan, bukan cuma barisnya —
   *      cascade basis data tidak pernah menyentuh storage, dan itulah cara kuota bocor tanpa
   *      ada yang bisa melihat sebabnya.
   *   2. **Seluruh revisi terbit kecuali yang aktif.** Sampai 50 dokumen JSON penuh per
   *      undangan, tidak satu pun punya pembaca selama undangannya tidak publik.
   *
   * Yang tersisa: satu baris undangan, satu dokumen draf, dan tamunya. Pemusnahan penuhnya
   * dikerjakan penyapu retensi tiga puluh hari kemudian (`MaintenanceService`).
   */
  async archive(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'OWNER');
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, status: true, activeRevisionId: true, draftDocument: true },
    });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
    if (invitation.status === 'ARCHIVED') return { status: 'ARCHIVED' as const };

    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: invitationId }, data: { status: 'ARCHIVED' } });

      const revisions = await tx.publishedRevision.findMany({ where: { invitationId }, select: { id: true } });
      const buang = revisionsToDropOnArchive(revisions, invitation.activeRevisionId);
      if (buang.length) await tx.publishedRevision.deleteMany({ where: { id: { in: buang } } });

      // Aset diukur terhadap DRAF saja: revisi terbitnya baru saja dibuang, jadi tidak ada
      // pembaca lain yang tersisa. `orphanAssetIds` menerima dua dokumen; yang kedua null.
      await this.sweepOrphanAssets(tx, invitationId, null, invitation.draftDocument);

      await tx.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_ARCHIVED', targetType: 'Invitation', targetId: invitationId, metadata: { revisionsDropped: buang.length } } });
    });
    return { status: 'ARCHIVED' as const };
  }

  /** Mengembalikan undangan arsip ke `DRAFT`. Hanya operator — pasangan tidak bisa melihat arsipnya. */
  async restore(user: AuthenticatedUser, invitationId: string) {
    assertOperator(user);
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { status: true } });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
    if (invitation.status !== 'ARCHIVED') return { status: invitation.status };
    await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: 'DRAFT' } });
    await this.prisma.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_RESTORED', targetType: 'Invitation', targetId: invitationId } });
    return { status: 'DRAFT' as const };
  }

  /**
   * Menghapus undangan **permanen**. Hanya operator.
   *
   * Urutannya bukan selera, ia satu-satunya urutan yang bekerja:
   *
   *   1. **Berkas storage dulu.** Cascade basis data menghapus baris `MediaAsset` tapi tidak
   *      pernah menyentuh berkasnya; menghapusnya sesudah barisnya hilang berarti tidak ada
   *      lagi yang tahu kunci mana yang harus dibuang.
   *   2. **`activeRevisionId` di-null-kan.** `Invitation.activeRevisionId` menunjuk
   *      `PublishedRevision.id` tanpa `onDelete`, sementara `PublishedRevision.invitationId`
   *      menunjuk balik dengan `onDelete: Cascade`. Lingkar — tanpa langkah ini Postgres
   *      menolak penghapusannya dengan pelanggaran kunci asing.
   *   3. **Barisnya.** Sisanya ikut cascade; `AuditEvent` sengaja `onDelete: SetNull`, jadi
   *      jejak auditnya bertahan setelah undangannya tidak ada.
   */
  async remove(user: AuthenticatedUser, invitationId: string) {
    assertOperator(user);
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { id: true, slug: true, title: true } });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');

    await this.dropAssetFiles(this.prisma, invitationId);
    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: invitationId }, data: { activeRevisionId: null } });
      await tx.invitation.delete({ where: { id: invitationId } });
    });
    // Sesudah transaksi, dan tanpa `invitationId`: barisnya sudah tidak ada untuk ditunjuk.
    await this.prisma.auditEvent.create({ data: { actorId: user.sub, action: 'INVITATION_PURGED', targetType: 'Invitation', targetId: invitationId, metadata: { slug: invitation.slug, title: invitation.title } } });
    return { deleted: true };
  }

  /**
   * Menghapus berkas seluruh aset satu undangan dari penyimpanan.
   *
   * Barisnya dibiarkan — cascade yang mengurusnya. Kegagalan satu berkas dicatat dan tidak
   * membatalkan penghapusan, mengikuti aturan yang sama dengan `sweepOrphanAssets`: berkas
   * yatim di storage jauh lebih murah daripada penghapusan yang macet separuh jalan.
   */
  private async dropAssetFiles(db: PrismaService, invitationId: string): Promise<void> {
    const assets = await db.mediaAsset.findMany({ where: { invitationId }, select: { key: true, provider: true } });
    for (const asset of assets) {
      try { await storageForAsset(asset.provider).delete(asset.key); }
      catch (error) { this.logger.error(`Berkas aset gagal dihapus (${asset.key})`, error instanceof Error ? error.stack : String(error)); }
    }
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
    return { id: invitation.id, slug: invitation.slug, title: invitation.title, status: invitation.status, document: invitation.draftDocument, revision: invitation.draftRevision, features: invitation.entitlements.map((item) => item.featureId), activeUntil: invitation.entitlements.reduce<Date | null>((latest, item) => !latest || (item.activeUntil && item.activeUntil > latest) ? item.activeUntil : latest, null), publishedAt: invitation.publishedAt, shareSettings: readShareSettings(invitation.shareSettings), photoLimit: galleryPhotoLimitFor(invitation.packageId) };
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

  /**
   * Riwayat terbit (fase 75). Substratnya sudah ada sejak lama — `publish()` menulis satu
   * `PublishedRevision` per revisi baru dan tidak pernah menghapusnya — yang belum ada cuma pintunya.
   *
   * VIEWER boleh membacanya: daftar ini tidak memuat satu pun dokumen, hanya nomor dan waktu.
   * Dibatasi 50 karena itu tentang berapa banyak yang berguna dibaca manusia, bukan berapa yang ada.
   */
  async listRevisions(user: AuthenticatedUser, invitationId: string) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { activeRevisionId: true } });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan');
    const revisions = await this.prisma.publishedRevision.findMany({ where: { invitationId }, orderBy: { revision: 'desc' }, take: 50, select: { id: true, revision: true, createdAt: true } });
    return revisions.map((row) => ({ revision: row.revision, publishedAt: row.createdAt.toISOString(), isActive: row.id === invitation.activeRevisionId }));
  }

  /**
   * Memulihkan satu revisi terbit ke DRAFT — bukan ke yang dilihat tamu. Tamu baru melihatnya
   * sesudah pasangan menekan Publikasikan lagi, dan itu disengaja: memulihkan adalah tindakan
   * menyunting, bukan menerbitkan.
   *
   * Ditulis lewat `saveDraft` yang sama, bukan `update` langsung ke `draftDocument`. Itu yang
   * menjaga pemulihan tetap melewati gerbang desain, penjaga konflik revisi, dan validasi
   * dokumen — pintu kedua yang menulis dokumen tanpa ketiganya adalah cara menyimpan dokumen
   * yang API-nya sendiri akan tolak di tempat lain.
   *
   * Dokumennya **tidak** dimigrasi di sini. Revisi lama boleh `schemaVersion: 1`, dan aturan sejak
   * fase 72 tetap berlaku: yang memigrasi editor di klien, supaya server tidak pernah menulis
   * ulang dokumen yang belum disentuh pasangan.
   */
  async restoreRevision(user: AuthenticatedUser, invitationId: string, revision: number, draftRevision: number) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const snapshot = await this.prisma.publishedRevision.findFirst({ where: { invitationId, revision }, select: { id: true, document: true } });
    if (!snapshot) throw new NotFoundException('Revisi tidak ditemukan');
    const parsed = invitationDocumentSchema.safeParse(snapshot.document);
    // Sebuah revisi yang pernah terbit seharusnya selalu lolos. Kalau tidak, skemanya sudah
    // bergerak meninggalkannya, dan menuliskannya ke draft akan memindahkan kegagalan ke tempat
    // yang jauh lebih membingungkan — editor yang tidak bisa menyimpan tanpa sebab yang terlihat.
    if (!parsed.success) throw new BadRequestException('Revisi ini tidak bisa dipulihkan karena formatnya sudah tidak dikenali.');
    const hasil = await this.saveDraft(user, invitationId, parsed.data, draftRevision);
    await this.prisma.auditEvent.create({ data: { actorId: user.sub, invitationId, action: 'INVITATION_REVISION_RESTORED', targetType: 'PublishedRevision', targetId: snapshot.id, metadata: { revision } } });
    return hasil;
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
      // Kuota foto per paket. Pembandingnya revisi yang SEDANG aktif, supaya batas yang turun
      // tidak pernah mengunci undangan yang sudah terbit — lihat `assertGalleryQuota` (fase 75).
      const aktif = invitation.activeRevisionId ? await tx.publishedRevision.findUnique({ where: { id: invitation.activeRevisionId }, select: { document: true } }) : null;
      assertGalleryQuota(document, invitation.packageId, aktif?.document ?? undefined);
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
    /*
     * Kedua sumbu ikut sejak fase 74.11 — tapi nilai yang SUDAH DIRESOLUSI, tidak pernah kunci
     * mentahnya. Ini jebakan paling mahal di seluruh pemisahan itu, jadi ditulis keras:
     *
     * Kalau yang ditulis `document.structureId` mentah, maka setiap draft pra-fase-74 (yang
     * tidak punya kunci itu) berbalik dari `undefined` ke `'elegance'` pada simpan PERTAMA
     * sesudah editor mulai menulisnya — dan seluruh pelanggan tanpa add-on `design` terkunci
     * tidak bisa menyimpan apa pun. Itu cacat 73.1, kata per kata, untuk seluruh basis
     * pelanggan yang ada. Dengan nilai teresolusi kedua sisi membaca `'elegance'`, dan tidak
     * ada yang bergerak.
     *
     * Menambah kunci ke sini aman karena sidik jari TIDAK PERNAH dipersistensi: `hasDesignChange`
     * menghitung kedua sisinya segar di API setiap kali disimpan.
     *
     * `theme` juga menutup lubang kecil yang sudah ada sebelum fase ini: pindah tema hanya
     * menjatuhkan gerbang secara tidak langsung, karena `applyTemplate()` kebetulan ikut menulis
     * `tokens`. Pasangan yang sudah menyetel paletnya sendiri bisa bertukar tema dengan `tokens`
     * identik dan sidik jarinya tidak melihat apa pun.
     */
    theme: documentThemeId(document),
    structure: documentStructureId(document),
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
    // Fase 81: kanvas bebas (geseran, ukuran, putaran, ornamen per tempat, ornamen tambahan).
    const kanvas = kanonikKanvas(data.kanvas);
    if (kanvas) entry.kanvas = kanvas;
    if (Object.keys(entry).length) keluar.push({ id: section.id, ...entry });
  }
  return keluar;
}

/**
 * `kanvas` (fase 81): `keping` disortir rekursif seperti objek lain, dan `tambahan` — satu-satunya
 * larik — tiap barisnya ikut disortir. Keping tanpa ubahan (`{}`) dan larik kosong ≡ absen.
 */
function kanonikKanvas(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const masuk = value as Record<string, unknown>;
  const keluar: Record<string, unknown> = {};
  const keping = kanonikDalam(masuk.keping);
  if (keping && typeof keping === 'object' && !Array.isArray(keping) && Object.keys(keping as object).length) keluar.keping = keping;
  if (Array.isArray(masuk.tambahan) && masuk.tambahan.length) keluar.tambahan = masuk.tambahan.map((baris) => kanonikDalam(baris));
  return Object.keys(keluar).length ? keluar : null;
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
  /*
   * Yang dibaca di sini adalah tema yang TERSIMPAN, bukan hasil resolusinya — dan bedanya
   * menentukan.
   *
   * `documentThemeId()` menerjemahkan id pensiun ke penggantinya, jadi ia TIDAK PERNAH
   * mengembalikan id pensiun dan pembebasan di bawah tidak akan pernah menyala. Yang ditanyakan
   * pembebasan ini justru "apakah yang tersimpan sudah pensiun?", jadi ia butuh nilai mentahnya.
   * Urutan kuncinya tetap sama dengan `documentThemeId` supaya keduanya tidak bisa berselisih.
   */
  const temaTersimpan = oldDocument.themeId ?? oldDocument.templateId;
  if (!isLiveTemplateId(temaTersimpan)) return false;
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
   * Sejak fase 74.11 resolusi STRUKTUR ikut berada di jendela skew yang sama; ia aman hanya
   * karena kedua sisi menurunkan `undefined → 'elegance'` dengan cara yang identik.
   */
  const perluMigrasi = oldDocument.schemaVersion !== 2 && next.schemaVersion === 2 && Array.isArray(oldDocument.sections);
  /*
   * Pindah struktur diukur dengan cara yang sama persis (fase 74.11), dan alasannya juga sama.
   *
   * Struktur tujuan memberi id barunya ke SELURUH bagian, jadi `order` berganti seluruhnya dan
   * sidik jarinya dijamin berbeda — pasangan yang membayar add-on `design` untuk bisa pindah
   * struktur justru akan ditolak oleh gerbang yang seharusnya mengizinkannya.
   *
   * Yang diganti pembandingnya, bukan gerbangnya: dokumen lama dipindahkan dengan fungsi yang
   * sama persis dengan yang dipakai editor, lalu dibandingkan seperti biasa. Pindah murni lolos;
   * satu warna atau satu `textStyles` yang diselundupkan dalam simpan yang sama tetap tertangkap;
   * dan pembebasannya habis sendiri begitu tersimpan.
   *
   * Ini BUKAN melewati gerbang: pindah struktur tetap menuntut add-on `design`, dan yang
   * menegakkannya adalah `canEditDesign` di pemanggil, bukan fungsi ini.
   */
  const gantiStruktur = documentStructureId(oldDocument) !== documentStructureId(next);
  const dasar = perluMigrasi
    ? migrateLegacyDocument(oldDocument)
    : gantiStruktur && Array.isArray(oldDocument.sections)
      ? restructureDocument(oldDocument, documentStructureId(next))
      : oldDocument;
  return designFingerprint(dasar) !== designFingerprint(next);
}

function toJson(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
