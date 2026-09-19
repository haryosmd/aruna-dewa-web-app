import { describe, expect, it } from 'vitest';

import { intakeOrnament, probePng, probeWebp } from '../../src/media/ornament-intake';

/**
 * Pemeriksaan ornamen unggahan (fase 69), dengan fixture yang dirakit byte demi byte — bukan
 * berkas di disk — supaya tiap kasus jelas menguji header apa.
 */
function png(width: number, height: number, colourType: number, extra: Buffer[] = []): Buffer {
  const chunk = (type: string, data: Buffer) => Buffer.concat([u32(data.length), Buffer.from(type, 'ascii'), data, Buffer.alloc(4)]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = colourType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), ...extra, chunk('IDAT', Buffer.alloc(16)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const trns = () => Buffer.concat([u32(1), Buffer.from('tRNS', 'ascii'), Buffer.from([0]), Buffer.alloc(4)]);

function webpVp8x(width: number, height: number, alpha: boolean): Buffer {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'ascii'); b.writeUInt32LE(32, 4); b.write('WEBP', 8, 'ascii'); b.write('VP8X', 12, 'ascii');
  b.writeUInt32LE(10, 16); b[20] = alpha ? 0x10 : 0;
  b.writeUIntLE(width - 1, 24, 3); b.writeUIntLE(height - 1, 27, 3);
  return b;
}
function webpVp8l(width: number, height: number, alpha: boolean): Buffer {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'ascii'); b.write('WEBP', 8, 'ascii'); b.write('VP8L', 12, 'ascii');
  b[20] = 0x2f;
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14) | ((alpha ? 1 : 0) << 28);
  b.writeUInt32LE(bits >>> 0, 21);
  return b;
}
function webpVp8(): Buffer {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'ascii'); b.write('WEBP', 8, 'ascii'); b.write('VP8 ', 12, 'ascii');
  b.writeUInt16LE(320, 26); b.writeUInt16LE(200, 28);
  return b;
}

describe('probe PNG', () => {
  it('membaca dimensi dan alpha untuk RGBA dan abu+alpha', () => {
    expect(probePng(png(640, 480, 6))).toEqual({ width: 640, height: 480, alpha: true });
    expect(probePng(png(64, 64, 4))).toEqual({ width: 64, height: 64, alpha: true });
  });
  it('palet transparan hanya bila ada tRNS; RGB dan abu tidak punya alpha', () => {
    expect(probePng(png(32, 32, 3))!.alpha).toBe(false);
    expect(probePng(png(32, 32, 3, [trns()]))!.alpha).toBe(true);
    expect(probePng(png(32, 32, 2))!.alpha).toBe(false);
    expect(probePng(png(32, 32, 0))!.alpha).toBe(false);
  });
  it('menolak yang bukan PNG', () => {
    expect(probePng(Buffer.from('bukan png sama sekali, panjangnya cukup untuk dibaca header'))).toBeNull();
  });
});

describe('probe WebP', () => {
  it('VP8X membaca bendera alpha dan kanvas', () => {
    expect(probeWebp(webpVp8x(1200, 800, true))).toEqual({ width: 1200, height: 800, alpha: true });
    expect(probeWebp(webpVp8x(1200, 800, false))!.alpha).toBe(false);
  });
  it('VP8L membaca 14-bit dimensi dan bit alpha', () => {
    expect(probeWebp(webpVp8l(300, 150, true))).toEqual({ width: 300, height: 150, alpha: true });
    expect(probeWebp(webpVp8l(300, 150, false))!.alpha).toBe(false);
  });
  it('VP8 lossy polos tidak pernah punya alpha', () => {
    expect(probeWebp(webpVp8())!.alpha).toBe(false);
  });
});

describe('intakeOrnament', () => {
  it('menerima raster transparan dan mengembalikan dimensinya', () => {
    const buf = png(200, 100, 6);
    expect(intakeOrnament(buf, 'image/png', buf.length)).toEqual({ contentType: 'image/png', width: 200, height: 100 });
  });
  it('menolak JPEG, SVG, raster tanpa alpha, berkas kebesaran, dan dimensi ekstrem', () => {
    const buf = png(200, 100, 6);
    expect(() => intakeOrnament(buf, 'image/jpeg', buf.length)).toThrow(/PNG atau WebP/);
    expect(() => intakeOrnament(buf, 'image/svg+xml', buf.length)).toThrow(/PNG atau WebP/);
    expect(() => intakeOrnament(png(200, 100, 2), 'image/png', 100)).toThrow(/transparan/);
    expect(() => intakeOrnament(buf, 'image/png', 300 * 1024 + 1)).toThrow(/maksimal/);
    expect(() => intakeOrnament(png(8, 8, 6), 'image/png', 100)).toThrow(/16 dan 4096/);
    expect(() => intakeOrnament(webpVp8x(5000, 100, true), 'image/webp', 100)).toThrow(/16 dan 4096/);
  });
  it('menolak isi yang tidak cocok dengan MIME yang diklaim', () => {
    expect(() => intakeOrnament(webpVp8x(100, 100, true), 'image/png', 100)).toThrow(/tidak cocok/);
  });
});
