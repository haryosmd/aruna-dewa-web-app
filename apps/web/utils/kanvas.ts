import {
  kanvasSchema, kepingKanvasSchema, kunciKepingPola, maksTambahanKanvas, tambahanKanvasSchema,
  type Kanvas, type KepingKanvas, type TambahanKanvas,
} from '@aruna/contracts'
import { mediaAssetIdFromUrl } from './media-file'
import { muatSlot, ornamentSlots, slotLabels, type OrnamentSlotKey } from './ornament-slots'
import { isOrnamentId, type OrnamentRef } from './ornaments'

/**
 * Kanvas bebas per bagian (fase 81) — bagian murninya: membaca dokumen, gaya CSS sebuah keping,
 * dan geometri seret / ubah ukuran / putar yang dipakai overlay panggung.
 *
 * Satuan posisi `cqw`: persen lebar kolom undangan (`.iv-column` adalah wadahnya). Panggung
 * diperkecil lewat `transform: scale()`, jadi delta penunjuk dibagi skala pratinjau dulu (px
 * render), lalu dibagi lebar kolom render. Dengan begitu posisi yang disimpan sama di ponsel 390,
 * tablet, dan kolom desktop 480 — mengukur dalam px layar akan salah di setiap lebar lain.
 */

export type { Kanvas, KepingKanvas, TambahanKanvas }

/** Satu keping yang ditunjuk di panggung editor — dibaca dari atribut `data-iv-*` DOM-nya. */
export interface InfoKeping {
  bagianId: string
  kunci: string
  label: string
  jenis: 'ornamen' | 'teks' | 'tambahan'
  glyph?: string
  terkunci: boolean
  tersembunyi: boolean
  /**
   * `transform` bawaan komponen di pembungkus keping — putar/cermin saja, tanpa geser dan skala
   * (`arahDasar`). Dipakai pratinjau Lapisan supaya menghadap ke arah yang sama dengan kanvas.
   */
  dasar?: string
}
export type AksiKanvas =
  | 'ganti' | 'kunci' | 'depan' | 'naik' | 'turun' | 'belakang' | 'sembunyikan'
  | 'putar90' | 'cerminX' | 'kembalikan' | 'hapus' | 'putarGerak'

/* ── Membaca dokumen ─────────────────────────────────────────────────────── */

/**
 * `kanvas` dari `section.data`, dengan tiap barisnya disaring sendiri-sendiri.
 *
 * API menolak dokumen yang tidak sah, tapi draf lama dan dokumen yang disunting tangan tetap
 * bisa sampai ke renderer — dan satu keping rusak tidak boleh menjatuhkan seluruh kanvas bagian
 * itu. Glyph yang salah kategori untuk slotnya dan unggahan di luar storage kita ikut dibuang.
 */
export function bacaKanvas(data: unknown): Required<Kanvas> {
  const mentah = (data && typeof data === 'object' ? (data as Record<string, unknown>).kanvas : undefined) as Record<string, unknown> | undefined
  const keluar: Required<Kanvas> = { keping: {}, tambahan: [] }
  if (!mentah || typeof mentah !== 'object') return keluar
  const utuh = kanvasSchema.safeParse(mentah)
  const keping = (utuh.success ? utuh.data.keping : mentah.keping) as Record<string, unknown> | undefined
  if (keping && typeof keping === 'object') {
    for (const [kunci, nilai] of Object.entries(keping)) {
      if (!kunciKepingPola.test(kunci)) continue
      const hasil = kepingKanvasSchema.safeParse(nilai)
      if (!hasil.success) continue
      keluar.keping[kunci] = saringSumber(hasil.data, slotDariKunci(kunci))
    }
  }
  const tambahan = (utuh.success ? utuh.data.tambahan : mentah.tambahan) as unknown[] | undefined
  if (Array.isArray(tambahan)) {
    for (const baris of tambahan.slice(0, maksTambahanKanvas)) {
      const hasil = tambahanKanvasSchema.safeParse(baris)
      if (!hasil.success) continue
      const item = saringSumber(hasil.data, null)
      if (item.glyph || item.unggahan) keluar.tambahan.push(item)
    }
  }
  return keluar
}

/** Glyph harus ada di bank dan muat di slotnya; unggahan harus aset media kita. */
function saringSumber<T extends { glyph?: string; unggahan?: { url: string } }>(item: T, slot: OrnamentSlotKey | null): T {
  const keluar = { ...item }
  if (keluar.glyph && (!isOrnamentId(keluar.glyph) || (slot && !muatSlot(slot, keluar.glyph)))) delete keluar.glyph
  if (keluar.unggahan && !mediaAssetIdFromUrl(keluar.unggahan.url)) delete keluar.unggahan
  return keluar
}

