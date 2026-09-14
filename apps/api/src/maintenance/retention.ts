/**
 * Berapa lama tiap jejak boleh hidup.
 *
 * Sebelum berkas ini tidak ada satu pun pembersihan di seluruh sistem. Tiga akibatnya nyata:
 * `consumeToken` menandai `usedAt` tapi tidak pernah menghapus, dan baris `OAUTH_STATE`
 * ditulis endpoint tanpa autentikasi — tumpukan yang hanya bisa membesar; tiap login
 * meninggalkan baris `Session` mati berisi `userAgent` dan `ip`, yaitu PII basi tanpa batas
 * waktu; `ImportJob` menyimpan nama dan nomor telepon tamu selamanya, termasuk pratinjau
 * yang tidak pernah dikomit siapa pun.
 */

export const retentionDays = {
  /** Token sekali pakai tak berguna sedetik setelah kedaluwarsa; sehari cukup untuk forensik. */
  oneTimeToken: 1,
  /** Sesi mati disimpan sebentar supaya "dari perangkat mana" masih bisa dijawab. */
  session: 30,
  /** Jejak impor yang benar-benar dipakai; tamunya sendiri hidup di tabel lain. */
  importJobCommitted: 90,
  /** Pratinjau yang tak pernah dikomit tidak pernah jadi apa-apa — tapi isinya tetap PII. */
  importJobAbandoned: 7,
} as const;

export type RetentionCutoffs = Record<keyof typeof retentionDays, Date>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Batas waktu tiap jenis baris, dihitung mundur dari `now`. Murni, jadi bisa diuji apa adanya. */
export function retentionCutoffs(now: Date): RetentionCutoffs {
  const cutoffs = {} as RetentionCutoffs;
  for (const [key, days] of Object.entries(retentionDays) as [keyof typeof retentionDays, number][]) {
    cutoffs[key] = new Date(now.getTime() - days * DAY_MS);
  }
  return cutoffs;
}
