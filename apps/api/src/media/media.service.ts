import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { allowedMediaTypes, audioAssetLimit, formatBytes, galleryPhotoLimitFor, mediaKindOf, mediaRules, ornamentAssetLimit, type MediaKind } from '@aruna/contracts';
import { intakeOrnament } from './ornament-intake.js';
import { PrismaService } from '../database/prisma.service.js';
import { MembershipService } from '../common/membership.service.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { createMediaStorage, storageForAsset } from './storage.js';
import type { MediaProviderName } from './storage.js';
import { apiOrigin, publicMediaUrl, referencesAsset, servesAsset } from './asset-usage.js';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}
  /**
   * `jenis` dinyatakan klien, bukan diturunkan dari MIME: PNG yang sama bisa foto galeri atau
   * ornamen, dan keduanya punya kuota, batas ukuran, dan pemeriksaan yang berbeda (fase 69).
   * Tanpa `jenis`, jalannya persis seperti sebelum fase ini.
   */
  async upload(user: AuthenticatedUser, invitationId: string, file: Express.Multer.File, jenis?: MediaKind) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (!file) throw new BadRequestException('Berkas tidak ditemukan');
    let width: number | null = null;
    let height: number | null = null;
    let kind: MediaKind;
    if (jenis === 'ornament') {
      const intake = intakeOrnament(file.buffer, file.mimetype, file.size);
      kind = 'ornament';
      width = intake.width;
      height = intake.height;
      const kept = await this.prisma.mediaAsset.count({ where: { invitationId, kind: 'ORNAMENT' } });
      if (kept >= ornamentAssetLimit) throw new BadRequestException(`Batas ornamen unggahan per undangan adalah ${ornamentAssetLimit}. Hapus yang tidak dipakai lebih dulu.`);
    } else {
      if (!allowedMediaTypes.includes(file.mimetype)) throw new BadRequestException('Jenis media harus JPEG, PNG, WebP, atau MP3');
      kind = mediaKindOf(file.mimetype)!;
      const rules = mediaRules[kind];
      if (file.size <= 0 || file.size > rules.maxBytes) throw new BadRequestException(`Ukuran ${rules.label} maksimal ${formatBytes(rules.maxBytes)}`);
      if (!hasMatchingSignature(file.buffer, file.mimetype)) throw new BadRequestException('Isi berkas tidak cocok dengan jenis media yang diklaim');
      // Batasnya dihitung dari aset yang benar-benar tersimpan, bukan dari isi dokumen — itulah
      // sebabnya menghapus foto wajib ikut menghapus asetnya, kalau tidak kuotanya bocor.
      // Dihitung per `kind`, bukan awalan contentType: ornamen PNG tidak boleh memakan kuota galeri.
      const kept = await this.prisma.mediaAsset.count({ where: { invitationId, kind: kind === 'image' ? 'IMAGE' : 'AUDIO' } });
      if (kind === 'image') {
        // Batasnya mengikuti paket sejak fase 75, dan paketnya dibaca DI SINI, bukan diturunkan
        // dari entitlement: entitlement cuma daftar fitur, dan dua paket bisa membuka fitur yang
        // sama dengan kuota berbeda. Undangan tanpa pesanan lunas (`packageId` null) memakai
        // angka paket termurah — `galleryPhotoLimitFor` yang memutuskan, bukan baris ini.
        const undangan = await this.prisma.invitation.findUnique({ where: { id: invitationId }, select: { packageId: true } });
        const batas = galleryPhotoLimitFor(undangan?.packageId);
        if (kept >= batas) throw new BadRequestException(`Batas foto per undangan adalah ${batas}. Hapus foto yang tidak dipakai lebih dulu, atau naikkan paket.`);
      }
      if (kind === 'audio' && kept >= audioAssetLimit) throw new BadRequestException(`Batas lagu terunggah adalah ${audioAssetLimit}. Hapus lagu lama lebih dulu.`);
    }
    const extension = extensionFor(file.mimetype);
    const key = `${invitationId}/${randomUUID()}${extension}`;
    try { await createMediaStorage().put(key, file.buffer, file.mimetype); }
    catch (error) {
      // Galat S3/filesystem membawa nama bucket, path, dan kadang keterangan kredensial.
      // Semuanya masuk log; yang mengunggah cukup tahu unggahannya belum berhasil.
      this.logger.error(`Media gagal disimpan (${key})`, error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Media tidak dapat disimpan saat ini. Coba lagi beberapa saat lagi.');
    }
    const asset = await this.prisma.mediaAsset.create({ data: {
      invitationId, provider: (process.env.MEDIA_PROVIDER ?? 'local') === 's3' ? 'S3' : 'LOCAL', key,
      contentType: file.mimetype, bytes: file.size, originalName: file.originalname,
      kind: kindEnum(kind), width, height,
    } });
    return this.keluaran(asset);
  }

  /** Daftar aset satu undangan per jenis — Studio Ornamen menampilkan unggahan sebelumnya (fase 69). */
  async list(user: AuthenticatedUser, invitationId: string, jenis: MediaKind) {
    await this.memberships.requireInvitationRole(user, invitationId);
    const assets = await this.prisma.mediaAsset.findMany({ where: { invitationId, kind: kindEnum(jenis) }, orderBy: { createdAt: 'desc' } });
    return assets.map((asset) => this.keluaran(asset));
  }

  private keluaran(asset: { id: string; contentType: string; kind: 'IMAGE' | 'AUDIO' | 'ORNAMENT'; width: number | null; height: number | null; originalName: string; bytes: number }) {
    return {
      id: asset.id, contentType: asset.contentType, kind: asset.kind.toLowerCase() as MediaKind,
      width: asset.width, height: asset.height, originalName: asset.originalName, bytes: asset.bytes,
      draftUrl: `${apiOrigin()}/v1/media/${asset.id}`, publicUrl: publicMediaUrl(asset.id),
    };
  }

  /**
   * Menghapus aset, bukan sekadar melepasnya dari dokumen.
   *
   * Penjaganya satu dan penting: aset yang masih dipakai revisi aktif tidak boleh hilang.
   * Undangan yang sudah disebar ke ratusan tamu tidak boleh berubah jadi kotak gambar rusak
   * karena pasangan merapikan drafnya.
   */
  async remove(user: AuthenticatedUser, invitationId: string, assetId: string) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, include: { invitation: { include: { activeRevision: true } } } });
    if (!asset || asset.invitationId !== invitationId) throw new BadRequestException('Media tidak ditemukan');
    if (referencesAsset(asset.invitation.activeRevision?.document, asset.id)) throw new BadRequestException('Aset ini masih dipakai versi yang sudah diterbitkan. Terbitkan ulang undangan tanpa aset itu lebih dulu.');
    try { await storageForAsset(asset.provider).delete(asset.key); }
    catch (error) {
      // Baris DB tetap dihapus: berkas yatim di storage jauh lebih murah daripada kuota yang
      // macet selamanya karena satu penghapusan gagal.
      this.logger.error(`Berkas media gagal dihapus (${asset.key})`, error instanceof Error ? error.stack : String(error));
    }
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    return { deleted: true };
  }

  async readForMember(user: AuthenticatedUser, assetId: string): Promise<{ contentType: string; body: Buffer }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new BadRequestException('Media tidak ditemukan');
    await this.memberships.requireInvitationRole(user, asset.invitationId);
    return { contentType: asset.contentType, body: await this.read(asset) };
  }

  async readForPublic(assetId: string): Promise<{ contentType: string; body: Buffer }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, include: { invitation: { include: { activeRevision: true } } } });
    if (!asset?.invitation.activeRevision || asset.invitation.status !== 'PUBLISHED') throw new BadRequestException('Media publik tidak ditemukan');
    if (!servesAsset(asset.invitation.activeRevision.document, asset.id)) throw new BadRequestException('Media belum dipakai pada undangan publik');
    return { contentType: asset.contentType, body: await this.read(asset) };
  }

  /**
   * Dibaca dari penyimpanan milik aset itu, bukan dari `MEDIA_PROVIDER` yang sedang berlaku.
   * Foto yang diunggah sebelum pindah ke bucket tetap hidup di volume, dan tetap harus tersaji —
   * termasuk di undangan yang sudah disebar ke ratusan tamu.
   */
  private async read(asset: { key: string; provider: MediaProviderName }): Promise<Buffer> {
    if (!/^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp|mp3)$/u.test(asset.key)) throw new BadRequestException('Media tersimpan tidak valid');
    try { return await storageForAsset(asset.provider).get(asset.key); } catch { throw new BadRequestException('Berkas media tidak tersedia'); }
  }
}

function kindEnum(kind: MediaKind): 'IMAGE' | 'AUDIO' | 'ORNAMENT' { return kind === 'image' ? 'IMAGE' : kind === 'audio' ? 'AUDIO' : 'ORNAMENT'; }
function extensionFor(contentType: string): string { return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/mpeg': '.mp3' } as Record<string, string>)[contentType] ?? ''; }
function hasMatchingSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return buffer.length >= 3 && (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] ?? 0) >= 0xe0));
}
