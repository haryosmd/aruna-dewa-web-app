import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { GuestsService } from './guests.service.js';

@Controller('v1/invitations/:invitationId')
@UseGuards(JwtAuthGuard)
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}
  @Get('guests') list(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Query() query: { q?: string; page?: number; pageSize?: number }) { return this.guests.list(user, invitationId, query); }
  @Post('guests') @UseGuards(OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Body() body: { displayName: string; phone?: string; group?: string; quota?: number }) { return this.guests.create(user, invitationId, body); }
  @Put('guests/:guestId') @UseGuards(OriginGuard) update(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('guestId') guestId: string, @Body() body: { displayName: string; phone?: string; group?: string; quota?: number; revision: number }) { return this.guests.update(user, invitationId, guestId, body); }
  @Delete('guests/:guestId') @HttpCode(204) @UseGuards(OriginGuard) remove(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('guestId') guestId: string) { return this.guests.remove(user, invitationId, guestId); }
  @Post('imports/preview') @UseGuards(OriginGuard) preview(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Body() body: { text: string; format: 'csv' | 'tsv' }) { return this.guests.preview(user, invitationId, body.text, body.format); }
  @Post('imports/:jobId/commit') @UseGuards(OriginGuard) commit(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('jobId') jobId: string, @Body() body: { idempotencyKey: string }) { return this.guests.commit(user, invitationId, jobId, body.idempotencyKey); }
}
