import { describe, expect, it } from 'vitest';
import { safeWebPath } from '../../src/identity/next-path.js';

describe('tujuan setelah login Google', () => {
  it('meneruskan path internal beserta query-nya', () => {
    expect(safeWebPath('/order?package=kisah')).toBe('/order?package=kisah');
  });

  it('menolak tujuan yang meninggalkan aplikasi', () => {
    for (const hostile of ['https://evil.test/phish', '//evil.test', '/\\evil.test', 'order', '', 'javascript:alert(1)']) {
      expect(safeWebPath(hostile)).toBe('/dashboard');
    }
  });

  it('menolak karakter kontrol yang bisa memotong header Location', () => {
    expect(safeWebPath('/dashboard\r\nSet-Cookie: a=b')).toBe('/dashboard');
  });

  it('menolak nilai bukan string dan path yang tak masuk akal panjangnya', () => {
    expect(safeWebPath(undefined)).toBe('/dashboard');
    expect(safeWebPath({ toString: () => '/dashboard' })).toBe('/dashboard');
    expect(safeWebPath(`/${'a'.repeat(600)}`)).toBe('/dashboard');
  });

  it('memakai cadangan yang diminta pemanggil', () => {
    expect(safeWebPath('https://evil.test', '/order')).toBe('/order');
  });
});
