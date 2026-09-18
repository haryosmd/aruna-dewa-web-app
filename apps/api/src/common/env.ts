import { cookieDomainProblems } from './cookie-domain.js';
import { mediaEnvProblems } from '../media/storage.js';

/**
 * Satu gerbang konfigurasi, diperiksa sekali saat boot.
 *
 * Sebelumnya `JWT_SECRET` punya nilai cadangan yang tertulis di repo, di dua modul sekaligus,
 * tanpa satu pun pemeriksaan saat menyala. Deploy yang lupa mengirim variabel itu tetap
 * menyala — dan menandatangani access token dengan rahasia yang bisa dibaca siapa saja.
 * Pemeriksaan malasnya sudah ada sejak dulu di `guest-token.ts`, tapi baru meledak saat
 * seseorang menambah tamu pertamanya. Aturannya diangkat ke sini supaya dipakai keduanya.
 */

export type RuntimeEnv = Record<string, string | undefined>;

/**
 * `ConfigModule` baru memuat `.env` setelah aplikasi dibangun, sementara pemeriksaan ini
 * harus berjalan sebelumnya. Dimuat sendiri di sini; nilai yang sudah ada di lingkungan
 * tetap menang, persis seperti perilaku dotenv yang dipakai `ConfigModule`.
 */
export function loadEnvFileIfPresent(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // Tidak ada berkas `.env` adalah keadaan normal di kontainer; variabelnya datang dari orkestrator.
  }
}

/** Nilai cadangan lama. Ditolak secara eksplisit supaya tidak bisa menyelinap balik. */
export const DEVELOPMENT_JWT_SECRET = 'development-only-change-me';

/** Panjang minimum rahasia di produksi; 32 byte adalah ukuran kunci yang kita turunkan darinya. */
export const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Variabel yang tidak punya nilai bawaan yang masuk akal di luar mesin pengembang.
 *
 * Variabel SMTP_* ada di sini sejak Fase 23, dan alasannya sama dengan JWT_SECRET dulu:
 * `mail.service.ts` baru memeriksanya saat email pertama dikirim, sehingga API produksi tanpa
 * SMTP menyala bersih, `/ready` hijau, dan yang menemukan masalahnya adalah pelanggan pertama
 * yang mendaftar — lewat 503 tanpa satu pun alarm. Kegagalan saat deploy jauh lebih murah.
 *
 * SMTP_USER dan SMTP_PASS ikut wajib, bukan hanya SMTP_HOST: `smtpTransportOptions()` hanya
 * menyertakan blok `auth` kalau keduanya terisi, dan tiap relay menuntut AUTH. Separuh terisi
 * gagal dengan cara yang sama persis dengan kosong, tapi terlihat seperti sudah dikonfigurasi.
 *
 * SMTP_PORT menyusul sejak Fase 27, dan ia yang paling mudah luput: satu-satunya variabel SMTP
 * yang punya nilai bawaan (`mail.service.ts` memakai 1025, port Mailpit). Di VPS ini port relay
 * bukan nilai yang bisa ditebak — 25/465/587 di-drop diam-diam oleh jaringan IDCloudHost, jadi
 * satu-satunya yang benar adalah 2587 (`ops/README.md`). Lupa menulisnya berarti boot hijau,
 * `/ready` hijau, dan tiap email menempuh perjalanan ke port yang tidak pernah menjawab.
 *
 * MEDIA_PROVIDER ikut sejak Fase 56, dan alasannya sama dengan TRUST_PROXY: bukan karena tidak
 * punya nilai bawaan yang masuk akal — `local` masuk akal di mesin pengembang — melainkan supaya
 * keputusan di mana foto pelanggan disimpan selalu diambil sadar. Nilai bawaan yang diam berarti
 * satu deploy yang lupa menyebutkannya memindahkan seluruh unggahan berikutnya ke disk container
 * tanpa ada yang memutuskan itu. Nilainya sendiri datang dari `compose.prod.yaml`, bukan `api.env`.
 *
 * GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET ikut di Fase 27, dan alasannya tidak hipotetis:
 * rilis pertama berjalan berhari-hari dengan keduanya kosong di `api.env`. `startGoogle` baru
 * memeriksanya saat ada yang menekan tombolnya, jadi boot hijau, `/ready` hijau — sementara
 * `login.vue` dan `register.vue` merender tombol Google tanpa syarat, dan tiap pengunjung yang
 * menekannya mendarat di 400 berbentuk JSON. Deploy yang menolak menyala jauh lebih murah.
 */
const PRODUCTION_REQUIRED = [
  'DATABASE_URL',
  'WEB_ORIGIN',
  'API_ORIGIN',
  'TRUST_PROXY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MEDIA_PROVIDER',
] as const;

