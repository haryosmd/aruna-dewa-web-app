/**
 * User agent → satu frasa yang bisa dikenali pemilik akun.
 *
 * Fungsi murni di berkasnya sendiri, seperti `session-rotation.ts` dan `registration.ts`:
 * yang diuji di sini adalah tabel keputusan, dan menariknya lewat Nest hanya menambah
 * perancah tanpa menambah satu pun jaminan.
 *
 * Sengaja kasar. Ini bukan analitik — tidak ada yang dihitung dari hasilnya. Satu-satunya
 * pertanyaan yang harus dijawabnya adalah "ini saya, atau bukan saya?", dan untuk itu
 * "Chrome di Android" sudah cukup sementara "Chrome 131.0.6778.86" justru lebih sulit dibaca.
 */

/** Urutan penting: tiap browser Chromium menyebut dirinya Chrome, dan Chrome menyebut Safari. */
const browsers: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bEdg(?:e|A|iOS)?\//u, 'Edge'],
  [/\bOPR\/|\bOpera\//u, 'Opera'],
  [/\bSamsungBrowser\//u, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//u, 'Firefox'],
  [/\bCriOS\/|\bChrome\//u, 'Chrome'],
  [/\bSafari\//u, 'Safari'],
];

const platforms: ReadonlyArray<readonly [RegExp, string]> = [
  // iPadOS 13+ menyamar sebagai Macintosh dan hanya membedakan dirinya lewat layar sentuh.
  [/\biPad\b/u, 'iPad'],
  [/\biPhone\b/u, 'iPhone'],
  [/\bAndroid\b/u, 'Android'],
  [/\bMac OS X\b|\bMacintosh\b/u, 'macOS'],
  [/\bWindows\b/u, 'Windows'],
  [/\bCrOS\b/u, 'ChromeOS'],
  [/\bLinux\b/u, 'Linux'],
];

const UNKNOWN = 'Perangkat tidak dikenal';

function firstMatch(table: ReadonlyArray<readonly [RegExp, string]>, value: string): string | null {
  for (const [pattern, label] of table) {
    if (pattern.test(value)) return label;
  }
  return null;
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const value = userAgent?.trim() ?? '';
  if (!value) return UNKNOWN;
  const browser = firstMatch(browsers, value);
  const platform = firstMatch(platforms, value);
  if (browser && platform) return `${browser} di ${platform}`;
  // Satu keping saja tetap lebih berguna daripada "tidak dikenal": "Windows" sudah cukup
  // untuk seseorang yang tidak punya satu pun mesin Windows.
  return browser ?? platform ?? UNKNOWN;
}
