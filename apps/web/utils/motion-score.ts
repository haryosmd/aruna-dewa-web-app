import type { EntranceStyle } from '@aruna/contracts'
import { sectionTypes } from '@aruna/contracts'

import type { OrnamentId } from './ornaments'

type SectionType = (typeof sectionTypes)[number]

/**
 * Partitur scroll: apa yang membedakan satu template dari yang lain selain warna dan ornamen.
 *
 * Sebelum berkas ini ada, sembilan tema berbagi koreografi yang sama persis — `Renderer`
 * menyiram `orchestrate()` ke tiap section tiga belas kali berturut-turut. Ornamennya
 * berbeda, iramanya identik, dan yang dibaca tamu karena itu bukan narasi melainkan sebuah
 * loop. Partitur memberi tiap tema kurva kepadatan geraknya sendiri.
 *
 * Semuanya deklaratif dan tidak satu pun berupa callback: partitur hidup di `theme.ts`
 * bersama data tema lain, jadi ia harus bisa di-`satisfies` compiler dan diuji tanpa DOM.
 * Penegakan batas (jarak parallax, jumlah pin, besar drift) sengaja **tidak** ada di sini
 * melainkan di pemainnya — data tidak boleh bisa melanggar aturan DESIGN.md.
 */

/**
 * Tata bahasa masuk: bagaimana sebuah unsur menyatakan dirinya ada. Sejak fase 69 daftarnya
 * milik kontrak (`entranceStyles`), karena dokumen boleh memilih salah satunya.
 */
export type Entrance = EntranceStyle

/** Bagaimana keping `[data-iv-layer]` berperilaku di dalam sebuah babak. */
export type OrnamentMotion = 'bloom' | 'cascade' | 'draw' | 'drift'

/**
 * Bagaimana sebuah babak menyerahkan panggung ke babak berikutnya.
 *
 * `shape` bertipe `OrnamentId`, bukan string path, supaya aturan "ornamen selalu lewat
 * `<OrnamentGlyph>`" tidak bisa dilanggar dari dalam data tema.
 */
export type Segue =
  | { kind: 'none' }
  | { kind: 'dissolve' }
  | { kind: 'veil', shape: OrnamentId, from: 'top' | 'bottom' }
  | { kind: 'wipe', shape: OrnamentId, from: 'top' | 'bottom' }

/** Kurva kepadatan gerak sepanjang halaman. */
export type DensityCurve = 'steady' | 'crescendo' | 'arch' | 'ebb'

/** Peran naratif sebuah section. Melekat pada tipe section, bukan pada urutannya. */
export type SectionRole =
  | 'overture' | 'introduction' | 'interlude'
  | 'information' | 'showcase' | 'response' | 'coda'

/** Yang boleh dinyatakan sebuah babak. Yang kosong mewarisi nilai tema. */
export interface ActScore {
  /** Pengali durasi dan jarak terhadap dasar. Di-clamp 0,6–1,4 oleh `resolveAct`. */
  weight?: number
  entrance?: Entrance
  ornament?: OrnamentMotion
  /** Transisi **masuk** ke babak ini, dirender sebagai pita di atasnya. */
  segue?: Segue
  /** Babak ini boleh memaku halaman. Pemain tetap memotong di anggaran pin global. */
  pin?: boolean
}

/** Partitur gerak satu tema. */
export interface ThemeMotion {
  entrance: Entrance
  ornament: OrnamentMotion
  density: DensityCurve
  segue: Segue
  /**
   * Seberapa jauh ornamen ikut bergeser mengikuti jam scroll global, dalam persen tinggi
   * keping. 0 mematikannya. Di-clamp ≤18 oleh `resolveAct`: lebih dari itu keping
   * meninggalkan section-nya dan terbaca sebagai sampah yang melayang.
   */
  drift?: number
  /** Penimpaan per peran. Peran yang tidak disebut memakai nilai di atas. */
  acts?: Partial<Record<SectionRole, ActScore>>
}

/**
 * Peran naratif tiap tipe section.
 *
 * Tetap, dan **tidak tergantung urutan** yang dipilih pasangan: pasangan yang memindahkan
 * galeri ke atas memindahkan babak `showcase` ke atas, ia tidak menciptakan babak baru.
 * Karena itu partitur tidak perlu menyimpan apa pun di dokumen, dan
 * `invitationDocumentSchema` tidak disentuh sama sekali.
 */
export const sectionRole: Record<SectionType, SectionRole> = {
  cover: 'overture',
  couple: 'introduction',
  story: 'interlude',
  events: 'information',
  countdown: 'information',
  rundown: 'information',
  dresscode: 'information',
  gift: 'information',
  gallery: 'showcase',
  video: 'showcase',
  rsvp: 'response',
  wishes: 'response',
  closing: 'coda',
  // `music` tidak pernah dirender sebagai section — ia pemutar mengambang. Ada di peta ini
  // hanya supaya `Record` lengkap dan tipe section baru tidak bisa lupa memberi peran.
  music: 'coda',
  // Struktur Elegance (fase 72). Amplop = overture, hero + mempelai = introduction, kutipan =
  // interlude, informasi acara/lokasi/hadiah = information, galeri = showcase, ucapan = response.
  'opening-envelope': 'overture',
  hero: 'introduction',
  event: 'information',
  map: 'information',
  'unduh-mantu': 'information',
  quote: 'interlude',
}

