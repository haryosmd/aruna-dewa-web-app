import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard, OriginGuard } from './auth.js';
import { requireJwtSecret } from './env.js';
import { LegacySessionCookieMiddleware } from './legacy-session-cookie.middleware.js';
import { MembershipService } from './membership.service.js';

/**
 * Satu-satunya tempat rahasia penandatangan dibaca. `IdentityModule` dulu mendaftarkan
 * `JwtModule` keduanya dengan literal cadangannya sendiri — dua sumber yang bisa melenceng
 * tanpa ada yang menyadarinya; sekarang ia mengimpor modul ini.
 */
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: requireJwtSecret() }) })],
  providers: [MembershipService, JwtAuthGuard, OriginGuard, LegacySessionCookieMiddleware],
  exports: [JwtModule, MembershipService, JwtAuthGuard, OriginGuard, LegacySessionCookieMiddleware],
})
export class CommonModule {}
