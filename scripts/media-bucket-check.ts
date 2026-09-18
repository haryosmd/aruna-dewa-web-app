/**
 * Membuktikan bucket media sebelum satu baris konfigurasi produksi disentuh.
 *
 *   pnpm media:check
 *
 * Dijalankan dari laptop, membaca `apps/api/.env`. Ia sengaja memakai `storage.ts` yang sama
 * dengan API — bukan `aws s3api`, bukan curl bertanda tangan sendiri. Yang perlu dibuktikan
 * bukan "bucketnya menjawab perintah S3", melainkan "kode yang akan berjalan di produksi bisa
 * memakainya", dan dua hal itu pernah berbeda: `forcePathStyle`, gaya endpoint, dan pemilihan
 * region semuanya hidup di klien, bukan di protokolnya.
 *
 * Satu pemeriksaan di sini tidak punya padanan di tes mana pun, dan justru itu yang paling
 * mahal kalau salah: **bucket tidak boleh bisa dibaca anonim**. Seluruh kontrol akses media —
 * draf yang privat, foto publik hanya setelah `servesAsset()` membenarkan — hidup di API. Bucket
 * yang publik membuat semuanya jadi hiasan, dan tidak ada gerbang lain yang akan melihatnya.
 */
import { randomUUID } from 'node:crypto';
import { S3MediaStorage, s3ConfigFromEnvironment } from '../apps/api/src/media/storage.js';
import type { S3StorageConfig } from '../apps/api/src/media/storage.js';

const tanda = { ok: '  lulus  ', gagal: '  GAGAL  ', catat: '  catat  ' };
let gagal = 0;

/**
 * SDK memetakan jawaban galat yang tidak dikenalinya jadi `UnknownError`, dan `HeadBucket` memang
 * tidak punya badan jawaban sama sekali — jadi pesan bawaannya benar-benar nol informasi. Padahal
 * kode HTTP-nya sudah menjawab pertanyaannya: 404 berarti bucketnya belum dibuat, 403 berarti
 * kuncinya, 400 hampir selalu region. Menyembunyikan itu di balik satu kata membuat orang menebak
 * di antara tiga sebab yang penanganannya sama sekali berbeda.
 */
function jelaskan(error: unknown): string {
  const e = error as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const status = e?.$metadata?.httpStatusCode;
  const kode = e?.Code ?? (e?.name && e.name !== 'UnknownError' ? e.name : undefined);
  const petunjuk =
    status === 404 ? 'bucket ini belum dibuat di konsol IDCloudHost'
    : status === 403 ? 'kredensial ditolak — periksa S3_ACCESS_KEY_ID dan S3_SECRET_ACCESS_KEY'
    : status === 400 ? 'permintaan ditolak — tersangka pertama S3_REGION'
    : status === 301 || status === 307 ? 'endpoint atau region salah; bucket ada di wilayah lain'
    : status === undefined ? `tidak ada jawaban HTTP — endpoint tidak bisa dihubungi (${e?.message ?? 'tanpa keterangan'})`
    : e?.message ?? '';
  return [kode, status ? `HTTP ${status}` : '', petunjuk].filter(Boolean).join(' · ');
}

function lapor(status: keyof typeof tanda, judul: string, keterangan = ''): void {
  if (status === 'gagal') gagal += 1;
  console.log(`${tanda[status]}${judul}${keterangan ? ` — ${keterangan}` : ''}`);
}

async function coba(judul: string, jalan: () => Promise<string | void>): Promise<boolean> {
  try {
    lapor('ok', judul, (await jalan()) || '');
    return true;
  } catch (error) {
    lapor('gagal', judul, jelaskan(error));
    return false;
  }
}

// Dibaca lewat gerbang yang sama dengan boot API, tapi kegagalannya dijelaskan — ini perintah
// pertama yang dijalankan orang saat menyiapkan bucket, dan stack trace di sini hanya menyembunyikan
// jawabannya, yang selalu "isi dulu di apps/api/.env".
function bacaKonfigurasi(): S3StorageConfig {
  try {
    return s3ConfigFromEnvironment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\nIsi S3_* di apps/api/.env lebih dulu. Contohnya ada di apps/api/.env.example.');
    process.exit(1);
  }
}

const config = bacaKonfigurasi();

/*
 * Kredensial yang bentuknya jelas bukan kredensial dihentikan di sini, bukan dibiarkan berangkat
 * jadi 403 yang terbaca seperti "kuncinya dicabut". Keduanya sudah benar-benar terjadi saat
 * menyiapkan bucket ini: yang tertempel sekali adalah perintah shell, sekali lagi adalah baris
 * `S3_ENDPOINT=...` — dan tidak ada satu pun pesan yang menyebutnya.
 */
