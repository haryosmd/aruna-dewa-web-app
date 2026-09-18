import { cakram, inside, n, poly, sepanjangTepi, ukelBertangkai, translateD } from './geometry.mjs'

/**
 * Isen-isen — isian yang menghidupkan rongga sebuah bentuk.
 *
 * Ini yang sepenuhnya hilang dari bank ornamen sebelum fase 41. Seluruh 132 ornamen lama
 * dibangun dari satu resep: satu grup massa di opacity 1, satu di 0,45, selesai. Siluetnya
 * ada, isinya tidak — dan itulah yang membuatnya terbaca sebagai bentuk generik.
 *
 * Tiga aturan yang berlaku untuk semua keluarga di bawah:
 *
 * 1. **Kisi berselang dengan DUA nilai geser yang berbeda.** Baris ganjil digeser satu nilai,
 *    baris genap nilai lain. Kalau keduanya sama, mata membacanya kembali sebagai grid.
 *
 * 2. **Tiga periode yang tidak sejajar.** Arah berperiode 2, ukuran 3, dan nilai 3 — tapi
 *    ukuran dan nilai dihitung di ruang indeks yang berbeda (`r*3+c` vs urutan pemasangan),
 *    jadi ketiganya tidak pernah jatuh berbarengan. Periode yang sejajar menghasilkan pola
 *    yang terbaca sebagai pengulangan, dan itu persis yang ingin dihindari.
 *
 * 3. **Muat diuji dengan titik-dalam-poligon, bukan `clipPath`.** Isen yang dipotong topeng
 *    meninggalkan potongan setengah di tepi; isen yang diuji muat akan menipis sendiri
 *    mengikuti siluet — dan itulah yang membuat puncak sebuah bentuk terlihat lebih lega
 *    daripada perutnya, seperti pada ukiran sungguhan.
 */

const at = (x, y, body, rot = 0) =>
  `<g transform="translate(${n(x)} ${n(y)})${rot ? ` rotate(${n(rot)})` : ''}">${body}</g>`

const mass = (d, opacity = 1) =>
  `<path data-mass=""${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${d}" />`

/** Garis sawut memakai stop `deep`, aturan yang sama dengan `emit.mjs`: aksen bukan garis. */
const draw = (d, width = 3, opacity = 0.6) =>
  `<path data-draw="" fill="none" stroke="var(--iv-orn-deep, currentColor)" stroke-width="${n(width)}" ` +
  `stroke-linecap="round"${opacity === 1 ? '' : ` opacity="${opacity}"`} d="${d}" />`

/** Kotak pembatas sebuah poligon. */
export function kotak(pts) {
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

/**
 * Uji muat: pusat DAN empat titik keliling harus di dalam poligon.
 *
 * Menguji pusatnya saja membuat isen di dekat tepi separuh menjulur keluar band — yang
 * terbaca sebagai cacat cetak, bukan sebagai ornamen.
 */
const muat = (pts, x, y, rad, lubang = null) => {
  const titik = [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]]
  if (!titik.every(([dx, dy]) => inside(pts, x + dx, y + dy))) return false
  // Bingkai ditumpangkan DI ATAS foto, jadi interiornya wajib tetap berongga. Isen yang
  // jatuh di dalam lubang akan menutupi wajah orang — dan itu bukan hiasan, itu cacat.
  if (lubang && titik.some(([dx, dy]) => inside(lubang, x + dx, y + dy))) return false
  return true
}

/**
 * Menyusuri kisi berselang di dalam sebuah poligon dan memanggil `pasang` untuk tiap sel
 * yang muat. Seluruh keluarga isen memakai penyusur yang sama, jadi kepadatannya sebanding
 * antar keluarga dan gerbang mutu bisa mengukurnya dengan satu angka.
 */
export function tebar(pts, { rows = 7, cols = 4, jangkauan = [0.3, 0.92], skala = 1, lubang = null }, pasang) {
  const { x0, x1, y0, y1 } = kotak(pts)
  const w = x1 - x0
  const h = y1 - y0
  const out = []
  let urut = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Dua nilai geser yang berbeda — bukan satu nilai dipakai bolak-balik.
      const geser = r % 2 ? w / (cols * 3.6) : -w / (cols * 4.6)
      const x = x0 + ((c + 0.5) / cols) * w + geser
      const y = y0 + (jangkauan[0] + (jangkauan[1] - jangkauan[0]) * (r / Math.max(1, rows - 1))) * h
      const dir = (c + r) % 2 ? 1 : -1
      const rad = Math.min(w, h) * 0.085 * skala * (0.82 + (0.36 * ((r * 3 + c) % 3)) / 2)
      if (!muat(pts, x, y, rad * 1.15, lubang)) continue
      const bagian = pasang({ x, y, dir, rad, r, c, urut, nilai: urut % 3 === 2 ? 0.45 : 1 })
      if (bagian) out.push(bagian)
      urut += 1
    }
  }
  return out.join('')
}

