import { Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { MediaService } from './media.service.js';
import type { Response } from 'express';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { mediaCachePolicy } from './media-cache-policy.js';
@Controller('v1/invitations/:invitationId/media') @UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @UseGuards(OriginGuard) @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } })) upload(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @UploadedFile() file: Express.Multer.File) { return this.media.upload(user, invitationId, file); }
}

@Controller('v1/media') @UseGuards(JwtAuthGuard)
export class PrivateMediaController {
  constructor(private readonly media: MediaService) {}
  @Get(':assetId') async get(@CurrentUser() user: AuthenticatedUser, @Param('assetId') assetId: string, @Res() response: Response): Promise<void> { const asset = await this.media.readForMember(user, assetId); response.setHeader('Content-Type', asset.contentType).setHeader('Cache-Control', 'private, no-store').send(asset.body); }
}

@Controller('v1/public/media')
export class PublicMediaController {
  constructor(private readonly media: MediaService, private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  @Get(':assetId') async get(@Param('assetId') assetId: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    let isPublishedPublicAsset = true;
    let asset;
    try { asset = await this.media.readForPublic(assetId); }
    catch (publicError) {
      isPublishedPublicAsset = false;
      const token = request.cookies?.aruna_access as string | undefined;
      if (!token) throw publicError;
      try {
        const user = await this.jwt.verifyAsync<AuthenticatedUser>(token);
        const session = await this.prisma.session.findFirst({ where: { id: user.sid, userId: user.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
        if (!session) throw publicError;
        asset = await this.media.readForMember(user, assetId);
      } catch { throw publicError; }
    }
    const cache = mediaCachePolicy(isPublishedPublicAsset);
    response.setHeader('Content-Type', asset.contentType).setHeader('Cache-Control', cache.cacheControl);
    if (cache.vary) response.setHeader('Vary', cache.vary);
    response.send(asset.body);
  }
}