/** `o:corner:tl` → `corner`. Teks dan slot yang tidak dikenal → `null`. */
export function slotDariKunci(kunci: string): OrnamentSlotKey | null {
  const [jenis, slot] = kunci.split(':')
  if (jenis !== 'o' || !slot) return null
  return (ornamentSlots as readonly string[]).includes(slot) ? slot as OrnamentSlotKey : null
}

/** Sumber ornamen sebuah keping: pilihan tempat itu, atau `null` = ikut slot. */
export function sumberKeping(keping: KepingKanvas | undefined): OrnamentRef | null {
  if (!keping) return null
  if (keping.unggahan) return keping.unggahan
  return (keping.glyph as OrnamentRef | undefined) ?? null
}

/** Keping tanpa satu pun ubahan — dibuang dari dokumen supaya `{}` ≡ absen. */
export function kepingKosong(keping: KepingKanvas): boolean {
  return Object.values(keping).every(nilai => nilai === undefined)
}

/* ── Gaya CSS ─────────────────────────────────────────────────────────────── */

/**
 * Gaya inline pembungkus sebuah keping ornamen.
 *
 * Memakai properti transform INDIVIDUAL (`translate`, `rotate`, `scale`), dan di PEMBUNGKUS —
 * bukan di glyph. GSAP menggabungkan ketiganya ke `transform` lalu menulisnya `none`
 * (`CSSPlugin._removeIndependentTransforms`), jadi di elemen yang ia animasikan geseran pasangan
 * akan hilang atau terhitung dua kali. Pembungkus tidak pernah disentuh GSAP. `transform` milik
 * CSS komponen (mis. sudut kanan-bawah yang `rotate(180deg)`) tetap berlaku di atasnya.
 */
export function gayaKeping(keping: KepingKanvas | undefined, tampilBawaan = true): Record<string, string> {
  const gaya: Record<string, string> = {}
  const tampil = keping?.tampil ?? tampilBawaan
  if (!tampil) gaya.display = 'none'
  if (!keping) return gaya
  if (keping.x || keping.y) gaya.translate = `${angka(keping.x ?? 0)}cqw ${angka(keping.y ?? 0)}cqw`
  if (keping.putar) gaya.rotate = `${angka(keping.putar)}deg`
  const sx = (keping.skala ?? 1) * (keping.cerminX ? -1 : 1)
  const sy = (keping.skalaY ?? keping.skala ?? 1) * (keping.cerminY ? -1 : 1)
  if (sx !== 1 || sy !== 1) gaya.scale = `${angka(sx)} ${angka(sy)}`
  if (keping.opasitas !== undefined && keping.opasitas !== 1) gaya.opacity = String(angka(keping.opasitas))
  if (keping.lapis !== undefined) gaya.zIndex = String(keping.lapis)
  return gaya
}

/**
 * Gaya teks: geseran lewat `left`/`top` relatif, bukan transform — judul dianimasikan GSAP (`y`,
 * `clip-path`) di elemen yang sama, dan offset relatif tidak pernah bertabrakan dengannya.
 * Ukuran teks bukan skala: kanvas menulis `textStyles[kolom].fontSize` yang juga dibaca form.
 */
export function gayaTeks(keping: KepingKanvas | undefined): Record<string, string> {
  const gaya: Record<string, string> = {}
  if (!keping) return gaya
  if (keping.tampil === false) gaya.display = 'none'
  if (keping.x) gaya.left = `${angka(keping.x)}cqw`
  if (keping.y) gaya.top = `${angka(keping.y)}cqw`
  if (keping.opasitas !== undefined && keping.opasitas !== 1) gaya.opacity = String(angka(keping.opasitas))
  if (keping.lapis !== undefined) gaya.zIndex = String(keping.lapis)
  return gaya
}

/** Gaya ornamen tambahan: pusat di (x, y) cqw dari pojok kiri-atas bagian, selebar `lebar` cqw. */
export function gayaTambahan(item: TambahanKanvas): Record<string, string> {
  const gaya: Record<string, string> = {
    left: `${angka(item.x)}cqw`,
    top: `${angka(item.y)}cqw`,
    width: `${angka(item.lebar)}cqw`,
    translate: '-50% -50%',
  }
  if (item.putar) gaya.rotate = `${angka(item.putar)}deg`
  const sx = item.cerminX ? -1 : 1
  const sy = (item.rasio ?? 1) * (item.cerminY ? -1 : 1)
  if (sx !== 1 || sy !== 1) gaya.scale = `${sx} ${angka(sy)}`
  if (item.opasitas !== undefined && item.opasitas !== 1) gaya.opacity = String(angka(item.opasitas))
  gaya.zIndex = String(item.lapis ?? 5)
  return gaya
}

