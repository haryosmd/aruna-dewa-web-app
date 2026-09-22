import type { EnvelopeSpeed } from '@aruna/contracts'
import { envelopeSpeeds } from '@aruna/contracts'

/**
 * Tempo amplop gerbang dalam tiga tingkat (fase 69).
 *
 * `sedang` adalah angka fase 68 **persis** — undangan yang tidak memilih apa-apa tidak boleh
 * berubah satu milidetik pun. `cepat` kira-kira tempo sebelum fase 68, yang pemilik nilai
 * "terlalu cepat" sebagai bawaan tapi sah sebagai pilihan. Segel **tidak** ada di tabel ini:
 * fase 68 menolak `timeScale` global karena melambatkan segel membuatnya lembek; yang berubah
 * hanya flap, surat, dan pudarnya.
 *
 * Satuan detik, posisi relatif mengikuti tata bahasa GSAP yang dipakai `CoverGate.vue`.
 */
export interface EnvelopeTempo {
  /** Durasi flap membuka. */
  flap: number
  /** Posisi mulai flap terhadap akhir segel terbelah (negatif = tumpang tindih). */
  flapOffset: number
  /** Berapa lama setelah flap bergerak surat mulai terlihat. */
  cardFadeAt: number
  cardFade: number
  /** Durasi surat naik. */
  cardRise: number
  body: number
  bodyOffset: number
  root: number
  rootOffset: number
}

export const envelopeTempo: Record<EnvelopeSpeed, EnvelopeTempo> = {
  cepat: { flap: 0.8, flapOffset: -0.22, cardFadeAt: 0.3, cardFade: 0.2, cardRise: 0.9, body: 0.45, bodyOffset: -0.45, root: 0.45, rootOffset: -0.3 },
  sedang: { flap: 1.1, flapOffset: -0.22, cardFadeAt: 0.45, cardFade: 0.2, cardRise: 1.4, body: 0.5, bodyOffset: -0.5, root: 0.6, rootOffset: -0.35 },
  pelan: { flap: 1.5, flapOffset: -0.22, cardFadeAt: 0.6, cardFade: 0.25, cardRise: 1.9, body: 0.6, bodyOffset: -0.55, root: 0.7, rootOffset: -0.4 },
}

export function toEnvelopeSpeed(value: unknown): EnvelopeSpeed {
  return (envelopeSpeeds as readonly string[]).includes(String(value)) ? (value as EnvelopeSpeed) : 'sedang'
}

export const selectableEnvelopeSpeeds: { id: EnvelopeSpeed; label: string; hint: string }[] = [
  { id: 'pelan', label: 'Pelan', hint: 'Flap dan surat mengambang lebih lama; segel tetap tegas.' },
  { id: 'sedang', label: 'Sedang', hint: 'Bawaan. Surat naik saat flap setengah terbuka.' },
  { id: 'cepat', label: 'Cepat', hint: 'Satu jentakan — tempo sebelum fase 68.' },
]