const salahTempel = [
  [config.secretAccessKey === '', 'S3_SECRET_ACCESS_KEY masih kosong'],
  [/^S3_[A-Z_]+=/u.test(config.secretAccessKey), 'S3_SECRET_ACCESS_KEY berisi baris env, bukan nilainya — tempel yang sesudah tanda ='],
  [config.secretAccessKey.includes('://'), 'S3_SECRET_ACCESS_KEY berisi URL, bukan kunci'],
  [config.secretAccessKey !== config.secretAccessKey.trim(), 'S3_SECRET_ACCESS_KEY punya spasi di ujung'],
].filter(([salah]) => salah).map(([, pesan]) => pesan as string);

if (salahTempel.length) {
  for (const pesan of salahTempel) lapor('gagal', pesan);
  console.error('\nPerbaiki apps/api/.env lebih dulu. Tidak ada permintaan yang dikirim.');
  process.exit(1);
}
console.log(`Bucket   : ${config.bucket}`);
console.log(`Endpoint : ${config.endpoint}  (region ${config.region}, path-style ${config.forcePathStyle})`);
console.log();

const storage = new S3MediaStorage(config);
// Berprefiks `.probe/` supaya objek yang tertinggal — kalau skrip ini mati di tengah — tidak
// pernah tertukar dengan kunci media sungguhan, yang selalu `<uuid undangan>/<uuid>.<ext>`.
const key = `.probe/${randomUUID()}.bin`;
const isi = Buffer.from(`aruna media check ${new Date().toISOString()}`);

await coba('HeadBucket — bucket ada dan kredensial ini boleh menyentuhnya', () => storage.probe());

const tertulis = await coba('PutObject', () => storage.put(key, isi, 'application/octet-stream'));

if (tertulis) {
  await coba('GetObject, dan isinya sama persis dengan yang ditulis', async () => {
    if (!(await storage.get(key)).equals(isi)) throw new Error('isi objek berbeda dari yang ditulis');
  });

  // Path-style vs virtual-host: yang dipakai API adalah nilai `S3_FORCE_PATH_STYLE`, dan get di
  // atas sudah membuktikannya bekerja. Yang diperiksa di sini URL mentahnya, karena itu bentuk
  // yang dipakai pemeriksaan anonim di bawah dan `rclone` di skrip backup.
  const url = `${config.endpoint.replace(/\/$/u, '')}/${config.bucket}/${key}`;
  await coba('bucket menolak pembacaan anonim', async () => {
    const jawaban = await fetch(url).catch((error: unknown) => { throw new Error(`tidak bisa dihubungi: ${String(error)}`); });
    if (jawaban.ok) throw new Error(`BUCKET PUBLIK — ${url} menjawab ${jawaban.status}. Seluruh kontrol akses media ada di API, dan ini membatalkannya.`);
    return `menjawab ${jawaban.status}`;
  });

  /**
   * Penulisan KEDUA atas kunci yang sama. `S3MediaStorage.put` mengirim `If-None-Match: *`,
   * jadi bucket yang menegakkannya harus menolak dengan 412 — dan itulah yang membuat jaminan
   * "kunci media tidak pernah ditimpa" di `ops/backup/backup.sh` benar untuk kedua backend.
   * Bucket yang menerimanya diam-diam melaporkan diri di sini, bukan di hari sebuah foto hilang.
   */
  try {
    await storage.put(key, isi, 'application/octet-stream');
    lapor('catat', 'If-None-Match: * TIDAK ditegakkan', 'penulisan ulang atas kunci yang sudah ada diterima. Jaminan immutability hanya dari randomUUID.');
  } catch (error) {
    // Melempar saja belum berarti ditegakkan: header yang DITOLAK karena tidak didukung juga
    // melempar, dan dua kesimpulan berlawanan itu tidak boleh diambil dari bukti yang sama.
    // Hanya 412 yang berarti "objeknya sudah ada, jadi saya menolak menimpanya".
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 412) lapor('catat', 'If-None-Match: * ditegakkan', `HTTP 412 — aman dipasang di S3MediaStorage.put`);
    else if (status === 400 || status === 501) lapor('catat', 'If-None-Match: * TIDAK didukung', `${jelaskan(error)} — jaminan immutability hanya dari randomUUID`);
    else lapor('catat', 'If-None-Match: * tidak bisa disimpulkan', `${jelaskan(error)} — jangan sandarkan apa pun pada ini`);
  }

  await coba('DeleteObject, dan objeknya benar-benar hilang', async () => {
    await storage.delete(key);
    await storage.get(key).then(() => { throw new Error('objek masih terbaca setelah dihapus'); }, () => undefined);
  });
}

console.log();
if (gagal) {
  console.error(`${gagal} pemeriksaan gagal. Jangan lanjut ke langkah berikutnya.`);
  process.exit(1);
}
console.log('Semua lulus. Bucket siap dipakai.');
