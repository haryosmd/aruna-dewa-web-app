import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { googleValueToText, rowsToCsv } from './import-parser.js';

export type SelectedGoogleSheet = { spreadsheetId: string; range: string; accessToken: string };

@Injectable()
export class GoogleSheetsClient {
  async selectedRangeToCsv(input: SelectedGoogleSheet): Promise<string> {
    const spreadsheetId = validateSpreadsheetId(input?.spreadsheetId);
    const range = validateRange(input?.range);
    const accessToken = validateAccessToken(input?.accessToken);
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`);
    url.searchParams.set('majorDimension', 'ROWS');
    url.searchParams.set('valueRenderOption', 'FORMULA');

    let response: Response;
    try {
      response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' } });
    } catch {
      throw new ServiceUnavailableException('Google Sheets tidak dapat dihubungi. Coba lagi.');
    }
    if (response.status === 401 || response.status === 403) throw new BadRequestException('Akses Google Sheets tidak tersedia untuk file atau range ini. Hubungkan ulang melalui Google Picker dengan izin drive.file.');
    if (response.status === 404) throw new BadRequestException('Spreadsheet atau range tidak ditemukan.');
    if (!response.ok) throw new ServiceUnavailableException('Google Sheets tidak dapat memuat data saat ini.');

    const payload = await response.json() as { values?: unknown };
    if (!Array.isArray(payload.values) || payload.values.some((row) => !Array.isArray(row))) throw new BadRequestException('Google Sheets tidak mengembalikan baris yang dapat diimpor.');
    return rowsToCsv(payload.values.map((row) => row.map(googleValueToText)));
  }
}

function validateSpreadsheetId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/u.test(value)) throw new BadRequestException('Spreadsheet ID tidak valid');
  return value;
}

function validateRange(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 || /[\r\n]/u.test(value)) throw new BadRequestException('Range Google Sheets tidak valid');
  return value.trim();
}

function validateAccessToken(value: unknown): string {
  if (typeof value !== 'string' || value.length < 20 || value.length > 4096 || /\s/u.test(value)) throw new BadRequestException('Google Sheets membutuhkan access token sementara dari Google Picker.');
  return value;
}
