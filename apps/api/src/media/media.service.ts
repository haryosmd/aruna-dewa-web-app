import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { MembershipService } from '../common/membership.service.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { createMediaStorage } from './storage.js';
import { publicDocument } from '../invitations/document-validation.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg']);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipService) {}
  async upload(user: AuthenticatedUser, invitationId: string, file: Express.Multer.File) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (!file || !allowedTypes.has(file.mimetype)) throw new BadRequestException('Jenis media harus JPEG, PNG, WebP, atau MP3');
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new BadRequestException('Ukuran media maksimal 20 MB');
    if (!hasMatchingSignature(file.buffer, file.mimetype)) throw new BadRequestException('Isi berkas tidak cocok dengan jenis media yang diklaim');
    if (file.mimetype.startsWith('image/')) {
      const photoCount = await this.prisma.mediaAsset.count({ where: { invitationId, contentType: { startsWith: 'image/' } } });
      if (photoCount >= 15) throw new BadRequestException('Batas awal galeri adalah 15 foto');
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
    const asset = await this.prisma.mediaAsset.create({ data: { invitationId, provider: (process.env.MEDIA_PROVIDER ?? 'local') === 's3' ? 'S3' : 'LOCAL', key, contentType: file.mimetype, bytes: file.size, originalName: file.originalname } });
    const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
    return { ...asset, draftUrl: `${apiOrigin}/v1/media/${asset.id}`, publicUrl: `${apiOrigin}/v1/public/media/${asset.id}` };
  }

  async readForMember(user: AuthenticatedUser, assetId: string): Promise<{ contentType: string; body: Buffer }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new BadRequestException('Media tidak ditemukan');
    await this.memberships.requireInvitationRole(user, asset.invitationId);
    return { contentType: asset.contentType, body: await this.read(asset.key) };
  }

  async readForPublic(assetId: string): Promise<{ contentType: string; body: Buffer }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, include: { invitation: { include: { activeRevision: true } } } });
    if (!asset?.invitation.activeRevision || asset.invitation.status !== 'PUBLISHED') throw new BadRequestException('Media publik tidak ditemukan');
    const publicUrl = `${process.env.API_ORIGIN ?? 'http://127.0.0.1:3001'}/v1/public/media/${asset.id}`;
    if (!JSON.stringify(publicDocument(asset.invitation.activeRevision.document as never)).includes(publicUrl)) throw new BadRequestException('Media belum dipakai pada undangan publik');
    return { contentType: asset.contentType, body: await this.read(asset.key) };
  }

  private async read(key: string): Promise<Buffer> {
    if (!/^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp|mp3)$/u.test(key)) throw new BadRequestException('Media tersimpan tidak valid');
    try { return await createMediaStorage().get(key); } catch { throw new BadRequestException('Berkas media tidak tersedia'); }
  }
}

function extensionFor(contentType: string): string { return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'audio/mpeg': '.mp3' } as Record<string, string>)[contentType] ?? ''; }
function hasMatchingSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return buffer.length >= 3 && (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] ?? 0) >= 0xe0));
}
