import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { createInvitationBodySchema, saveDraftBodySchema, updateShareSettingsBodySchema, type CreateInvitationBody, type SaveDraftBody, type UpdateShareSettingsBody } from '@aruna/contracts/api';
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
  @Patch(':id/share-settings') @UseGuards(OriginGuard) updateShareSettings(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body(zodBody(updateShareSettingsBodySchema)) body: UpdateShareSettingsBody) { return this.invitations.updateShareSettings(user, id, body); }
}
