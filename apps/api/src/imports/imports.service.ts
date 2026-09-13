import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth.js';
import { GuestsService } from '../guests/guests.service.js';
import { GoogleSheetsClient, type SelectedGoogleSheet } from './google-sheets.client.js';
import { parseUploadToCsv, type UploadedImportFile } from './import-parser.js';

@Injectable()
export class ImportsService {
  constructor(private readonly guests: GuestsService, private readonly googleSheets: GoogleSheetsClient) {}

  async previewFile(user: AuthenticatedUser, invitationId: string, file: UploadedImportFile | undefined) {
    if (!file) throw new BadRequestException('Berkas impor wajib diisi pada field file');
    const parsed = await parseUploadToCsv(file);
    const preview = await this.guests.preview(user, invitationId, parsed.csv, 'csv');
    return { ...preview, source: parsed.source };
  }

  async previewGoogleSheet(user: AuthenticatedUser, invitationId: string, selected: SelectedGoogleSheet) {
    const csv = await this.googleSheets.selectedRangeToCsv(selected);
    const preview = await this.guests.preview(user, invitationId, csv, 'csv');
    return { ...preview, source: 'google-sheets' as const };
  }
}
