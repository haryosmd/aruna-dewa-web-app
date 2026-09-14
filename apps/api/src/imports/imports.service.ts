import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipService } from '../common/membership.service.js';
import type { AuthenticatedUser } from '../common/auth.js';
import { GuestsService } from '../guests/guests.service.js';
import { GoogleSheetsClient, type SelectedGoogleSheet } from './google-sheets.client.js';
import { parseUploadToCsv, type UploadedImportFile } from './import-parser.js';

/**
 * Izin diperiksa di baris pertama kedua metode, bukan setelah pekerjaannya selesai.
 *
 * Sebelumnya `previewGoogleSheet` memanggil `selectedRangeToCsv` lebih dulu: user login mana
 * pun — bukan anggota, dengan `invitationId` yang bahkan tidak ada — bisa membuat server ini
 * mengirim permintaan keluar ke `sheets.googleapis.com` memakai bearer token pilihannya.
 * `previewFile` sama bentuknya: XLSX 10 MB di-parse penuh sebelum ada yang bertanya siapa
 * pengirimnya. Pemeriksaan di `GuestsService.preview` memang ada, tapi ia berjalan terlalu
 * telat untuk mencegah keduanya.
 */
@Injectable()
export class ImportsService {
  constructor(private readonly guests: GuestsService, private readonly googleSheets: GoogleSheetsClient, private readonly memberships: MembershipService) {}

  async previewFile(user: AuthenticatedUser, invitationId: string, file: UploadedImportFile | undefined) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    if (!file) throw new BadRequestException('Berkas impor wajib diisi pada field file');
    const parsed = await parseUploadToCsv(file);
    const preview = await this.guests.preview(user, invitationId, parsed.csv, 'csv');
    return { ...preview, source: parsed.source };
  }

  async previewGoogleSheet(user: AuthenticatedUser, invitationId: string, selected: SelectedGoogleSheet) {
    await this.memberships.requireInvitationRole(user, invitationId, 'EDITOR');
    const csv = await this.googleSheets.selectedRangeToCsv(selected);
    const preview = await this.guests.preview(user, invitationId, csv, 'csv');
    return { ...preview, source: 'google-sheets' as const };
  }
}
