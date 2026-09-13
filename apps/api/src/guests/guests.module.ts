import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { GuestsController } from './guests.controller.js';
import { GuestsService } from './guests.service.js';
@Module({ imports: [CommonModule], controllers: [GuestsController], providers: [GuestsService], exports: [GuestsService] }) export class GuestsModule {}
