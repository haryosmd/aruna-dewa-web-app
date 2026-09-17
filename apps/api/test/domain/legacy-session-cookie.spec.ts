import { describe, expect, it } from 'vitest';
import { legacyCookieClearOptions, legacyCookiesToExpire } from '../../src/common/legacy-session-cookie.middleware.js';

const produksi = { WEB_ORIGIN: 'https://arunadewa.id', API_ORIGIN: 'https://api.arunadewa.id', COOKIE_DOMAIN: 'arunadewa.id', NODE_ENV: 'production' };
const lokal = { WEB_ORIGIN: 'http://127.0.0.1:3000', API_ORIGIN: 'http://127.0.0.1:3001' };

const ganda = 'aruna_refresh=LAMA; aruna_access=BARU; aruna_refresh=BARU';

describe('pengusiran cookie sesi warisan', () => {
  it('mengusir nama yang datang dua kali saat cookie sesi ber-Domain', () => {
    expect(legacyCookiesToExpire(ganda, produksi)).toEqual(['aruna_refresh']);
  });

  it('tidak menyentuh apa pun saat tiap nama hanya sekali', () => {
    expect(legacyCookiesToExpire('aruna_access=1; aruna_refresh=2', produksi)).toEqual([]);
    expect(legacyCookiesToExpire(undefined, produksi)).toEqual([]);
  });

  it('diam total selama COOKIE_DOMAIN tidak dipasang', () => {
    // Penjaga yang paling penting di berkas ini. Di mesin pengembang web dan API berbagi satu
    // host, cookie sesinya memang host-only — mengusirnya berarti mengeluarkan orang dari akunnya
    // setiap kali dua tab kebetulan mengirim nama yang sama.
    expect(legacyCookiesToExpire(ganda, lokal)).toEqual([]);
    expect(legacyCookiesToExpire(ganda, { ...produksi, COOKIE_DOMAIN: '   ' })).toEqual([]);
  });

  it('menghapus tanpa Domain, karena yang dituju justru salinan host-only', () => {
    // `clearCookie` hanya cocok kalau Path dan Domain persis sama. Menyertakan `domain` di sini
    // berarti menghapus cookie yang barusan diterbitkan dan membiarkan yang basi hidup terus.
    const options = legacyCookieClearOptions(produksi);
    expect(options).not.toHaveProperty('domain');
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  });

  it('melepas Secure di luar produksi, supaya jalur http lokal tetap bisa membersihkan', () => {
    expect(legacyCookieClearOptions({ ...produksi, NODE_ENV: 'development' })).toMatchObject({ secure: false });
  });
});
