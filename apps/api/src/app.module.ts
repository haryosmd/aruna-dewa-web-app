import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './common/common.module.js';
import { ApiThrottlerGuard, throttleLimits } from './common/throttling.js';
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
import { MaintenanceModule } from './maintenance/maintenance.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ...throttleLimits.default }] }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    IdentityModule,
    InvitationsModule,
    CatalogModule,
    PaymentsModule,
    GuestsModule,
    ImportsModule,
    PublicModule,
    RsvpModule,
    MediaModule,
    MaintenanceModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ApiThrottlerGuard }],
})
export class AppModule {}
