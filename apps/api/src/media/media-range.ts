/**
 * Pembacaan header `Range`, dipisah dari controller supaya bisa diuji sebagai kalimat.
 *
 * Bukan kenyamanan: **WebKit menolak memutar media dari server yang mengabaikan `Range`.**
 * Safari meminta `bytes=0-1` lebih dulu untuk membaca header berkasnya, dan jawaban `200`
 * berisi seluruh badan bukan jawaban atas pertanyaan itu. Aset bawaan kita disajikan Nitro
 * sebagai berkas statis dan sudah menjawab `206` sejak awal; lagu yang **diunggah pasangan**
 * lewat endpoint ini tidak, dan itulah lubangnya.
 *
 * Yang tidak dilayani: multi-range (`bytes=0-1,5-6`). Jawabannya harus `multipart/byteranges`,
 * tidak ada klien media yang membutuhkannya, dan spesifikasi mengizinkan server melayani
 * seluruh berkas sebagai gantinya.
 */
export interface MediaRange {
  start: number;
  end: number;
}

/**
 * `null` → layani utuh (`200`). `'unsatisfiable'` → `416`. Selain itu potongannya.
 *
 * Header yang rusak dikembalikan sebagai `null`, bukan `416`: bagi RFC 9110 rentang yang tidak
 * terbaca adalah rentang yang tidak diminta, dan menolak permintaan gara-gara header aneh
 * membuat berkasnya hilang sama sekali di klien yang sebenarnya sanggup menerima utuh.
 */
export function parseRange(header: string | undefined, size: number): MediaRange | 'unsatisfiable' | null {
  if (!header || size <= 0) return null;

  const [unit, rest] = header.split('=');
  if (unit?.trim().toLowerCase() !== 'bytes' || !rest) return null;
  if (rest.includes(',')) return null;

  const match = /^\s*(\d*)-(\d*)\s*$/u.exec(rest);
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  // `bytes=-500`: lima ratus byte **terakhir**. Ejaan yang mudah terlewat, dan dipakai
  // pembaca metadata untuk mengambil tag di ekor berkas MP3.
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!suffix) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  if (start >= size) return 'unsatisfiable';
  const end = rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1;
  if (end < start) return null;
  return { start, end };
}
