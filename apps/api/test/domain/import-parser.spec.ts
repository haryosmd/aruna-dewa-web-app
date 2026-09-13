import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

type Parser = {
  parseUploadToCsv(file: { buffer: Buffer; originalname?: string; mimetype?: string }): Promise<{ source: 'csv' | 'xlsx'; csv: string }>;
  rowsToCsv(rows: unknown[][]): string;
};

async function parser(): Promise<Parser | undefined> {
  return import('../../src/imports/import-parser.js').catch(() => undefined) as Promise<Parser | undefined>;
}

describe('spreadsheet import parser', () => {
  it('preserves Unicode and leading-zero phone values from CSV', async () => {
    const subject = await parser();
    expect(subject?.parseUploadToCsv).toBeTypeOf('function');

    const parsed = await subject!.parseUploadToCsv({
      originalname: 'tamu.csv',
      mimetype: 'text/csv',
      buffer: Buffer.from('Nama undangan,Telepon\nDrs. Åyu Pratiwi,08123456789\n', 'utf8'),
    });

    expect(parsed).toEqual({ source: 'csv', csv: 'Nama undangan,Telepon\nDrs. Åyu Pratiwi,08123456789\n' });
  });

  it('does not use an XLSX formula result as imported text', async () => {
    const subject = await parser();
    expect(subject?.parseUploadToCsv).toBeTypeOf('function');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tamu');
    sheet.addRow(['Nama undangan', 'Telepon']);
    sheet.addRow(['Yosi Susanti', '08123456789']);
    sheet.getCell('A3').value = { formula: 'CONCAT("Tidak", " dipakai")', result: 'Tidak dipakai' };
    sheet.getCell('B3').value = { formula: '1+1', result: 2 };

    const parsed = await subject!.parseUploadToCsv({ originalname: 'tamu.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });

    expect(parsed.source).toBe('xlsx');
    expect(parsed.csv).toContain('Yosi Susanti,08123456789');
    expect(parsed.csv).not.toContain('Tidak dipakai');
    expect(parsed.csv).not.toContain(',2');
  });

  it('rejects a malformed XLSX upload', async () => {
    const subject = await parser();
    expect(subject?.parseUploadToCsv).toBeTypeOf('function');

    await expect(subject!.parseUploadToCsv({ originalname: 'rusak.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('not-an-xlsx') })).rejects.toThrow('Berkas XLSX');
  });
});