/**
 * **Ukel** — isian sulur melingkar. Keluarga isen terpadat; dipakai untuk bidang besar
 * seperti badan bingkai.
 *
 * Tiap curl tetap bertangkai, karena aturan "tidak ada curl telanjang" berlaku juga di dalam
 * isen, bukan hanya pada sulur utama.
 */
export function isenUkel(pts, opts = {}) {
  return tebar(pts, opts, ({ x, y, dir, rad, r, c, nilai }) => {
    const tilt = (dir > 0 ? -0.35 : Math.PI + 0.35) + (((r * 5 + c * 3) % 7) - 3) * 0.22
    return at(x, y, mass(ukelBertangkai({ len: rad * 1.5, r0: rad, turns: 0.78, w0: rad * 0.34, dir, tilt }), nilai))
  })
}

/**
 * **Cecek** — bidang titik. Isen paling ringan; dipakai sebagai jeda irama di antara unit
 * berulang, dan sebagai isian bidang sempit di mana ukel akan menggumpal.
 *
 * Satu titik diberi jangkar lebih besar supaya bidangnya punya pusat, tidak rata.
 */
export function isenCecek(pts, opts = {}) {
  const jangkarDi = opts.jangkar ?? 0
  let urut = 0
  return tebar(pts, { rows: 6, cols: 5, ...opts }, ({ x, y, rad, nilai }) => {
    const jangkar = urut++ === jangkarDi
    return at(x, y, mass(cakram(rad * (jangkar ? 0.46 : 0.28)), jangkar ? 1 : nilai))
  })
}

/**
 * **Sawut** — garis rambut sejajar yang mengikuti satu arah.
 *
 * Satu-satunya keluarga isen yang menghasilkan `data-draw`, jadi ia yang membuat sebuah
 * ornamen bisa digambar DrawSVG saat di-scroll. Enam puluh empat persen bank lama tidak
 * punya satu pun grup garis; sawut yang membalikkan angka itu.
 *
 * Ketebalannya tidak pernah di bawah 2,5 satuan viewBox — kalau butuh lebih tipis dari itu,
 * bentuknya yang salah, bukan strokenya.
 */
export function isenSawut(pts, { jumlah = 7, sudut = -0.5, tebal = 3, panjang = 0.42, lubang = null } = {}) {
  const { x0, x1, y0, y1 } = kotak(pts)
  const w = x1 - x0
  const h = y1 - y0
  const dx = Math.cos(sudut)
  const dy = Math.sin(sudut)
  const garis = []
  for (let i = 0; i < jumlah; i++) {
    const t = (i + 0.5) / jumlah
    const cx = x0 + w * (0.5 + (t - 0.5) * 0.86)
    const cy = y0 + h * (0.28 + 0.58 * ((i * 3) % jumlah) / jumlah)
    const len = Math.min(w, h) * panjang * (0.68 + 0.32 * Math.sin(Math.PI * t))
    const a = [cx - dx * len * 0.5, cy - dy * len * 0.5]
    const b = [cx + dx * len * 0.5, cy + dy * len * 0.5]
    if (!inside(pts, a[0], a[1]) || !inside(pts, b[0], b[1])) continue
    if (lubang && (inside(lubang, a[0], a[1]) || inside(lubang, b[0], b[1]))) continue
    garis.push(draw(poly([a, b], false), tebal, i % 3 === 2 ? 0.45 : 0.65))
  }
  return garis.join('')
}

