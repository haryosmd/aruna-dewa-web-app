import ExcelJS from 'exceljs';
import { safeSpreadsheetCell } from '@aruna/contracts';

/*
 * Template daftar tamu (fase 75), dibangkitkan `exceljs` yang memang sudah dipakai `import-parser`.
 *
 * Bentuknya **sengaja meniru lembar kerja pemilik**, bukan CSV telanjang: spanduk judul, baris
 * petunjuk, satu kolom kiri kosong sebagai margin, header di tengah berkas, lalu baris contoh.
 * Itu bentuk yang benar-benar dipakai orang untuk mendata tamu — ada ringkasan, ada dropdown, ada
 * warna — dan menuntut mereka merapikannya dulu sebelum impor adalah cara membuat fiturnya tidak
 * terpakai.
 *
 * Konsekuensinya berpasangan: template ini hanya berguna kalau `parseGuestText` tahan terhadap
 * bentuk seperti ini. Karena itu ia juga jadi **fixture** parser tersebut — tes menghasilkan
 * template ini lalu memasukkannya kembali, sehingga kedua sisinya tidak bisa menyimpang diam-diam.
 */

/** Judul kolom PERSIS seperti yang dibaca `parseGuestText`. Mengubahnya di sini saja akan memutus impor. */
export const guestTemplateHeader = ['No.', 'Nama', 'Nomor WA', 'Kategori', 'Dari', 'Orang', 'Anak', 'Jenis undangan', 'Status', 'Catatan'];

/** Baris data pertama pada berkas yang dihasilkan — dipakai petunjuk di dalam berkasnya sendiri. */
export const guestTemplateFirstDataRow = 12;

const contoh: (string | number)[][] = [
  ['dr. Yosi Susanti, Sp.OG', '081234567890', 'Keluarga', 'Mempelai wanita', 2, '', 'Digital', '', 'Vegetarian'],
  ['Budi Santoso', '+62 812 9876 5432', 'Teman CPP', 'Mempelai pria', 1, '', 'Cetak', '', ''],
  ['Keluarga Bapak Hartono', '0857 1111 2222', 'Rekan kerja', 'Keduanya', 4, 2, 'Digital', '', 'Bawa dua anak'],
];

const pilihanKategori = ['Keluarga', 'Teman CPP', 'Teman CPW', 'Rekan kerja', 'Tetangga', 'Lainnya'];
const pilihanDari = ['Mempelai pria', 'Mempelai wanita', 'Keduanya'];
const pilihanJenis = ['Digital', 'Cetak', 'Belum dikirim'];

/**
 * `kategori` diisi dari kategori yang SUDAH dipakai undangan ini, bukan daftar generik: itu bedanya
 * template yang cocok dengan pernikahan mereka dengan template contoh.
 */
export async function buildGuestTemplate(kategori: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aruna Dewa';
  const sheet = workbook.addWorksheet('Daftar Tamu');

  // Kolom A sengaja sempit dan kosong — margin, persis seperti lembar pemilik. Parser membuangnya.
  sheet.columns = [{ width: 3 }, { width: 28 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 8 }, { width: 7 }, { width: 16 }, { width: 14 }, { width: 28 }];

  /*
   * `safeSpreadsheetCell` TIDAK dipakai di sini, dan itu disengaja: isi yang ditulis baris ini
   * literal milik kita sendiri, dan membubuhkan apostrof pada `+62 812…` justru merusak contoh
   * nomor yang ingin kita tunjukkan. Penangkal rumus dipasang di satu-satunya tempat yang memuat
   * data pemilik — daftar kategori di sheet "Pilihan" di bawah.
   */
  const tulis = (baris: number, nilai: (string | number)[], mulai = 2) => {
    nilai.forEach((v, i) => { sheet.getCell(baris, mulai + i).value = v; });
  };

  sheet.mergeCells(2, 2, 2, 11);
  sheet.getCell(2, 2).value = 'DAFTAR TAMU UNDANGAN';
  sheet.getCell(2, 2).font = { bold: true, size: 14 };

  sheet.mergeCells(3, 2, 3, 11);
  sheet.getCell(3, 2).value = 'Isi mulai baris 12. Baris di atasnya petunjuk, dan boleh dibiarkan — pengimpor melewatinya sendiri.';

  sheet.mergeCells(5, 2, 5, 11);
  sheet.getCell(5, 2).value = 'CARA PAKAI';
  sheet.getCell(5, 2).font = { bold: true };
  const petunjuk = [
    'Nama wajib diisi. Kolom lain boleh kosong — termasuk Anak, yang murni pendataan.',
    'Nomor WA boleh 0812… atau +62 812…; keduanya dibaca sama.',
    'Orang = jumlah orang dewasa dalam satu undangan (1–20). Kosong dibaca 1.',
    'Status tidak ikut terimpor: aplikasi menghitungnya sendiri dari kiriman WA dan RSVP.',
    'Simpan sebagai .xlsx atau .csv, lalu unggah lewat tombol "Import Excel / CSV".',
  ];
  petunjuk.forEach((baris, i) => { sheet.mergeCells(6 + i, 2, 6 + i, 11); sheet.getCell(6 + i, 2).value = `• ${baris}`; });

  const barisHeader = guestTemplateFirstDataRow - 1;
  tulis(barisHeader, guestTemplateHeader);
  sheet.getRow(barisHeader).font = { bold: true };

  contoh.forEach((baris, i) => tulis(guestTemplateFirstDataRow + i, ['', ...baris]));

  const lists = workbook.addWorksheet('Pilihan');
  lists.getCell(1, 1).value = 'Kategori';
  lists.getCell(1, 2).value = 'Dari';
  lists.getCell(1, 3).value = 'Jenis undangan';
  // Kategori yang sudah dipakai undangan ini didahulukan, lalu contoh yang belum ada.
  const kategoriAkhir = [...new Set([...kategori, ...pilihanKategori].map((v) => v.trim()).filter(Boolean))].slice(0, 100);
  kategoriAkhir.forEach((v, i) => { lists.getCell(2 + i, 1).value = safeSpreadsheetCell(v); });
  pilihanDari.forEach((v, i) => { lists.getCell(2 + i, 2).value = v; });
  pilihanJenis.forEach((v, i) => { lists.getCell(2 + i, 3).value = v; });

  // Dropdown pada 300 baris data. `allowBlank` selalu true — tidak ada kolom di sini yang wajib.
  const sampai = guestTemplateFirstDataRow + 299;
  const pasangDropdown = (kolom: number, formula: string) => {
    for (let baris = guestTemplateFirstDataRow; baris <= sampai; baris += 1) {
      sheet.getCell(baris, kolom).dataValidation = { type: 'list', allowBlank: true, formulae: [formula] };
    }
  };
  pasangDropdown(5, `=Pilihan!$A$2:$A$${1 + kategoriAkhir.length}`);
  pasangDropdown(6, `=Pilihan!$B$2:$B$${1 + pilihanDari.length}`);
  pasangDropdown(9, `=Pilihan!$C$2:$C$${1 + pilihanJenis.length}`);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
