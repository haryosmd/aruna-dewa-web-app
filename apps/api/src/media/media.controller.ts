import { Controller, Delete, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { maxMediaBytes } from '@aruna/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { liveSessionWhere, CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { MediaService } from './media.service.js';
import type { Response } from 'express';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { throttleLimits } from '../common/throttling.js';
import { mediaCachePolicy } from './media-cache-policy.js';
import { parseRange } from './media-range.js';
@Controller('v1/invitations/:invitationId/media') @UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @UseGuards(OriginGuard) @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxMediaBytes, files: 1 } })) upload(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @UploadedFile() file: Express.Multer.File) { return this.media.upload(user, invitationId, file); }
  @Delete(':assetId') @UseGuards(OriginGuard) remove(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('assetId') assetId: string) { return this.media.remove(user, invitationId, assetId); }
}

@Controller('v1/media') @UseGuards(JwtAuthGuard) @Throttle({ default: throttleLimits.publicMedia })
export class PrivateMediaController {
  constructor(private readonly media: MediaService) {}
  @Get(':assetId') async get(@CurrentUser() user: AuthenticatedUser, @Param('assetId') assetId: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    const asset = await this.media.readForMember(user, assetId);
    response.setHeader('Cache-Control', 'private, no-store');
    sendMedia(request, response, asset.body, asset.contentType);
  }
}

@Controller('v1/public/media') @Throttle({ default: throttleLimits.publicMedia })
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
        const session = await this.prisma.session.findFirst({ where: liveSessionWhere(user), select: { id: true } });
        if (!session) throw publicError;
        asset = await this.media.readForMember(user, assetId);
      } catch { throw publicError; }
    }
    const cache = mediaCachePolicy(isPublishedPublicAsset);
    response.setHeader('Cache-Control', cache.cacheControl);
    if (cache.vary) response.setHeader('Vary', cache.vary);
    sendMedia(request, response, asset.body, asset.contentType);
  }
}

/**
 * Menyajikan aset, dan **melayani `Range`** — tanpa itu WebKit menolak memutar MP3 unggahan
 * pasangan, karena Safari meminta `bytes=0-1` lebih dulu dan tidak menerima `200` berisi
 * seluruh badan sebagai jawabannya. Aturan pembacaannya ada di `media-range.ts`.
 *
 * `Accept-Ranges` dipasang juga pada jawaban utuh: itulah cara klien tahu boleh meminta
 * potongan. Potongannya diakhiri `end()`, bukan `send()`, supaya Express tidak menghitung
 * `ETag` dari badan sebagian — penanda seperti itu menjanjikan berkas yang tidak pernah ada.
 */
function sendMedia(request: Request, response: Response, body: Buffer, contentType: string): void {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Accept-Ranges', 'bytes');

  const range = parseRange(request.headers.range, body.length);
  if (!range) { response.send(body); return; }

  if (range === 'unsatisfiable') {
    response.setHeader('Content-Range', `bytes */${body.length}`);
    response.status(416).end();
    return;
  }

  const slice = body.subarray(range.start, range.end + 1);
  response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${body.length}`);
  response.setHeader('Content-Length', String(slice.length));
  response.status(206).end(slice);
}