/**
 * Kurva kepadatan sebagai fungsi atas posisi babak (0 di pembuka, 1 di penutup), bukan
 * larik berpanjang tetap: jumlah babak berubah begitu pasangan mematikan section, dan
 * larik akan salah pasang persis ketika itu terjadi.
 */
const densityAt: Record<DensityCurve, (at: number) => number> = {
  steady: () => 1,
  crescendo: at => 0.72 + at * 0.56,
  arch: at => 0.74 + Math.sin(at * Math.PI) * 0.46,
  ebb: at => 1.28 - at * 0.56,
}

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value))

/** Satu babak: satu atau beberapa section berurutan yang berbagi peran. */
export interface Act {
  role: SectionRole
  /** Posisi babak pada halaman, 0 di pembuka, 1 di penutup. Masukan kurva kepadatan. */
  at: number
  /** Jumlah section yang digabung ke dalam babak ini. */
  span: number
}

/**
 * Mengelompokkan urutan peran jadi babak, secara run-length.
 *
 * `events + countdown + rundown` yang berdampingan jadi **satu** babak `information` yang
 * tenang, bukan tiga gerakan masuk yang identik berturut-turut. Pasangan yang menyelipkan
 * galeri di tengahnya memecahnya jadi tiga babak — dan itu memang yang seharusnya terjadi
 * secara naratif.
 *
 * Masukannya daftar peran, bukan daftar section: pemanggil di DOM membacanya dari atribut,
 * pemanggil di tes menuliskannya langsung, dan fungsi ini tidak perlu tahu bedanya.
 */
export function groupActs(roles: SectionRole[]): Act[] {
  const acts: Act[] = []
  for (const role of roles) {
    const last = acts[acts.length - 1]
    if (last && last.role === role) last.span += 1
    else acts.push({ role, at: 0, span: 1 })
  }
  const span = Math.max(1, acts.length - 1)
  acts.forEach((act, index) => { act.at = acts.length > 1 ? index / span : 0 })
  return acts
}

/** Nilai babak setelah tema, kurva kepadatan, dan penimpaan peran digabung. */
export interface ResolvedAct extends Act {
  entrance: Entrance
  ornament: OrnamentMotion
  segue: Segue
  weight: number
  pin: boolean
  /** Besar drift yang sudah dipatok, siap dipakai pemain tanpa pemeriksaan lagi. */
  drift: number
}

/**
 * Menggabungkan partitur tema dengan posisi sebuah babak.
 *
 * Batasnya ditegakkan di sini, bukan dipercayakan ke penulis tema: `weight` dipatok
 * 0,6–1,4 supaya satu babak tidak bisa membuat gerakan tiga kali lebih lambat dari
 * tetangganya, dan `drift` dipatok ≤18 supaya keping tidak pernah meninggalkan section-nya.
 */
export function resolveAct(score: ThemeMotion, act: Act): ResolvedAct {
  const over = score.acts?.[act.role] ?? {}
  return {
    ...act,
    weight: clamp(0.6, 1.4, (over.weight ?? 1) * densityAt[score.density](act.at)),
    entrance: over.entrance ?? score.entrance,
    ornament: over.ornament ?? score.ornament,
    segue: over.segue ?? score.segue,
    pin: over.pin ?? false,
    drift: clamp(0, 18, score.drift ?? 0),
  }
}

/** Partitur lengkap sebuah halaman: babak-babaknya, sudah terselesaikan dan berurutan. */
export function resolveScore(score: ThemeMotion, roles: SectionRole[]): ResolvedAct[] {
  return groupActs(roles).map(act => resolveAct(score, act))
}

/**
 * Menimpa tata bahasa masuk partitur tema dengan pilihan dokumen (fase 69).
 *
 * Tanpa pilihan, partitur tema dikembalikan apa adanya — termasuk `undefined` untuk tema yang
 * masih memakai koreografi lama, supaya mereka tetap lewat `playLegacyScore()` persis seperti
 * sebelumnya. Dengan pilihan, tema lama mendapat partitur minimal: hanya pilihan itu yang
 * membawanya ke pemain partitur, bukan pembaruan diam-diam. Penimpaan per babak milik tema
 * (`acts[role].entrance`) tetap menang untuk perannya — itu presedensi `resolveAct` yang ada.
 */
export function terapkanMotionDokumen(base: ThemeMotion | undefined, masuk: Entrance | undefined): ThemeMotion | undefined {
  if (!masuk) return base
  if (base) return { ...base, entrance: masuk }
  return { entrance: masuk, ornament: 'bloom', density: 'steady', segue: { kind: 'none' } }
}
