import { describe, expect, it } from 'vitest';
import { parseRange } from '../../src/media/media-range.js';

const size = 1000;

describe('pembacaan header Range', () => {
  it('melayani utuh saat tidak ada permintaan rentang', () => {
    expect(parseRange(undefined, size)).toBeNull();
    expect(parseRange('', size)).toBeNull();
  });

  /** Yang dikirim WebKit lebih dulu untuk membaca header berkas sebelum memutuskan memutar. */
  it('membaca dua byte pertama yang diminta Safari', () => {
    expect(parseRange('bytes=0-1', size)).toEqual({ start: 0, end: 1 });
  });

  it('melengkapi batas akhir yang dikosongkan', () => {
    expect(parseRange('bytes=500-', size)).toEqual({ start: 500, end: 999 });
  });

  it('memotong batas akhir yang melewati ujung berkas', () => {
    expect(parseRange('bytes=900-5000', size)).toEqual({ start: 900, end: 999 });
  });

  it('membaca sufiks sebagai byte terakhir, bukan sebagai posisi awal', () => {
    expect(parseRange('bytes=-200', size)).toEqual({ start: 800, end: 999 });
    // Sufiks yang lebih besar dari berkasnya berarti seluruh berkas, bukan awal negatif.
    expect(parseRange('bytes=-5000', size)).toEqual({ start: 0, end: 999 });
  });

  it('menolak permintaan yang mulai di luar berkas', () => {
    expect(parseRange('bytes=1000-1200', size)).toBe('unsatisfiable');
    expect(parseRange('bytes=-0', size)).toBe('unsatisfiable');
  });

  /*
   * Header rusak bukan alasan menghilangkan berkasnya. RFC 9110 menyebut rentang yang tidak
   * terbaca sebagai rentang yang tidak diminta, jadi jawabannya berkas utuh, bukan 416.
   */
  it('mengabaikan header yang tidak terbaca dan melayani utuh', () => {
    expect(parseRange('bytes=abc-def', size)).toBeNull();
    expect(parseRange('items=0-1', size)).toBeNull();
    expect(parseRange('bytes=', size)).toBeNull();
    expect(parseRange('bytes=-', size)).toBeNull();
    expect(parseRange('bytes=800-500', size)).toBeNull();
  });

  it('melayani multi-range sebagai berkas utuh, bukan multipart', () => {
    expect(parseRange('bytes=0-1,5-6', size)).toBeNull();
  });

  it('tidak pernah menjanjikan potongan dari berkas kosong', () => {
    expect(parseRange('bytes=0-1', 0)).toBeNull();
  });
});