export function isProduction(env: RuntimeEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Alamat bind server HTTP. Bawaannya loopback, dan itu benar di mesin pengembang: `pnpm dev`
 * dan server tes tidak perlu terlihat dari jaringan sekitar.
 *
 * Di dalam container bawaan itu berarti loopback milik container itu sendiri — proxy yang
 * berjalan di container lain tidak akan pernah tersambung, dan gejalanya 502 dari proxy, bukan
 * galat saat boot. Karena itu orkestrator yang menyetelnya: `compose.prod.yaml` menulis
 * `HOST=0.0.0.0` di `environment:` (yang menang atas `env_file:`), bukan menitipkannya ke
 * `api.env` yang hanya ada di satu server.
 */
export function bindHost(env: RuntimeEnv = process.env): string {
  return env.HOST?.trim() || '127.0.0.1';
}

/** Alamat yang hanya bisa dihubungi dari dalam container yang sama. `0.0.0.0` bukan salah satunya. */
export function isLoopbackBind(host: string): boolean {
  const address = host.trim().replace(/^\[|\]$/gu, '');
  return address === 'localhost' || address === '::1' || address.startsWith('127.');
}

/**
 * Daftar keluhan; kosong berarti boleh menyala. Fungsi murni supaya bisa diuji tanpa
 * mengotori `process.env` milik proses tes.
 */
export function runtimeEnvProblems(env: RuntimeEnv): string[] {
  const problems: string[] = [];
  const secret = env.JWT_SECRET?.trim();
  if (!secret) problems.push('JWT_SECRET wajib diisi.');
  else if (secret === DEVELOPMENT_JWT_SECRET) problems.push('JWT_SECRET masih memakai nilai contoh pengembangan.');
  else if (isProduction(env) && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    problems.push(`JWT_SECRET minimal ${MIN_PRODUCTION_SECRET_LENGTH} karakter di produksi.`);
  }
  if (isProduction(env)) {
    for (const key of PRODUCTION_REQUIRED) {
      if (!env[key]?.trim()) problems.push(`${key} wajib diisi saat NODE_ENV=production.`);
    }
  }
  // Sengaja di luar blok produksi: yang menentukan wajib-tidaknya `COOKIE_DOMAIN` adalah host web
  // dan host API yang berbeda, bukan nilai `NODE_ENV`. Staging yang lupa menyetelnya punya
  // kegagalan yang sama persis, dan sebuah nilai yang salah ketik tetap salah di mana pun.
  problems.push(...cookieDomainProblems(env));
  // Sengaja di luar blok produksi, alasan yang sama dengan COOKIE_DOMAIN: yang menentukan
  // wajib-tidaknya `S3_*` adalah `MEDIA_PROVIDER` itu sendiri, bukan `NODE_ENV`. Staging yang
  // menunjuk bucket dengan kunci kosong gagal persis seperti produksi.
  problems.push(...mediaEnvProblems(env));
  return problems;
}

/**
 * Dipanggil paling awal di `bootstrap()`, sebelum `NestFactory.create`. Menolak menyala
 * lebih jujur daripada menyala dengan rahasia yang salah: yang pertama ketahuan di deploy,
 * yang kedua ketahuan setelah ada yang menempa token.
 */
export function assertRuntimeEnv(env: RuntimeEnv = process.env): void {
  const problems = runtimeEnvProblems(env);
  if (problems.length) throw new Error(`Konfigurasi runtime tidak lengkap:\n- ${problems.join('\n- ')}`);
}

/** Rahasia penandatangan, dengan aturan penolakan yang sama seperti saat boot. */
export function requireJwtSecret(env: RuntimeEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  if (!secret || secret === DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET wajib dikonfigurasi dan tidak boleh memakai nilai contoh pengembangan');
  }
  return secret;
}

/**
 * Nilai `trust proxy` untuk Express. Bawaannya mati: menyalakannya tanpa proxy di depan
 * berarti siapa pun boleh mengarang `X-Forwarded-For`, dan tiap limiter per-IP langsung
 * jadi hiasan. Di produksi variabelnya wajib ada supaya keputusan ini selalu diambil sadar.
 *
 * `0`/`false`/kosong → mati. Angka → jumlah hop yang dipercaya (1 untuk satu load balancer).
 * Sisanya diteruskan apa adanya ke Express (`loopback`, `uniquelocal`, daftar CIDR).
 */
export function trustProxySetting(env: RuntimeEnv = process.env): boolean | number | string {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw || raw === 'false' || raw === '0') return false;
  if (raw === 'true') return true;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}
