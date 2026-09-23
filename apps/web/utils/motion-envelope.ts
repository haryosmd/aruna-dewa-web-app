import type { EnvelopeSpeed } from '@aruna/contracts'
import { envelopeSpeeds } from '@aruna/contracts'

/**
 * Tempo amplop gerbang dalam tiga tingkat (fase 69, dikoreksi fase 80).
 *
 * Segel **tidak** ada di tabel ini: fase 68 menolak `timeScale` global karena melambatkan segel
 * membuatnya lembek; yang berubah hanya flap, surat, dan kepergiannya.
 *
 * **Semua posisi di sini jarak, bukan waktu.** Fase 69.3 menyimpannya sebagai angka negatif lalu
 * menuliskannya jadi string (`"-0.22"`) — dan GSAP membaca string numerik sebagai waktu mutlak,
 * bukan "0,22 detik sebelumnya". Gerbang pun pudar di detik nol dan seluruh amplop bergerak saat
 * sudah tak terlihat. Kini tabel hanya memuat besaran positif; arah (`-=`, `+=`, `<`) ditulis
 * `susunAmplop`, dan `motion-envelope-timeline.spec.ts` menjalankan jadwalnya dengan GSAP.
 */
export interface EnvelopeTempo {
  /** Durasi flap membuka. */
  flap: number
  /** Flap mulai sekian detik sebelum segel selesai terbelah — tumpang tindih, bukan dua adegan. */
  flapOverlap: number
  /** Berapa lama setelah flap bergerak surat mulai terlihat. */
  cardFadeAt: number
  cardFade: number
  /** Durasi surat naik. */
  cardRise: number
  /** Jeda setelah surat berdiri sebelum amplop pergi — surat sempat dibaca, bukan dilempar. */
  breath: number
  body: number
  root: number
  /** Gerbang mulai pudar sekian detik sebelum badan amplop selesai turun. */
  rootOverlap: number
}

export const envelopeTempo: Record<EnvelopeSpeed, EnvelopeTempo> = {
  cepat: { flap: 0.8, flapOverlap: 0.22, cardFadeAt: 0.3, cardFade: 0.2, cardRise: 0.9, breath: 0.12, body: 0.45, root: 0.45, rootOverlap: 0.25 },
  sedang: { flap: 1.1, flapOverlap: 0.22, cardFadeAt: 0.45, cardFade: 0.2, cardRise: 1.4, breath: 0.25, body: 0.55, root: 0.6, rootOverlap: 0.3 },
  pelan: { flap: 1.5, flapOverlap: 0.22, cardFadeAt: 0.6, cardFade: 0.25, cardRise: 1.9, breath: 0.4, body: 0.6, root: 0.7, rootOverlap: 0.35 },
}

export function toEnvelopeSpeed(value: unknown): EnvelopeSpeed {
  return (envelopeSpeeds as readonly string[]).includes(String(value)) ? (value as EnvelopeSpeed) : 'sedang'
}

export const selectableEnvelopeSpeeds: { id: EnvelopeSpeed; label: string; hint: string }[] = [
  { id: 'pelan', label: 'Pelan', hint: 'Flap dan surat mengambang lebih lama; segel tetap tegas.' },
  { id: 'sedang', label: 'Sedang', hint: 'Bawaan. Surat naik saat flap setengah terbuka.' },
  { id: 'cepat', label: 'Cepat', hint: 'Satu jentakan — tempo sebelum fase 68.' },
]

/** Sasaran timeline amplop. Di komponen berupa selektor; di tes berupa objek biasa. */
export interface EnvelopeTargets {
  seal: unknown
  sealLeft: unknown
  sealRight: unknown
  flap: unknown
  card: unknown
  body: unknown
  root: unknown
}

type Timeline = {
  to: (target: any, vars: Record<string, unknown>, position?: string | number) => Timeline
  set: (target: any, vars: Record<string, unknown>, position?: string | number) => Timeline
  addLabel: (label: string, position?: string | number) => Timeline
  call: (callback: () => void, params?: unknown[], position?: string | number) => Timeline
}

/**
 * Menyusun timeline pembukaan amplop ke `tl`. Dipisah dari `CoverGate.vue` supaya jadwalnya bisa
 * dijalankan di tes tanpa DOM.
 *
 * Tiga hitungan segel (naik berkilau, terbelah), lalu flap membuka dengan perspektif. Begitu flap
 * melewati tegak lurus ia pindah ke belakang surat — seperti amplop sungguhan, surat keluar di
 * depan tutupnya, bukan tertimpa. Surat naik dari posisi sedikit miring lalu lurus, berhenti
 * sejenak, baru amplop turun dan gerbang pudar ke undangan. `onUngkap` dipanggil tepat saat
 * gerbang mulai pudar.
 */
export function susunAmplop(tl: Timeline, tempo: EnvelopeTempo, s: EnvelopeTargets, onUngkap?: () => void): Timeline {
  tl
    .to(s.seal, { y: -10, scale: 1.06, duration: 0.42, ease: 'power2.out' })
    .to(s.seal, { '--seal-sheen': 1, duration: 0.36, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<0.1')
    .to(s.sealLeft, { xPercent: -54, rotate: -13, opacity: 0, duration: 0.5, ease: 'power3.in' })
    .to(s.sealRight, { xPercent: 54, rotate: 13, opacity: 0, duration: 0.5, ease: 'power3.in' }, '<')
    .addLabel('flap', `-=${tempo.flapOverlap}`)
    .to(s.flap, { rotateX: -168, transformPerspective: 900, duration: tempo.flap, ease: 'power3.inOut' }, 'flap')
    .set(s.flap, { zIndex: 10 }, `flap+=${tempo.flap * 0.5}`)
    .set(s.card, { rotate: -2.5 }, 'flap')
    .to(s.card, { opacity: 1, duration: tempo.cardFade }, `flap+=${tempo.cardFadeAt}`)
    .to(s.card, { y: '-64%', scale: 1.04, rotate: 0, duration: tempo.cardRise, ease: 'power3.out' }, '<')
    .to(s.body, { yPercent: 10, opacity: 0, duration: tempo.body, ease: 'power2.in' }, `+=${tempo.breath}`)
    .to(s.root, { opacity: 0, duration: tempo.root, ease: 'power2.inOut' }, `-=${tempo.rootOverlap}`)
  /*
   * Undangan di balik gerbang mulai masuk bersamaan dengan pudarnya gerbang (fase 80), bukan
   * sesudahnya — dan bukan sebelumnya, di belakang amplop yang masih utuh, tempat tamu dulu
   * tidak pernah melihat gerak masuk hero sama sekali.
   */
  if (onUngkap) tl.call(onUngkap, [], '<')
  return tl
}
