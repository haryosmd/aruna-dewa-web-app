import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { BackofficeController } from './backoffice.controller.js';
import { BackofficeService } from './backoffice.service.js';

@Module({ imports: [CommonModule], controllers: [BackofficeController], providers: [BackofficeService] })
export class BackofficeModule {}
