import { describe, expect, it } from 'vitest';
import { duplicatedSessionCookies, lastCookieValue, readSessionCookie } from '../../src/common/session-cookie.js';

/** Persis yang dikirim browser setelah cakupan cookie berubah: salinan warisan disajikan lebih dulu. */
const terkontaminasi = 'aruna_refresh=LAMA; aruna_access=BARU; aruna_refresh=BARU';

/**
 * Yang dihasilkan `cookie-parser` dari header di atas. Ditulis tangan, bukan diimpor: `cookie`
 * hanya dependensi transitif Express, dan mengangkatnya jadi dependensi langsung demi satu
 * asersi berarti menaruh berkas ini di jalur pembaruan paket yang tidak ada urusannya dengannya.
 * Perilakunya sendiri terkunci di sumbernya — `cookie@0.7.2/index.js:132`, `// only assign once`.
 */
const hasilCookieParser = { aruna_refresh: 'LAMA', aruna_access: 'BARU' };

describe('pembacaan cookie sesi yang tak bergantung urutan', () => {
  it('mengambil kemunculan terakhir, bukan yang pertama seperti cookie-parser', () => {
    // Baris inilah seluruh bug-nya. `cookie.parse` berkomentar `// only assign once` dan
    // memenangkan salinan tertua — yaitu cookie host-only dari sebelum COOKIE_DOMAIN dipasang —
    // lalu API menolaknya sebagai sesi yang sudah dicabut dan memantulkan orangnya ke /login.
    expect(hasilCookieParser.aruna_refresh).toBe('LAMA');
    expect(lastCookieValue(terkontaminasi, 'aruna_refresh')).toBe('BARU');
  });

  it('membaca cookie yang hanya muncul sekali apa adanya', () => {
    expect(lastCookieValue(terkontaminasi, 'aruna_access')).toBe('BARU');
    expect(lastCookieValue('aruna_access=solo', 'aruna_access')).toBe('solo');
  });

  it('menjawab undefined untuk header kosong, tak ada, atau tanpa nama itu', () => {
    expect(lastCookieValue(undefined, 'aruna_refresh')).toBeUndefined();
    expect(lastCookieValue('', 'aruna_refresh')).toBeUndefined();
    expect(lastCookieValue('lain=1; yanglain=2', 'aruna_refresh')).toBeUndefined();
  });

  it('tahan terhadap spasi, titik koma di ujung, dan potongan tanpa tanda sama dengan', () => {
    expect(lastCookieValue('  aruna_refresh = A ;;  aruna_refresh=B ;', 'aruna_refresh')).toBe('B');
    expect(lastCookieValue('rusak; aruna_access=B', 'aruna_access')).toBe('B');
  });

  it('memulihkan nilai yang ter-encode dan melepas tanda kutip, sama seperti cookie-parser', () => {
    expect(lastCookieValue('aruna_oauth_next=%2Fdashboard', 'aruna_oauth_next')).toBe('/dashboard');
    expect(lastCookieValue('aruna_access="dikutip"', 'aruna_access')).toBe('dikutip');
    // Encoding cacat tidak boleh melempar; nilainya diserahkan apa adanya untuk ditolak di hilir.
    expect(lastCookieValue('aruna_access=%E0%A4%A', 'aruna_access')).toBe('%E0%A4%A');
  });

  it('nilai refresh berbentuk `sessionId.token` selamat utuh', () => {
    // Titiknya bermakna — `auth.service.refresh` memecahnya — jadi ia tidak boleh ikut dirapikan.
    const utuh = 'cl9sesi123.aBcDeF-_0123';
    expect(lastCookieValue(`aruna_refresh=usang; aruna_refresh=${utuh}`, 'aruna_refresh')).toBe(utuh);
  });
});

describe('deteksi cookie sesi ganda', () => {
  it('menemukan nama sesi yang muncul lebih dari sekali', () => {
    expect(duplicatedSessionCookies(terkontaminasi)).toEqual(['aruna_refresh']);
    expect(duplicatedSessionCookies('aruna_access=1; aruna_refresh=1; aruna_access=2; aruna_refresh=2'))
      .toEqual(['aruna_access', 'aruna_refresh']);
  });

  it('diam saat setiap nama hanya sekali', () => {
    expect(duplicatedSessionCookies('aruna_access=1; aruna_refresh=2')).toEqual([]);
    expect(duplicatedSessionCookies(undefined)).toEqual([]);
  });

  it('tidak tertipu nama lain yang mirip atau cookie ganda milik orang lain', () => {
    // `aruna_oauth_*` memang ber-Path sendiri dan tidak pernah jadi cookie sesi; nama yang
    // kebetulan berawalan sama juga bukan urusan berkas ini.
    expect(duplicatedSessionCookies('aruna_refreshx=1; aruna_refreshx=2')).toEqual([]);
    expect(duplicatedSessionCookies('aruna_oauth_next=1; aruna_oauth_next=2')).toEqual([]);
    expect(duplicatedSessionCookies('_aruna_refresh=1; _aruna_refresh=2')).toEqual([]);
  });
});

describe('pembacaan dari request', () => {
  it('mengutamakan header mentah daripada hasil cookie-parser', () => {
    const request = { headers: { cookie: terkontaminasi }, cookies: { ...hasilCookieParser } };
    expect(request.cookies.aruna_refresh).toBe('LAMA');
    expect(readSessionCookie(request, 'aruna_refresh')).toBe('BARU');
  });

  it('jatuh ke cookie yang sudah diurai saat header mentahnya tidak ada', () => {
    expect(readSessionCookie({ cookies: { aruna_access: 'X' } }, 'aruna_access')).toBe('X');
    expect(readSessionCookie({}, 'aruna_access')).toBeUndefined();
  });
});
