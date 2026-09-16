import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bindHost, isLoopbackBind } from '../../src/common/env.js';
import { localMediaDirectory } from '../../src/media/storage.js';
import { DEFAULT_HEALTH_PORT } from '../../../worker/src/health.js';

/**
 * Dua nilai yang menentukan apakah rilis hidup atau mati diam-diam, dan keduanya hidup di
 * `compose.prod.yaml`, bukan di kode — jadi `typecheck` dan seluruh tes lain tidak pernah
 * menyentuhnya. Keduanya sudah pernah salah sekali: `HOST` dititipkan ke `api.env` yang tidak
 * terlacak git, dan volume media dipasang di path yang tidak pernah ditulis API.
 *
 * Dibaca sebagai teks, bukan lewat parser YAML: tidak ada parser di dependensi produksi, dan
 * yang perlu dijaga hanya dua baris.
 */
const readService = (file: string, service: string): string => {
  const source = readFileSync(new URL(`../../../../${file}`, import.meta.url), 'utf8');
  const start = source.indexOf(`\n  ${service}:\n`);
  expect(start, `service ${service} tidak ada di ${file}`).toBeGreaterThan(-1);
  const rest = source.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}\S/u);
  return end === -1 ? rest : rest.slice(0, end + 1);
};

const value = (block: string, key: string): string | undefined =>
  block.match(new RegExp(`^\\s*${key}:\\s*'?([^'\\n]+?)'?\\s*$`, 'mu'))?.[1];

describe('container API di compose.prod.yaml', () => {
  const api = readService('compose.prod.yaml', 'api');

  it('bind ke semua antarmuka — bawaan loopback berarti Caddy menjawab 502 dengan log API bersih', () => {
    const host = value(api, 'HOST');
    expect(host).toBe('0.0.0.0');
    expect(isLoopbackBind(host!)).toBe(false);
  });

  it('menulis media ke dalam volume, bukan ke lapisan container yang dibuang tiap rilis', () => {
    const configured = value(api, 'MEDIA_LOCAL_DIR');
    expect(configured, 'MEDIA_LOCAL_DIR wajib absolut: nilai relatif mengikuti cwd, dan cwd-nya /app/apps/api').toMatch(/^\//u);
    const mount = api.match(/-\s*media:([^\s]+)/u)?.[1];
    expect(mount).toBe(configured);
    expect(localMediaDirectory({ MEDIA_LOCAL_DIR: configured }, '/app/apps/api')).toBe(mount);
  });
});

describe('container web di compose.prod.yaml', () => {
  const web = readService('compose.prod.yaml', 'web');

  /*
   * Ketiganya punya nilai cadangan loopback di nuxt.config.ts, dan tidak satu pun menggagalkan
   * boot kalau salah. Situsnya menyala, terlihat benar, dan baru salah saat dipakai — yang
   * terburuk: composables/useGuestLink.ts membangun tautan undangan dari NUXT_PUBLIC_WEB_BASE,
   * jadi nilai loopback berarti pelanggan membagikan http://127.0.0.1:3000/i/... ke tamunya.
   */
  it('mengumumkan asal publik, bukan loopback — tautan undangan dibangun dari nilai ini', () => {
    const webBase = value(web, 'NUXT_PUBLIC_WEB_BASE');
    expect(webBase, 'NUXT_PUBLIC_WEB_BASE wajib ada di environment: compose, bukan dititipkan ke web.env').toBeDefined();
    expect(webBase).toMatch(/^https:\/\//u);
    expect(isLoopbackBind(new URL(webBase!).hostname)).toBe(false);
  });

  it('memanggil API lewat nama service saat render server, lewat alamat publik dari browser', () => {
    // Render server tidak perlu keluar-masuk TLS untuk memanggil container tetangganya;
    // browser tidak bisa menghubungi nama service.
    expect(value(web, 'NUXT_API_BASE')).toBe('http://api:3001/v1');
    expect(value(web, 'NUXT_PUBLIC_API_BASE')).toMatch(/^https:\/\//u);
  });

  it('bind ke semua antarmuka — alasan yang sama dengan API', () => {
    expect(isLoopbackBind(value(web, 'HOST')!)).toBe(false);
  });
});

describe('container worker di compose.prod.yaml', () => {
  const worker = readService('compose.prod.yaml', 'worker');

  it('healthcheck menembak port yang benar-benar didengarkan worker', () => {
    // Port terbelah antara kode dan compose. Kalau menyimpang, worker ditandai unhealthy
    // selamanya walau sehat — dan alarm yang selalu menyala adalah alarm yang diabaikan.
    expect(worker).toContain(`127.0.0.1:${DEFAULT_HEALTH_PORT}`);
    expect(worker).toMatch(new RegExp(`expose:\\s*\\n\\s*-\\s*'?${DEFAULT_HEALTH_PORT}'?`, 'u'));
  });
});

describe('bawaan yang berlaku kalau orkestrator diam', () => {
  it('loopback di mesin pengembang — server tes tidak perlu terlihat dari jaringan sekitar', () => {
    expect(bindHost({})).toBe('127.0.0.1');
    expect(bindHost({ HOST: '  ' })).toBe('127.0.0.1');
    expect(bindHost({ HOST: '0.0.0.0' })).toBe('0.0.0.0');
  });

  it('mengenali alamat yang hanya bisa dihubungi dari dalam container yang sama', () => {
    for (const host of ['127.0.0.1', '127.0.0.53', 'localhost', '::1', '[::1]']) expect(isLoopbackBind(host)).toBe(true);
    for (const host of ['0.0.0.0', '::', '10.0.0.4']) expect(isLoopbackBind(host)).toBe(false);
  });

  it('media lokal jatuh ke .data/media milik cwd, dan hasilnya selalu absolut', () => {
    expect(localMediaDirectory({}, '/app/apps/api')).toBe('/app/apps/api/.data/media');
    expect(localMediaDirectory({ MEDIA_LOCAL_DIR: './.data/media' }, '/app/apps/api')).toBe('/app/apps/api/.data/media');
    expect(localMediaDirectory({ MEDIA_LOCAL_DIR: '/app/.data/media' }, '/app/apps/api')).toBe('/app/.data/media');
  });
});
