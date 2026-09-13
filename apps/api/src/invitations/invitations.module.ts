import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';

@Module({ imports: [CommonModule], controllers: [InvitationsController], providers: [InvitationsService], exports: [InvitationsService] })
export class InvitationsModule {}
