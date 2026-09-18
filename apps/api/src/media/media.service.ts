import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { allowedMediaTypes, audioAssetLimit, formatBytes, galleryPhotoLimit, mediaKindOf, mediaRules } from '@aruna/contracts';
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
  async upload(user: AuthenticatedUser, invitationId: string, file: Express.Multer.File) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (!file || !allowedMediaTypes.includes(file.mimetype)) throw new BadRequestException('Jenis media harus JPEG, PNG, WebP, atau MP3');
    const kind = mediaKindOf(file.mimetype)!;
    const rules = mediaRules[kind];
    if (file.size <= 0 || file.size > rules.maxBytes) throw new BadRequestException(`Ukuran ${rules.label} maksimal ${formatBytes(rules.maxBytes)}`);
    if (!hasMatchingSignature(file.buffer, file.mimetype)) throw new BadRequestException('Isi berkas tidak cocok dengan jenis media yang diklaim');
    // Batasnya dihitung dari aset yang benar-benar tersimpan, bukan dari isi dokumen — itulah
    // sebabnya menghapus foto wajib ikut menghapus asetnya, kalau tidak kuotanya bocor.
    const kept = await this.prisma.mediaAsset.count({ where: { invitationId, contentType: { startsWith: kind === 'image' ? 'image/' : 'audio/' } } });
    if (kind === 'image' && kept >= galleryPhotoLimit) throw new BadRequestException(`Batas foto per undangan adalah ${galleryPhotoLimit}. Hapus foto yang tidak dipakai lebih dulu.`);
    if (kind === 'audio' && kept >= audioAssetLimit) throw new BadRequestException(`Batas lagu terunggah adalah ${audioAssetLimit}. Hapus lagu lama lebih dulu.`);
    const extension = extensionFor(file.mimetype);
    const key = `${invitationId}/${randomUUID()}${extension}`;
    try { await createMediaStorage().put(key, file.buffer, file.mimetype); }
    catch (error) {
      // Galat S3/filesystem membawa nama bucket, path, dan kadang keterangan kredensial.
      // Semuanya masuk log; yang mengunggah cukup tahu unggahannya belum berhasil.
      this.logger.error(`Media gagal disimpan (${key})`, error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Media tidak dapat disimpan saat ini. Coba lagi beberapa saat lagi.');
    }
    const asset = await this.prisma.mediaAsset.create({ data: { invitationId, provider: (process.env.MEDIA_PROVIDER ?? 'local') === 's3' ? 'S3' : 'LOCAL', key, contentType: file.mimetype, bytes: file.size, originalName: file.originalname } });
    return { ...asset, draftUrl: `${apiOrigin()}/v1/media/${asset.id}`, publicUrl: publicMediaUrl(asset.id) };
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
    if (referencesAsset(asset.invitation.activeRevision?.document, asset.id)) throw new BadRequestException('Foto ini masih dipakai versi yang sudah diterbitkan. Terbitkan ulang undangan tanpa foto itu lebih dulu.');
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

function extensionFor(contentType: string): string { return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/mpeg': '.mp3' } as Record<string, string>)[contentType] ?? ''; }
function hasMatchingSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return buffer.length >= 3 && (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] ?? 0) >= 0xe0));
}
