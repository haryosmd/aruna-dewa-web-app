import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { createGuestBodySchema, importCommitBodySchema, importPreviewBodySchema, updateGuestBodySchema, type CreateGuestBody, type ImportCommitBody, type ImportPreviewBody, type UpdateGuestBody } from '@aruna/contracts/api';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { zodBody } from '../common/zod-validation.pipe.js';
import { GuestsService } from './guests.service.js';

@Controller('v1/invitations/:invitationId')
@UseGuards(JwtAuthGuard)
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}
  @Get('guests') list(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Query() query: Record<string, unknown>) { return this.guests.list(user, invitationId, query); }
  @Post('guests/:guestId/sent') @UseGuards(OriginGuard) markSent(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('guestId') guestId: string) { return this.guests.markSent(user, invitationId, guestId); }
  @Post('guests') @UseGuards(OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Body(zodBody(createGuestBodySchema)) body: CreateGuestBody) { return this.guests.create(user, invitationId, body); }
  @Put('guests/:guestId') @UseGuards(OriginGuard) update(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('guestId') guestId: string, @Body(zodBody(updateGuestBodySchema)) body: UpdateGuestBody) { return this.guests.update(user, invitationId, guestId, body); }
  @Delete('guests/:guestId') @HttpCode(204) @UseGuards(OriginGuard) remove(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('guestId') guestId: string) { return this.guests.remove(user, invitationId, guestId); }
  /*
   * `.xlsx` ditulis sebagai segmen path, bukan ekstensi file: Express 5 tidak bisa memakai `.`
   * sebagai pemisah parameter — jebakan yang sama sudah dibayar `share-card.controller.ts`.
   */
  @Get('guests/template.xlsx')
  @Header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('content-disposition', 'attachment; filename="template-tamu-aruna.xlsx"')
  @Header('cache-control', 'no-store')
  async template(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) {
    return new StreamableFile(await this.guests.template(user, invitationId));
  }

  @Post('imports/preview') @UseGuards(OriginGuard) preview(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Body(zodBody(importPreviewBodySchema)) body: ImportPreviewBody) { return this.guests.preview(user, invitationId, body.text, body.format); }
  @Post('imports/:jobId/commit') @UseGuards(OriginGuard) commit(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('jobId') jobId: string, @Body(zodBody(importCommitBodySchema)) body: ImportCommitBody) { return this.guests.commit(user, invitationId, jobId, body.idempotencyKey); }
}
