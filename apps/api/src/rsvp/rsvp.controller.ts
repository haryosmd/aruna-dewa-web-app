import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, OriginGuard, type AuthenticatedUser } from '../common/auth.js';
import { RsvpService } from './rsvp.service.js';
@Controller('v1/invitations/:invitationId') @UseGuards(JwtAuthGuard)
export class RsvpController {
  constructor(private readonly rsvp: RsvpService) {}
  @Get('rsvps') listRsvps(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) { return this.rsvp.listRsvps(user, invitationId); }
  @Get('wishes') listWishes(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) { return this.rsvp.listWishes(user, invitationId); }
  @Patch('wishes/:wishId') @UseGuards(OriginGuard) moderate(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string, @Param('wishId') wishId: string, @Body() body: { approved: boolean }) { return this.rsvp.moderateWish(user, invitationId, wishId, body.approved === true); }
}