/** Pembulatan tampilan: dua desimal cukup untuk cqw (0,01cqw < 0,05px di kolom 480). */
export function angka(nilai: number): number {
  return Math.round(nilai * 100) / 100
}

/* ── Geometri panggung ───────────────────────────────────────────────────── */

export type Pegangan = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const semuaPegangan: readonly Pegangan[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** Kotak di koordinat lokal (belum diputar): pusat + ukuran. */
export interface Kotak { cx: number; cy: number; w: number; h: number }

/** Delta px layar → cqw: dibagi skala pratinjau (px render), lalu dibagi lebar kolom render. */
export function layarKeCqw(deltaLayar: number, skalaPratinjau: number, lebarKolom: number): number {
  if (!lebarKolom) return 0
  return (deltaLayar / (skalaPratinjau || 1)) / lebarKolom * 100
}

/**
 * Ubah ukuran dari satu pegangan, berjangkar pada sisi/pojok SEBERANG — bukan dari pusat seperti
 * `MediaCropper`, karena di aplikasi desain yang ditarik pojoknya, pojok seberang yang diam.
 *
 * `putar` dalam derajat: delta penunjuk diproyeksikan ke sumbu keping dulu, jadi menarik pojok
 * keping yang miring tetap memanjangkan sisinya sendiri. `rasio` (Shift) mengunci w/h awal;
 * pegangan sisi dengan rasio terkunci menumbuhkan kedua sumbu dan tetap berpusat di sumbu lain.
 */
export function ubahUkuran(awal: Kotak, pegangan: Pegangan, dx: number, dy: number, opsi: { putar?: number; rasio?: boolean; min?: number } = {}): Kotak {
  const rad = ((opsi.putar ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  // Delta ke sumbu lokal.
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  const min = opsi.min ?? 8

  const arahX = pegangan.includes('e') ? 1 : pegangan.includes('w') ? -1 : 0
  const arahY = pegangan.includes('s') ? 1 : pegangan.includes('n') ? -1 : 0
  let w = awal.w + arahX * lx
  let h = awal.h + arahY * ly

  if (opsi.rasio) {
    const r = awal.w / awal.h
    if (arahX && arahY) {
      // Pojok: ikuti sumbu yang ditarik lebih jauh (relatif ukurannya).
      if (Math.abs(w / awal.w) >= Math.abs(h / awal.h)) h = w / r
      else w = h * r
    } else if (arahX) h = w / r
    else w = h * r
  }
  w = Math.max(min, w)
  h = Math.max(min, h)
  if (opsi.rasio) {
    const r = awal.w / awal.h
    if (w / h > r) h = w / r
    else w = h * r
  }

  // Pusat bergeser setengah pertumbuhan ke arah pegangan (sumbu lokal), lalu diputar balik.
  const gx = arahX ? (arahX * (w - awal.w)) / 2 : 0
  const gy = arahY ? (arahY * (h - awal.h)) / 2 : 0
  return {
    cx: awal.cx + gx * cos - gy * sin,
    cy: awal.cy + gx * sin + gy * cos,
    w,
    h,
  }
}

/** Sudut penunjuk terhadap pusat, dalam derajat (0 = tegak ke atas). Shift → kelipatan 15°. */
export function sudutPutar(cx: number, cy: number, px: number, py: number, kelipatan = false): number {
  let derajat = (Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI
  if (kelipatan) derajat = Math.round(derajat / 15) * 15
  return normalSudut(derajat)
}

/** Ke rentang −180…180 (−180 ditulis 180), dibulatkan 0,1°, dan −0 → 0. */
export function normalSudut(derajat: number): number {
  let d = (((derajat % 360) + 540) % 360) - 180
  if (d === -180) d = 180
  d = Math.round(d * 10) / 10
  return d === 0 ? 0 : d
}

/* ── Seret ala Figma (fase 81 lanjutan) ──────────────────────────────────── */

/**
 * Shift saat menyeret: gerak dikunci ke arah dominan — mendatar, tegak, atau diagonal 45° — dan
 * arahnya boleh berganti selama Shift ditahan, persis Figma. Batasnya 22,5° dan 67,5°.
 */
export function kunciSumbu(dx: number, dy: number): { dx: number; dy: number; sumbu: 'x' | 'y' | 'diagonal' } {
  const sudut = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
  if (sudut < 22.5) return { dx, dy: 0, sumbu: 'x' }
  if (sudut > 67.5) return { dx: 0, dy, sumbu: 'y' }
  const d = (Math.abs(dx) + Math.abs(dy)) / 2
  return { dx: Math.sign(dx) * d, dy: Math.sign(dy) * d, sumbu: 'diagonal' }
}

/** Kotak sejajar sumbu di layar (px). */
export interface KotakAabb { kiri: number; atas: number; kanan: number; bawah: number }
/** Garis bantu: untuk sumbu `x` garis tegak di x = `posisi` dari y = `dari` ke `ke`; untuk `y` sebaliknya. */
export interface GarisPanduan { sumbu: 'x' | 'y'; posisi: number; dari: number; ke: number }
/** Penanda jarak seimbang: ruas sepanjang sumbu dari `dari` ke `ke`, digambar di `pada`. */
export interface JarakPanduan { sumbu: 'x' | 'y'; dari: number; ke: number; pada: number; panjang: number }

interface Calon { koreksi: number; jarak?: JarakPanduan[] }

const titikX = (k: KotakAabb) => [k.kiri, (k.kiri + k.kanan) / 2, k.kanan]
const titikY = (k: KotakAabb) => [k.atas, (k.atas + k.bawah) / 2, k.bawah]
const geser = (k: KotakAabb, dx: number, dy: number): KotakAabb => ({ kiri: k.kiri + dx, kanan: k.kanan + dx, atas: k.atas + dy, bawah: k.bawah + dy })

/**
 * Smart guide (fase 81 lanjutan): koreksi supaya keping yang diseret sejajar dengan objek di
 * sekitarnya — tepi kiri/tengah/kanan dan atas/tengah/bawah — atau berjarak seimbang dengan
 * tetangganya. Per sumbu dipilih koreksi terkecil yang masih dalam `ambang`; garis bantunya
 * membentang dari keping ke objek yang sejajar, bukan selebar layar, seperti Figma.
 */
export function hitungTempel(bergerak: KotakAabb, sasaran: readonly KotakAabb[], ambang = 4): { dx: number; dy: number; garis: GarisPanduan[]; jarak: JarakPanduan[] } {
  const pilihX = pilihTerbaik([...calonTepi(titikX(bergerak), sasaran.map(titikX), ambang), ...calonJarak(bergerak, sasaran, 'x', ambang)])
  const pilihY = pilihTerbaik([...calonTepi(titikY(bergerak), sasaran.map(titikY), ambang), ...calonJarak(bergerak, sasaran, 'y', ambang)])
  const dx = pilihX?.koreksi ?? 0
  const dy = pilihY?.koreksi ?? 0
  const akhir = geser(bergerak, dx, dy)

  const garis = garisSejajar(akhir, sasaran, pilihX && !pilihX.jarak ? titikX(akhir) : [], pilihY && !pilihY.jarak ? titikY(akhir) : [])
  return { dx, dy, garis, jarak: [...(pilihX?.jarak ?? []), ...(pilihY?.jarak ?? [])] }
}

/**
 * Garis bantu untuk titik keping (`tepiX`/`tepiY`) yang tepat sejajar dengan tepi atau tengah
 * sasaran — dari keping ke sasaran, garis yang berimpit digabung.
 */
function garisSejajar(akhir: KotakAabb, sasaran: readonly KotakAabb[], tepiX: number[], tepiY: number[]): GarisPanduan[] {
  const garis: GarisPanduan[] = []
  const tambahGaris = (sumbu: 'x' | 'y', posisi: number, dari: number, ke: number) => {
    const ada = garis.find(g => g.sumbu === sumbu && Math.abs(g.posisi - posisi) < 0.5)
    if (ada) { ada.dari = Math.min(ada.dari, dari); ada.ke = Math.max(ada.ke, ke); return }
    garis.push({ sumbu, posisi, dari, ke })
  }
  for (const s of sasaran) {
    for (const t of titikX(s)) {
      if (tepiX.some(k => Math.abs(k - t) < 0.5)) tambahGaris('x', t, Math.min(s.atas, akhir.atas), Math.max(s.bawah, akhir.bawah))
    }
    for (const t of titikY(s)) {
      if (tepiY.some(k => Math.abs(k - t) < 0.5)) tambahGaris('y', t, Math.min(s.kiri, akhir.kiri), Math.max(s.kanan, akhir.kanan))
    }
  }
  return garis
}

/**
 * Smart guide saat MENGUBAH UKURAN (fase 82): hanya tepi yang ditarik yang menempel ke tepi/tengah
 * objek sekitar, tepi seberangnya tetap diam — seperti Figma. `baru` adalah hasil `ubahUkuran`
 * (koordinat layar, sebelum diputar). Hanya untuk putaran kelipatan 90°: keping miring tidak punya
 * tepi yang sejajar dengan objek lain. Dengan `rasio`, pegangan pojok memilih koreksi terkecil dari
 * dua sumbu dan sumbu lainnya mengikuti rasio; pegangan sisi tetap berpusat di sumbu lain.
 */
export function tempelUkuran(
  baru: Kotak,
  pegangan: Pegangan,
  sasaran: readonly KotakAabb[],
  opsi: { putar?: number; rasio?: boolean; ambang?: number; min?: number } = {},
): { kotak: Kotak; garis: GarisPanduan[] } {
  const tetap = { kotak: baru, garis: [] as GarisPanduan[] }
  const putar = opsi.putar ?? 0
  const perempat = Math.round(putar / 90)
  if (Math.abs(putar - perempat * 90) > 0.5 || !sasaran.length) return tetap
  const ambang = opsi.ambang ?? 4
  const min = opsi.min ?? 8

  // Arah pegangan di layar: arah lokalnya diputar per 90° searah jarum jam (y ke bawah).
  const ax = pegangan.includes('e') ? 1 : pegangan.includes('w') ? -1 : 0
  const ay = pegangan.includes('s') ? 1 : pegangan.includes('n') ? -1 : 0
  const q = ((perempat % 4) + 4) % 4
  const [sx, sy] = q === 0 ? [ax, ay] : q === 1 ? [-ay, ax] : q === 2 ? [-ax, -ay] : [ay, -ax]
  const tukar = q % 2 === 1
  const lebar = tukar ? baru.h : baru.w
  const tinggi = tukar ? baru.w : baru.h
  const kiri = baru.cx - lebar / 2
  const atas = baru.cy - tinggi / 2

  const tepiX = sx > 0 ? kiri + lebar : kiri
  const tepiY = sy > 0 ? atas + tinggi : atas
  const kx = sx ? pilihTerbaik(calonTepi([tepiX], sasaran.map(titikX), ambang)) : null
  const ky = sy ? pilihTerbaik(calonTepi([tepiY], sasaran.map(titikY), ambang)) : null
  if (!kx && !ky) return tetap

  let w = lebar
  let h = tinggi
  if (opsi.rasio) {
    const r = lebar / tinggi
    if (kx && (!ky || Math.abs(kx.koreksi) <= Math.abs(ky.koreksi))) { w = lebar + sx * kx.koreksi; h = w / r }
    else if (ky) { h = tinggi + sy * ky.koreksi; w = h * r }
  }
  else {
    if (kx) w = lebar + sx * kx.koreksi
    if (ky) h = tinggi + sy * ky.koreksi
  }
  if (w < min || h < min) return tetap

  // Tepi seberang pegangan berjangkar; sumbu tanpa pegangan tumbuh dari pusatnya.
  const cx = sx ? (sx > 0 ? kiri : kiri + lebar) + (sx * w) / 2 : baru.cx
  const cy = sy ? (sy > 0 ? atas : atas + tinggi) + (sy * h) / 2 : baru.cy
  const akhir: KotakAabb = { kiri: cx - w / 2, kanan: cx + w / 2, atas: cy - h / 2, bawah: cy + h / 2 }
  const garis = garisSejajar(akhir, sasaran, sx ? [sx > 0 ? akhir.kanan : akhir.kiri] : [], sy ? [sy > 0 ? akhir.bawah : akhir.atas] : [])
  return { kotak: { cx, cy, w: tukar ? h : w, h: tukar ? w : h }, garis }
}

function pilihTerbaik(calon: Calon[]): Calon | null {
  let terbaik: Calon | null = null
  for (const c of calon) if (!terbaik || Math.abs(c.koreksi) < Math.abs(terbaik.koreksi)) terbaik = c
  return terbaik
}

function calonTepi(keping: number[], sasaran: number[][], ambang: number): Calon[] {
  const calon: Calon[] = []
  for (const titik of sasaran) {
    for (const t of titik) {
      for (const k of keping) {
        const koreksi = t - k
        if (Math.abs(koreksi) <= ambang) calon.push({ koreksi })
      }
    }
  }
  return calon
}

/**
 * Jarak seimbang di satu sumbu, hanya antar-objek yang sebaris dengannya (tumpang tindih di sumbu
 * tegak lurus). Tiga bentuk, sama seperti Figma: meneruskan jarak dua tetangga di kiri, meneruskan
 * jarak dua tetangga di kanan, dan tepat di tengah antara tetangga kiri dan kanan.
 */
function calonJarak(b: KotakAabb, sasaran: readonly KotakAabb[], sumbu: 'x' | 'y', ambang: number): Calon[] {
  const awal = (k: KotakAabb) => (sumbu === 'x' ? k.kiri : k.atas)
  const akhir = (k: KotakAabb) => (sumbu === 'x' ? k.kanan : k.bawah)
  const lintangAwal = (k: KotakAabb) => (sumbu === 'x' ? k.atas : k.kiri)
  const lintangAkhir = (k: KotakAabb) => (sumbu === 'x' ? k.bawah : k.kanan)
  const sebaris = sasaran.filter(s => lintangAwal(s) < lintangAkhir(b) && lintangAkhir(s) > lintangAwal(b))
  const pada = (lintangAwal(b) + lintangAkhir(b)) / 2
  const ruas = (dari: number, ke: number): JarakPanduan => ({ sumbu, dari, ke, pada, panjang: ke - dari })

  const kiriDari = (batas: number, kecuali?: KotakAabb) => sebaris
    .filter(s => s !== kecuali && akhir(s) <= batas + ambang)
    .sort((p, q) => akhir(q) - akhir(p))[0]
  const kananDari = (batas: number, kecuali?: KotakAabb) => sebaris
    .filter(s => s !== kecuali && awal(s) >= batas - ambang)
    .sort((p, q) => awal(p) - awal(q))[0]

  const calon: Calon[] = []
  const l = kiriDari(awal(b))
  const r = kananDari(akhir(b))
  if (l) {
    const ll = kiriDari(awal(l), l)
    if (ll) {
      const celah = awal(l) - akhir(ll)
      const koreksi = akhir(l) + celah - awal(b)
      if (celah > 0 && Math.abs(koreksi) <= ambang) calon.push({ koreksi, jarak: [ruas(akhir(ll), awal(l)), ruas(akhir(l), akhir(l) + celah)] })
    }
  }
  if (r) {
    const rr = kananDari(akhir(r), r)
    if (rr) {
      const celah = awal(rr) - akhir(r)
      const koreksi = awal(r) - celah - akhir(b)
      if (celah > 0 && Math.abs(koreksi) <= ambang) calon.push({ koreksi, jarak: [ruas(awal(r) - celah, awal(r)), ruas(akhir(r), awal(rr))] })
    }
  }
  if (l && r) {
    const celah = (awal(r) - akhir(l) - (akhir(b) - awal(b))) / 2
    const koreksi = akhir(l) + celah - awal(b)
    if (celah > 0 && Math.abs(koreksi) <= ambang) calon.push({ koreksi, jarak: [ruas(akhir(l), akhir(l) + celah), ruas(awal(r) - celah, awal(r))] })
  }
  return calon
}

/** Tarik ke `sasaran` bila jaraknya kurang dari `ambang` (sama satuannya). */
export function tempel(nilai: number, sasaran: number, ambang: number): { nilai: number; kena: boolean } {
  return Math.abs(nilai - sasaran) <= ambang ? { nilai: sasaran, kena: true } : { nilai, kena: false }
}

export function batasi(nilai: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, nilai))
}

/* ── Lapis ────────────────────────────────────────────────────────────────── */

export type ArahLapis = 'naik' | 'turun' | 'depan' | 'belakang'

/**
 * Lapis baru untuk SATU keping. Hanya keping yang dipindah yang ditulis — memberi `z-index` pada
 * semua keping sebagian hanya supaya urutannya rapat akan mengangkat sudut dan pemisah di atas isi
 * bagian yang selama ini menindihnya. `depan`/`belakang` melompati semua saudara; `naik`/`turun`
 * satu tingkat. Tetap di dalam batas skema (−20…40).
 */
export function lapisBaru(daftar: readonly { kunci: string; lapis?: number }[], kunci: string, arah: ArahLapis): number {
  const sekarang = daftar.find(item => item.kunci === kunci)?.lapis ?? 0
  const lain = daftar.filter(item => item.kunci !== kunci).map(item => item.lapis ?? 0)
  const tertinggi = Math.max(0, ...lain)
  const terendah = Math.min(0, ...lain)
  const hasil = arah === 'depan' ? tertinggi + 1 : arah === 'belakang' ? terendah - 1 : arah === 'naik' ? sekarang + 1 : sekarang - 1
  return batasi(hasil, -20, 40)
}

/* ── Menulis kanvas ──────────────────────────────────────────────────────── */

/** Gabung patch: `undefined`/`null` menghapus kuncinya, bukan menulis nilai kosong. */
export function gabung<T extends object>(awal: T, patch: Record<string, unknown>): T {
  const hasil = { ...awal } as Record<string, unknown>
  for (const [kunci, nilai] of Object.entries(patch)) {
    if (nilai === undefined || nilai === null) delete hasil[kunci]
    else hasil[kunci] = nilai
  }
  return hasil as T
}

/** Kanvas baru sesudah satu keping diubah; keping tanpa ubahan dibuang. */
export function terapkanKeping(kanvas: Kanvas | undefined, kunci: string, patch: Record<string, unknown> | null): Kanvas | undefined {
  const keping = { ...(kanvas?.keping ?? {}) }
  const baru = patch ? gabung(keping[kunci] ?? {}, patch) : {}
  if (kepingKosong(baru)) delete keping[kunci]
  else keping[kunci] = baru
  return rapikanKanvas({ ...kanvas, keping })
}

/** Kanvas baru sesudah satu ornamen tambahan diubah (`patch`) atau dihapus (`null`). */
export function terapkanTambahan(kanvas: Kanvas | undefined, id: string, patch: Record<string, unknown> | null): Kanvas | undefined {
  const tambahan = (kanvas?.tambahan ?? [])
    .filter(item => patch !== null || item.id !== id)
    .map(item => (item.id === id && patch ? gabung(item, patch) : item))
  return rapikanKanvas({ ...kanvas, tambahan })
}

/** `{}` ≡ absen: keping kosong, larik kosong, dan kanvas kosong dibuang dari dokumen. */
export function rapikanKanvas(kanvas: Kanvas | undefined): Kanvas | undefined {
  if (!kanvas) return undefined
  const keluar: Kanvas = {}
  if (kanvas.keping && Object.keys(kanvas.keping).length) keluar.keping = kanvas.keping
  if (kanvas.tambahan?.length) keluar.tambahan = kanvas.tambahan
  return Object.keys(keluar).length ? keluar : undefined
}

/* ── Kunci & arah sudut ──────────────────────────────────────────────────── */

/** Keping terkunci tidak bisa disunting di panggung (seret, ukur, putar, teks, ganti) — hanya lewat form. */
export function bisaDisuntingDiPanggung(keping: { terkunci?: boolean } | undefined): boolean {
  return !keping?.terkunci
}

/**
 * Empat arah sudut (fase 81, permintaan pemilik): satu keping sudut dipakai di keempat pojok. Arah
 * ditulis sebagai PUTARAN, bukan cermin — pojok kanan-bawah bawaan sudah `rotate(180deg)` di CSS
 * komponennya sejak fase 01, dan kanan-atas/kiri-bawah yang lahir di fase 81 mengikuti pola yang
 * sama (90° / −90°). Bank sudut digambar menghadap kiri-atas.
 */
export const arahSudut = [
  { id: 'kiri-atas', label: 'Kiri atas', simbol: '↖', sudut: 0 },
  { id: 'kanan-atas', label: 'Kanan atas', simbol: '↗', sudut: 90 },
  { id: 'kanan-bawah', label: 'Kanan bawah', simbol: '↘', sudut: 180 },
  { id: 'kiri-bawah', label: 'Kiri bawah', simbol: '↙', sudut: -90 },
] as const
export type ArahSudut = (typeof arahSudut)[number]['id']

/**
 * Arah bawaan sebuah keping dari `getComputedStyle(el).transform` pembungkusnya: sudut kanan-bawah
 * (`rotate(180deg)` di CSS), simbol bawah Hero (inline), keping ladang (`rotate` + `scaleX(-1)`).
 * Ubahan kanvas memakai properti individual (`rotate`/`scale`, lihat `gayaKeping`), jadi `transform`
 * terhitung hanya berisi bawaan komponen. Geser dibuang dan skala dinormalkan — pratinjau cukup
 * tahu ke mana keping menghadap. `none` dan `matrix3d` → tanpa arah bawaan.
 */
export function arahDasar(transform: string | null | undefined): string | undefined {
  const cocok = /^matrix\(([^)]+)\)$/.exec((transform ?? '').trim())
  if (!cocok) return undefined
  const [a, b, c, d] = cocok[1]!.split(',').map(Number)
  if (![a, b, c, d].every(Number.isFinite)) return undefined
  const skala = Math.sqrt(Math.abs(a! * d! - b! * c!))
  if (!skala) return undefined
  const n = (v: number) => angka(v / skala) || 0
  const [na, nb, nc, nd] = [n(a!), n(b!), n(c!), n(d!)]
  if (na === 1 && nb === 0 && nc === 0 && nd === 1) return undefined
  return `matrix(${na}, ${nb}, ${nc}, ${nd}, 0, 0)`
}

/** Putaran yang sudah dipasang CSS komponen untuk pojok ini (`…-tl`, `…-tr`, `…-br`, `…-bl`). */
export function putarDasar(posisi: string): number {
  const akhir = posisi.split('-').pop()
  return akhir === 'tr' ? 90 : akhir === 'br' ? 180 : akhir === 'bl' ? -90 : 0
}

/** Putaran kanvas agar keping di `posisi` menghadap `arah`. */
export function putarUntukArah(posisi: string, arah: ArahSudut): number {
  const tujuan = arahSudut.find(item => item.id === arah)!.sudut
  return normalSudut(tujuan - putarDasar(posisi))
}

/** Arah yang sedang dihadap keping, atau `null` bila putarannya miring (bukan kelipatan 90°). */
export function arahDariPutar(posisi: string, putar = 0): ArahSudut | null {
  const mutlak = normalSudut(putarDasar(posisi) + putar)
  return arahSudut.find(item => normalSudut(item.sudut) === mutlak)?.id ?? null
}

/* ── Gerak per keping ────────────────────────────────────────────────────── */

/** Label preset gerak per keping, dipakai Inspector dan menu. */
export const labelGerakKeping: Record<string, string> = {
  bagian: 'Ikut bagian',
  mekar: 'Mekar dari tengah',
  naik: 'Naik',
  sapu: 'Sapu dari samping',
  iris: 'Iris (terbuka dari tengah)',
  jatuh: 'Jatuh & bergoyang',
  gambar: 'Tergambar',
  tanpa: 'Tanpa gerak',
}

/**
 * Tanda tangan gerak seluruh dokumen untuk panggung: gerak masuk tiap bagian + gerak tiap keping.
 * Geseran dan ukuran SENGAJA tidak ikut — menyeret satu sudut tidak boleh memutar ulang seluruh
 * gerak masuk yang sedang terlihat.
 */
export function tandaGerak(sections: readonly { data?: unknown }[]): string {
  return JSON.stringify(sections.map((section) => {
    const data = (section.data ?? {}) as Record<string, unknown>
    const kanvas = bacaKanvas(data)
    return [
      data.motion ?? null,
      Object.entries(kanvas.keping).filter(([, k]) => k.gerak || k.tunda).map(([kunci, k]) => [kunci, k.gerak, k.tunda]),
      kanvas.tambahan.map(item => [item.id, item.gerak, item.tunda]),
    ]
  }))
}

/* ── Nama keping untuk manusia ───────────────────────────────────────────── */

const labelPosisi: Record<string, string> = {
  tl: 'kiri atas', tr: 'kanan atas', bl: 'kiri bawah', br: 'kanan bawah',
  atas: 'atas', bawah: 'bawah', kedua: 'kedua', ketiga: 'ketiga', surat: 'di surat',
  akad: 'akad', reception: 'resepsi',
}
const labelJenis: Record<string, string> = { layer: 'Ladang', venue: 'Gedung', attire: 'Busana' }

/**
 * "Sudut · kiri atas", "Judul", "Ornamen tambahan". Label kolom teks datang dari pemanggil (kontrak
 * `sectionFields`), karena berkas ini tidak tahu tipe bagiannya.
 */
export function labelKeping(kunci: string, labelKolom?: (kolom: string) => string | undefined): string {
  if (kunci.startsWith('a:')) return 'Ornamen tambahan'
  if (kunci.startsWith('t:')) {
    const kolom = kunci.slice(2)
    return labelKolom?.(kolom) ?? kolom
  }
  const [, slot = '', posisi = ''] = kunci.split(':')
  const jenis = (slotLabels as Record<string, { label: string } | undefined>)[slot]?.label ?? labelJenis[slot] ?? slot
  const bagian = posisi.split('-').map(potong => labelPosisi[potong] ?? (/^\d+$/.test(potong) ? String(Number(potong) + 1) : '')).filter(Boolean)
  return bagian.length ? `${jenis} · ${bagian.join(' ')}` : jenis
}
