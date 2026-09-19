import { BadRequestException } from '@nestjs/common';
import { formatBytes, mediaRules } from '@aruna/contracts';

/**
 * Pemeriksaan ornamen unggahan (fase 69): raster transparan saja.
 *
 * Murni, tanpa `sharp` — API tidak memakainya dan menambah dependensi native untuk membaca
 * dua header bukan harga yang sepadan. Yang dibaca hanya yang dibutuhkan renderer dan
 * pemilih: dimensi (untuk `<img width height>`, aturan CLS di `ReferenceAsset.vue`) dan ada
 * tidaknya kanal alpha — ornamen tanpa latar transparan akan tampil sebagai kotak di atas
 * warna tema, dan pasangan baru menyadarinya sesudah menerbitkan.
 *
 * SVG sengaja tidak diterima di sini; jalur sanitasinya ditunda pemilik ke fase lain.
 */
export interface OrnamentProbe {
  width: number;
  height: number;
  alpha: boolean;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function probePng(buffer: Buffer): OrnamentProbe | null {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colourType = buffer[25];
  // 4 = abu+alpha, 6 = RGBA; 3 = palet, transparan hanya bila ada chunk tRNS; 0/2 tidak punya alpha.
  let alpha = colourType === 4 || colourType === 6;
  if (colourType === 3) alpha = punyaChunk(buffer, 'tRNS');
  return { width, height, alpha };
}

/** Menyusuri chunk PNG sampai IDAT; tRNS wajib berada sebelumnya menurut spesifikasi. */
function punyaChunk(buffer: Buffer, nama: string): boolean {
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const panjang = buffer.readUInt32BE(offset);
    const jenis = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (jenis === nama) return true;
    if (jenis === 'IDAT' || jenis === 'IEND') return false;
    offset += 12 + panjang;
  }
  return false;
}

export function probeWebp(buffer: Buffer): OrnamentProbe | null {
  if (buffer.length < 30 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return null;
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    // Bendera di byte 20; bit 4 = alpha. Kanvas 24-bit little-endian, minus satu.
    const alpha = (buffer[20]! & 0x10) !== 0;
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height, alpha };
  }
  if (chunk === 'VP8L') {
    // Byte 20 = 0x2f, lalu 14 bit lebar, 14 bit tinggi, 1 bit alpha.
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >> 14) & 0x3fff);
    const alpha = ((bits >> 28) & 1) === 1;
    return { width, height, alpha };
  }
  if (chunk === 'VP8 ') {
    // WebP lossy sederhana tidak punya kanal alpha sama sekali; dimensinya tetap dibaca untuk pesan.
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height, alpha: false };
  }
  return null;
}

export interface OrnamentIntake {
  contentType: string;
  width: number;
  height: number;
}

/** Melempar `BadRequestException` berbahasa manusia; mengembalikan dimensi untuk disimpan. */
export function intakeOrnament(buffer: Buffer, contentType: string, bytes: number): OrnamentIntake {
  const rules = mediaRules.ornament;
  if (!(rules.mimeTypes as readonly string[]).includes(contentType)) throw new BadRequestException(`Ornamen harus ${rules.label}`);
  if (bytes <= 0 || bytes > rules.maxBytes) throw new BadRequestException(`Ukuran ornamen maksimal ${formatBytes(rules.maxBytes)}`);
  const probe = contentType === 'image/png' ? probePng(buffer) : probeWebp(buffer);
  if (!probe) throw new BadRequestException('Isi berkas tidak cocok dengan jenis ornamen yang diklaim');
  if (!probe.alpha) throw new BadRequestException('Ornamen harus punya latar transparan (PNG/WebP dengan kanal alpha), bukan kotak berwarna.');
  if (probe.width < 16 || probe.height < 16 || probe.width > 4096 || probe.height > 4096) throw new BadRequestException('Ukuran ornamen harus antara 16 dan 4096 piksel per sisi.');
  return { contentType, width: probe.width, height: probe.height };
}
