import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MailService } from './mail.service.js';
import { GoogleController } from './google.controller.js';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'development-only-change-me' })],
  controllers: [AuthController, GoogleController],
  providers: [AuthService, MailService],
  exports: [AuthService, JwtModule],
})
export class IdentityModule {}
