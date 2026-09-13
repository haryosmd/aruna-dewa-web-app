import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service.js';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';

@Controller('v1/invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.invitations.list(user); }
  @Post() @UseGuards(OriginGuard) create(@CurrentUser() user: AuthenticatedUser, @Body() body: { title: string; slug: string; partner1: string; partner2: string; date?: string; venue?: string; address?: string; templateId?: string }) { return this.invitations.create(user, body); }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.get(user, id); }
  @Put(':id/draft') @UseGuards(OriginGuard) saveDraft(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { document: unknown; revision: number }) { return this.invitations.saveDraft(user, id, body.document, body.revision); }
  @Post(':id/publish') @UseGuards(OriginGuard) publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.invitations.publish(user, id); }
}
