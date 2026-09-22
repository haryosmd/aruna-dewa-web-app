import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { parseGuestText } from '@aruna/contracts';
import { buildGuestTemplate, guestTemplateHeader } from '../../src/guests/guest-template.js';

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

/*
 * Template dan parser adalah satu pasangan, jadi diuji sebagai satu pasangan.
 *
 * Templatnya sengaja meniru lembar kerja sungguhan — spanduk, petunjuk, kolom kiri kosong, header
 * di baris 11 — dan itu persis bentuk yang dulu membuat impor menghasilkan sampah yang terlihat
 * berhasil. Kalau salah satunya bergeser sendiri, bulatan di bawah ini yang menangkapnya.
 */
describe('template daftar tamu bolak-balik', () => {
  async function templateKeCsv(kategori: string[] = []): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildGuestTemplate(kategori) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0]!;
    const baris: string[] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const sel: string[] = [];
      for (let i = 1; i <= guestTemplateHeader.length + 1; i += 1) {
        const nilai = row.getCell(i).value;
        const teks = nilai === null || nilai === undefined ? '' : String(nilai);
        sel.push(/[",\n]/.test(teks) ? `"${teks.replace(/"/gu, '""')}"` : teks);
      }
      baris.push(sel.join(','));
    });
    return baris.join('\n');
  }

  it('template yang dihasilkan bisa diimpor kembali, dengan ketiga baris contohnya utuh', async () => {
    const rows = parseGuestText(await templateKeCsv(), 'csv');
    expect(rows.map((row) => row.displayName)).toEqual(['dr. Yosi Susanti, Sp.OG', 'Budi Santoso', 'Keluarga Bapak Hartono']);
    expect(rows.flatMap((row) => row.errors)).toEqual([]);
  });

  it('kolomnya sampai dengan ejaan tersimpan, termasuk nomor WhatsApp yang diminta pemilik', async () => {
    const rows = parseGuestText(await templateKeCsv(), 'csv');
    expect(rows[0]).toMatchObject({ phone: '081234567890', group: 'Keluarga', guestFrom: 'wanita', quota: 2, invitationKind: 'digital', notes: 'Vegetarian' });
    expect(rows[2]).toMatchObject({ guestFrom: 'keduanya', quota: 4, childCount: 2 });
    // Dua baris contoh mengosongkan kolom Anak, dan itu tidak boleh jadi galat.
    expect(rows[0]?.childCount).toBeUndefined();
    expect(rows[1]?.childCount).toBeUndefined();
  });

  it('spanduk dan lima baris petunjuknya dilewati, bukan dibaca sebagai tamu', async () => {
    const rows = parseGuestText(await templateKeCsv(), 'csv');
    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.displayName.includes('CARA PAKAI') || row.displayName.includes('DAFTAR TAMU'))).toBe(false);
  });

  it('dropdown kategori memuat kategori yang sudah dipakai undangan ini lebih dulu', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildGuestTemplate(['Kolega Bank', 'Keluarga']) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const lists = workbook.getWorksheet('Pilihan')!;
    expect(String(lists.getCell(2, 1).value)).toBe('Kolega Bank');
    // "Keluarga" sudah ada di daftar contoh; ia tidak boleh muncul dua kali.
    const semua = [] as string[];
    for (let i = 2; i < 20; i += 1) { const v = lists.getCell(i, 1).value; if (v) semua.push(String(v)); }
    expect(semua.filter((v) => v === 'Keluarga')).toHaveLength(1);
  });
});
