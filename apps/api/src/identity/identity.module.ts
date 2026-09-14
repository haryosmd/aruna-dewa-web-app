import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MailService } from './mail.service.js';
import { GoogleController } from './google.controller.js';

@Module({
  imports: [CommonModule],
  controllers: [AuthController, GoogleController],
  providers: [AuthService, MailService],
  exports: [AuthService],
})
export class IdentityModule {}
