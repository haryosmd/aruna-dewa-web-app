import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { RsvpController } from './rsvp.controller.js';
import { RsvpService } from './rsvp.service.js';
@Module({ imports: [CommonModule], controllers: [RsvpController], providers: [RsvpService] }) export class RsvpModule {}
