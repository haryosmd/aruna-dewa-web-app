/**
 * Menyusun ulang header `Cookie` untuk request lanjutan di server.
 *
 * Saat sesi diperpanjang di tengah render SSR, cookie yang dibawa request dari browser
 * sudah usang: request berikutnya dalam render yang sama harus memakai cookie yang baru
 * saja diterbitkan API, bukan yang lama. Nilai lama dengan nama yang sama ditimpa,
 * nilai lain (preferensi, cookie pihak lain) dibiarkan utuh.
 */
export function mergeCookieHeader(current: string | undefined, issued: string[]): string {
  const jar = new Map<string, string>()
  for (const entry of (current ?? '').split(';')) {
    const pair = entry.trim()
    if (pair) jar.set(pair.split('=', 1)[0]!, pair)
  }
  for (const setCookie of issued) {
    // Hanya `nama=nilai` yang dikirim kembali; atribut seperti Path, HttpOnly dan Max-Age
    // adalah instruksi untuk browser, bukan bagian dari header `Cookie`.
    const pair = setCookie.split(';', 1)[0]!.trim()
    if (pair) jar.set(pair.split('=', 1)[0]!, pair)
  }
  return [...jar.values()].join('; ')
}
