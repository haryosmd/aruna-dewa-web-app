import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { createInvitationBodySchema, saveDraftBodySchema, type CreateInvitationBody, type SaveDraftBody } from '@aruna/contracts/api';
import { InvitationsService } from './invitations.service.js';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { zodBody } from '../common/zod-validation.pipe.js';

@Controller('v1/invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.invitations.list(user); }
  @Post() @UseGuards(OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Body(zodBody(createInvitationBodySchema)) body: CreateInvitationBody) { return this.invitations.create(user, body); }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.get(user, id); }
  @Put(':id/draft') @UseGuards(OriginGuard) saveDraft(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body(zodBody(saveDraftBodySchema)) body: SaveDraftBody) { return this.invitations.saveDraft(user, id, body.document, body.revision); }
  @Post(':id/publish') @UseGuards(OriginGuard) publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.publish(user, id); }
}