/**
 * **Isen tepi** — menyusuri keliling sebuah siluet, bukan menebar di kisi persegi panjang.
 *
 * Versi pertama memakai `tebar()` pada kotak pembatas, dan hasilnya kosong: band bingkai hanya
 * sekitar sepersepuluh luas kotak itu, jadi hampir semua sel jatuh di interior lalu ditolak
 * uji lubang. Enam dari tiga belas bingkai keluar dengan empat sampai enam elemen saja —
 * terlihat jelas di layar sebagai band yang melompong.
 *
 * Ornamen tepi sungguhan memang menyusuri bandnya. Fungsi ini berjalan sepanjang **panjang
 * busur** siluet luar, menempatkan tiap keping di tengah band, dan memiringkannya mengikuti
 * garis singgung — jadi isen di puncak lengkung ikut memutar bersama lengkungnya, dan tidak
 * ada yang jatuh di luar band.
 *
 * **Mengembalikan daftar `d` absolut, bukan markup — dan itu penting.** Percobaan pertama
 * mengembalikan `<g><path data-mass>` dan menumpuknya di atas band. Hasilnya: delapan belas
 * keping ada di berkas, di koordinat yang benar, dan **tidak satu pun terlihat di layar**.
 * Aturannya sudah tercatat di pack melati jauh sebelum ini — *"massa berwarna sama di atas
 * massa tidak pernah terlihat"* — dan tetap dilanggar.
 *
 * Isen pada sebuah band harus **dilubangi**, bukan ditimpakan: pemanggil menggabungkan daftar
 * ini ke path band lalu merendernya `fill-rule="evenodd"`, sehingga tiap sulur jadi rongga
 * yang menembus. Itu juga yang sebenarnya terjadi pada ukiran tembus.
 */
export function isenTepi(outer, { band = 30, jumlah = 26, skala = 1, arahAwal = 1 } = {}) {
  const rad = band * 0.3 * skala
  return sepanjangTepi(outer, { band, jumlah }).map(({ cx, cy, sudut, urut }) => translateD(
    ukelBertangkai({
      len: rad * 1.35,
      r0: rad,
      turns: 0.8,
      w0: rad * 0.36,
      dir: (urut % 2 === 0 ? 1 : -1) * arahAwal,
      tilt: sudut,
    }),
    cx, cy,
  ))
}

/**
 * **Cecek tepi** — butiran yang menyusuri keliling. Sama seperti `isenTepi`: daftar `d` untuk
 * dilubangi, bukan markup untuk ditimpakan.
 *
 * Dua hal diperbaiki di fase 44, dan keduanya menjawab satu keluhan: *"titik cecek masih
 * terasa tersebar acak ketimbang berirama."*
 *
 * **Pertama, jaraknya.** Versi lama melangkah dengan INDEKS TITIK poligon
 * (`Math.floor(m * i / jumlah)`). Poligon sumbernya disampel `sampleCubics` dengan cacah tetap
 * per segmen kubik, jadi kerapatan titiknya tidak ada hubungannya dengan jarak: segmen pendek
 * tersampel rapat, segmen panjang jarang. Melangkah dengan indeks di atasnya menumpuk butiran
 * di tikungan dan mengosongkan dinding lurus. Sekarang ia memakai `sepanjangTepi()`, penyusur
 * panjang busur yang sama dengan `isenTepi` — jaraknya jadi tetap.
 *
 * **Kedua, iramanya.** Jarak yang tetap saja menghasilkan deretan rata tanpa tekanan, dan
 * ornamen tepi sungguhan selalu bertekanan. `rapport` sudah ada di tiap tema sejak fase 39 dan
 * **tidak pernah dibaca satu pun keluarga isen** — di sinilah ia akhirnya dipakai: tiap butir
 * ke-`rapport` jadi jangkar yang besar, tengah kelompok dapat butir madya, sisanya butir kecil.
 * Besar–kecil–madya–kecil, berulang: itu pelipit bermutiara, bukan taburan.
 *
 * `jumlah` dibulatkan ke kelipatan `rapport` supaya iramanya tertutup rapi saat keliling
 * bertemu awalnya lagi — kalau tidak, ada satu sambungan yang selalu salah ketuk.
 */
export function cecekTepi(outer, { band = 30, jumlah = 40, skala = 1, rapport = 4 } = {}) {
  const r = Math.max(2, Math.round(rapport))
  const bulat = Math.max(r, Math.round(jumlah / r) * r)
  return sepanjangTepi(outer, { band, jumlah: bulat }).map(({ cx, cy, urut }) => {
    const dalam = urut % r
    const madya = r >= 4 && dalam === Math.floor(r / 2)
    const jari = band * skala * (dalam === 0 ? 0.22 : madya ? 0.14 : 0.095)
    return translateD(cakram(jari), cx, cy)
  })
}

/** Ketiga keluarga, dipilih lewat nama supaya resep tema cukup menyebutnya. */
export const keluargaIsen = { ukel: isenUkel, cecek: isenCecek, sawut: isenSawut }

export { at, mass, draw, translateD }
