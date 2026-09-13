import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './common/common.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { GuestsModule } from './guests/guests.module.js';
import { PublicModule } from './public/public.module.js';
import { RsvpModule } from './rsvp/rsvp.module.js';
import { MediaModule } from './media/media.module.js';
import { HealthController } from './health.controller.js';
import { ImportsModule } from './imports/imports.module.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, CommonModule, IdentityModule, InvitationsModule, CatalogModule, PaymentsModule, GuestsModule, ImportsModule, PublicModule, RsvpModule, MediaModule], controllers: [HealthController] })
export class AppModule {}
