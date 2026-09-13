import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard, OriginGuard } from './auth.js';
import { MembershipService } from './membership.service.js';

@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'development-only-change-me' })], providers: [MembershipService, JwtAuthGuard, OriginGuard], exports: [JwtModule, MembershipService, JwtAuthGuard, OriginGuard] })
export class CommonModule {}
