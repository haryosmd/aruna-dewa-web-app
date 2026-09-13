import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

export type UploadedImportFile = { buffer: Buffer; originalname?: string; mimetype?: string };
export type ParsedUpload = { source: 'csv' | 'xlsx'; csv: string };

export async function parseUploadToCsv(file: UploadedImportFile): Promise<ParsedUpload> {
  if (!file?.buffer?.length) throw new BadRequestException('Berkas impor wajib diisi');
  if (file.buffer.length > MAX_IMPORT_BYTES) throw new BadRequestException('Ukuran berkas maksimal 10 MB');

  const extension = file.originalname?.trim().toLowerCase().split('.').pop();
  if (extension === 'csv') return { source: 'csv', csv: decodeCsv(file.buffer) };
  if (extension === 'xlsx') return { source: 'xlsx', csv: await xlsxToCsv(file.buffer) };
  throw new BadRequestException('Format berkas harus CSV atau XLSX');
}

export function rowsToCsv(rows: unknown[][]): string {
  if (rows.length > MAX_IMPORT_ROWS + 1) throw new BadRequestException('Maksimum 5.000 baris data per impor');
  return rows.map((row) => row.map((value) => quoteCsv(valueToText(value))).join(',')).join('\n') + (rows.length ? '\n' : '');
}

export function googleValueToText(value: unknown): string {
  const text = valueToText(value);
  return text.startsWith('=') ? '' : text;
}

function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new BadRequestException('Berkas CSV harus menggunakan UTF-8');
  }
}

async function xlsxToCsv(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new BadRequestException('Berkas XLSX tidak dapat dibaca');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new BadRequestException('Berkas XLSX tidak memiliki sheet');
  const rows: unknown[][] = [];
  try {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException('Maksimum 5.000 baris data per impor');
      const values: unknown[] = [];
      for (let index = 1; index <= row.cellCount; index += 1) values.push(cellToText(row.getCell(index).value));
      rows.push(values);
    });
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Berkas XLSX tidak dapat dibaca');
  }
  return rowsToCsv(rows);
}

function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('formula' in value) return '';
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((item) => item.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
    return '';
  }
  return String(value);
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function quoteCsv(value: string): string { return /[",\n\r]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value; }
