import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { createInvitationBodySchema, restoreRevisionBodySchema, saveDraftBodySchema, updateShareSettingsBodySchema, type CreateInvitationBody, type RestoreRevisionBody, type SaveDraftBody, type UpdateShareSettingsBody } from '@aruna/contracts/api';
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
  @Get(':id/revisions') listRevisions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.listRevisions(user, id); }
  @Post(':id/revisions/restore') @UseGuards(OriginGuard) restoreRevision(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body(zodBody(restoreRevisionBodySchema)) body: RestoreRevisionBody) { return this.invitations.restoreRevision(user, id, body.revision, body.draftRevision); }
  @Post(':id/publish') @UseGuards(OriginGuard) publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.publish(user, id); }
  /*
   * Siklus hidup (fase 78). Satu set endpoint, dipakai dua permukaan — dasbor pasangan dan
   * backoffice operator — supaya `requireInvitationRole` dan sapuan aset tidak punya salinan
   * kedua yang bisa melenceng. Siapa boleh apa diputuskan di service, bukan di sini.
   */
  @Post(':id/unpublish') @UseGuards(OriginGuard) unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.unpublish(user, id); }
  @Post(':id/archive') @UseGuards(OriginGuard) archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.archive(user, id); }
  @Post(':id/restore') @UseGuards(OriginGuard) restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.restore(user, id); }
  @Delete(':id') @UseGuards(OriginGuard) remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.remove(user, id); }
  @Patch(':id/share-settings') @UseGuards(OriginGuard) updateShareSettings(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body(zodBody(updateShareSettingsBodySchema)) body: UpdateShareSettingsBody) { return this.invitations.updateShareSettings(user, id, body); }
}
