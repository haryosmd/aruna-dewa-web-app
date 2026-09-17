import { describe, expect, it } from 'vitest';
import { deviceLabel } from '../../src/identity/device-label.js';

describe('label perangkat', () => {
  it('menamai pasangan browser dan sistem yang lazim', () => {
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')).toBe('Chrome di macOS');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('Safari di iPhone');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36')).toBe('Chrome di Android');
  });

  /**
   * Urutan tabelnya yang diuji di sini, bukan regexnya. Tiap browser Chromium menyebut dirinya
   * Chrome dan Chrome menyebut dirinya Safari, jadi tabel yang diperiksa dari atas ke bawah
   * dengan urutan yang salah menamai **semua** browser "Safari".
   */
  it('tidak tertipu nama browser yang saling menumpang', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0')).toBe('Edge di Windows');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36')).toBe('Samsung Internet di Android');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1')).toBe('Chrome di iPhone');
  });

  /** iPadOS 13+ menyebut dirinya Macintosh; yang membedakannya cuma satu kata di depan. */
  it('membedakan iPad dari Mac', () => {
    expect(deviceLabel('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1')).toBe('Safari di iPad');
  });

  it('memberi keping yang ada ketika hanya satu sisi yang dikenali', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
    expect(deviceLabel('Firefox/131.0')).toBe('Firefox');
  });

  it('menjawab sesuatu untuk user agent kosong, spasi, dan sampah', () => {
    expect(deviceLabel(null)).toBe('Perangkat tidak dikenal');
    expect(deviceLabel('')).toBe('Perangkat tidak dikenal');
    expect(deviceLabel('   ')).toBe('Perangkat tidak dikenal');
    expect(deviceLabel('curl/8.4.0')).toBe('Perangkat tidak dikenal');
  });
});
