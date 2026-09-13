import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { GuestsModule } from '../guests/guests.module.js';
import { GoogleSheetsClient } from './google-sheets.client.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({ imports: [CommonModule, GuestsModule], controllers: [ImportsController], providers: [ImportsService, GoogleSheetsClient] })
export class ImportsModule {}
