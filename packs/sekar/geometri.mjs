/**
 * Kosakata bentuk pack `sekar`.
 *
 * **Semua primitif memancarkan kubik**, tidak satu pun polyline tersampel, dan itu keputusan
 * yang diukur bukan selera. `subPathPolyline()` di `scripts/ornament-forge/bentuk.mjs:72`
 * mengembalikan senarai kosong begitu sebuah `d` mengandung `C/S/Q/T/A`, jadi gerbang
 * `potong-diri`, `lonjakan`, dan `runtuh` memang tidak berlaku untuk bentuk kubik — dan
 * `buktiLengkung()` menghitung perintah kurvanya langsung. Bentuk kubik juga lebih ringan:
 * satu kelopak butuh empat perintah, bukan empat puluh titik.
 *
 * Yang masih berlaku dan wajib dijaga tangan: `massa-tertimbun`. Ia membandingkan bidang
 * `data-mass` **di grup yang sama dengan opacity yang sama**, jadi tiap detail yang duduk di
 * atas badan besar harus hidup di `<g>`-nya sendiri atau di bidang nilai yang berbeda.
 *
 * Kosakatanya sendiri — ukel, patran, tumpal, cecek, anyaman — sudah dipakai pack `kayon`
 * dan `melati`; yang baru di sini adalah damask dan kelopak cat air.
 */

/**
 * Satu desimal, bukan dua.
 *
 * Diukur: `rangkaian-kanan` mendarat di 7698 byte dari plafon 8192 dengan dua desimal — 94%
 * terpakai, jadi satu suntingan kecil berikutnya akan menabraknya. Satuan viewBox terkecil di
 * pack ini 120; 0,1 satuan di sana adalah 0,08% lebar keping, jauh di bawah satu piksel pada
 * tiap lebar pakainya. Yang hilang tidak bisa dilihat; yang didapat 12% ruang berkas.
 */
export const n = (v) => Math.round(v * 10) / 10
const rad = (d) => (d * Math.PI) / 180

/** Titik pada lingkaran. Sudut dalam derajat, 0° di kanan, searah jarum jam pada sumbu SVG. */
export const pada = (cx, cy, r, sudut) => [cx + r * Math.cos(rad(sudut)), cy + r * Math.sin(rad(sudut))]

/**
 * Busur lingkaran sebagai rantai kubik.
 *
 * Dipotong tiap ≤90° karena aproksimasi `k = 4/3·tan(θ/4)` baru meleset terlihat di atas itu.
 * Mengembalikan hanya perintah `C`; pemanggil yang menentukan `M`-nya.
 */
export function busur(cx, cy, r, a0, a1) {
  const potong = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90))
  const langkah = (a1 - a0) / potong
  const k = (4 / 3) * Math.tan(rad(langkah) / 4)
  let out = ''
  for (let i = 0; i < potong; i++) {
    const s = a0 + langkah * i
    const e = s + langkah
    const [x0, y0] = pada(cx, cy, r, s)
    const [x1, y1] = pada(cx, cy, r, e)
    const t0 = [-Math.sin(rad(s)), Math.cos(rad(s))]
    const t1 = [-Math.sin(rad(e)), Math.cos(rad(e))]
    out += `C${n(x0 + k * r * t0[0])} ${n(y0 + k * r * t0[1])} ${n(x1 - k * r * t1[0])} ${n(y1 - k * r * t1[1])} ${n(x1)} ${n(y1)}`
  }
  return out
}

/** Cakram penuh — dipakai untuk cecek (butiran isen) dan mata ukel. */
export function cakram(cx, cy, r) {
  return `M${n(cx + r)} ${n(cy)}${busur(cx, cy, r, 0, 360)}Z`
}

/** Cincin: cakram berongga lewat `fill-rule="evenodd"`. Arah dalam sengaja dibalik. */
export function cincin(cx, cy, r, tebal) {
  return `${cakram(cx, cy, r)}M${n(cx + r - tebal)} ${n(cy)}${busur(cx, cy, r - tebal, 0, -360)}Z`
}

/**
 * Spline Catmull-Rom → kubik.
 *
 * Inilah yang membuat bentuk cat air dan sulur bisa ditulis sebagai segelintir jangkar tanpa
 * jadi bersudut. `tegangan` 0,5 adalah CR baku; di bawah itu bentuknya mengempis ke tali
 * busurnya, di atasnya ia mulai melampaui jangkarnya sendiri dan bisa memotong diri.
 */
export function halus(titik, { tutup = true, tegangan = 0.5 } = {}) {
  const p = titik
  const m = p.length
  const ambil = (i) => (tutup ? p[(i + m) % m] : p[Math.min(m - 1, Math.max(0, i))])
  let d = `M${n(p[0][0])} ${n(p[0][1])}`
  const akhir = tutup ? m : m - 1
  for (let i = 0; i < akhir; i++) {
    const p0 = ambil(i - 1); const p1 = ambil(i); const p2 = ambil(i + 1); const p3 = ambil(i + 2)
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tegangan) / 3, p1[1] + ((p2[1] - p0[1]) * tegangan) / 3]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tegangan) / 3, p2[1] - ((p3[1] - p1[1]) * tegangan) / 3]
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`
  }
  return tutup ? d + 'Z' : d
}

/**
 * Ukel — sulur yang menggulung.
 *
 * Jari-jarinya menyusut geometris tiap seperempat putaran, jadi gulungannya mengetat ke dalam
 * seperti ukiran patran, bukan melingkar rata seperti per.
 */
export function ukel(cx, cy, r, { putaran = 1.25, awal = 0, arah = 1, susut = 0.72 } = {}) {
  const langkah = 90 * arah
  const total = Math.round((putaran * 360) / 90)
  let jari = r
  let sudut = awal
  let [x, y] = pada(cx, cy, jari, sudut)
  let d = `M${n(x)} ${n(y)}`
  for (let i = 0; i < total; i++) {
    const jariBaru = jari * susut
    const sudutBaru = sudut + langkah
    const [x1, y1] = pada(cx, cy, jariBaru, sudutBaru)
    const k = (4 / 3) * Math.tan(rad(langkah) / 4)
    const t0 = [-Math.sin(rad(sudut)) * arah, Math.cos(rad(sudut)) * arah]
    const t1 = [-Math.sin(rad(sudutBaru)) * arah, Math.cos(rad(sudutBaru)) * arah]
    d += `C${n(x + Math.abs(k) * jari * t0[0])} ${n(y + Math.abs(k) * jari * t0[1])} ${n(x1 - Math.abs(k) * jariBaru * t1[0])} ${n(y1 - Math.abs(k) * jariBaru * t1[1])} ${n(x1)} ${n(y1)}`
    jari = jariBaru; sudut = sudutBaru; x = x1; y = y1
  }
  return d
}

/**
 * Patran — daun berujung runcing, bermassa.
 *
 * Dua busur asimetris: punggungnya lebih gemuk daripada perutnya, supaya sederet daun pada
 * satu tangkai tidak terbaca sebagai deretan ketupat.
 */
export function daun(x0, y0, x1, y1, lebar, { condong = 0.32 } = {}) {
  const dx = x1 - x0; const dy = y1 - y0
  const panjang = Math.hypot(dx, dy) || 1
  const ux = dx / panjang; const uy = dy / panjang
  const nx = -uy; const ny = ux
  const t = (bagian, sisi) => [
    n(x0 + ux * panjang * bagian + nx * sisi),
    n(y0 + uy * panjang * bagian + ny * sisi),
  ]
  const a1 = t(condong, lebar); const a2 = t(1 - condong * 0.7, lebar * 0.74)
  const b1 = t(1 - condong * 0.7, -lebar * 0.74); const b2 = t(condong, -lebar)
  return `M${n(x0)} ${n(y0)}C${a1[0]} ${a1[1]} ${a2[0]} ${a2[1]} ${n(x1)} ${n(y1)}`
    + `C${b1[0]} ${b1[1]} ${b2[0]} ${b2[1]} ${n(x0)} ${n(y0)}Z`
}

/** Kelopak dari titik pangkal, mengembang lalu membulat di ujung. */
export function kelopak(cx, cy, panjang, lebar, sudut) {
  const ux = Math.cos(rad(sudut)); const uy = Math.sin(rad(sudut))
  const nx = -uy; const ny = ux
  const uj = [cx + ux * panjang, cy + uy * panjang]
  return `M${n(cx)} ${n(cy)}`
    + `C${n(cx + ux * panjang * 0.22 + nx * lebar)} ${n(cy + uy * panjang * 0.22 + ny * lebar)} ${n(uj[0] + nx * lebar * 0.72)} ${n(uj[1] + ny * lebar * 0.72)} ${n(uj[0])} ${n(uj[1])}`
    + `C${n(uj[0] - nx * lebar * 0.72)} ${n(uj[1] - ny * lebar * 0.72)} ${n(cx + ux * panjang * 0.22 - nx * lebar)} ${n(cy + uy * panjang * 0.22 - ny * lebar)} ${n(cx)} ${n(cy)}Z`
}

/**
 * Tumpal — pendant segitiga bersisi cekung, kosakata tepi wastra Nusantara.
 *
 * Sisinya dilengkungkan ke dalam supaya ujungnya terbaca runcing pada ukuran kecil; segitiga
 * bersisi lurus jadi tumpul begitu ornamennya turun ke 40px.
 */
export function tumpal(cx, cy, lebar, tinggi, { cekung = 0.16 } = {}) {
  const kiri = cx - lebar / 2; const kanan = cx + lebar / 2; const dasar = cy
  const uj = cy + tinggi
  return `M${n(kiri)} ${n(dasar)}`
    + `C${n(kiri + lebar * cekung)} ${n(dasar + tinggi * 0.42)} ${n(cx - lebar * cekung * 0.9)} ${n(uj - tinggi * 0.22)} ${n(cx)} ${n(uj)}`
    + `C${n(cx + lebar * cekung * 0.9)} ${n(uj - tinggi * 0.22)} ${n(kanan - lebar * cekung)} ${n(dasar + tinggi * 0.42)} ${n(kanan)} ${n(dasar)}`
    + `C${n(cx + lebar * 0.2)} ${n(dasar - tinggi * 0.09)} ${n(cx - lebar * 0.2)} ${n(dasar - tinggi * 0.09)} ${n(kiri)} ${n(dasar)}Z`
}

/**
 * Poligon bersudut membulat — dua di antaranya bersilang adalah tulang bingkai segi.
 *
 * Sudutnya dibulatkan dengan kubik sungguhan, bukan `stroke-linejoin`: bingkai ini tayang
 * sebagai massa, dan massa tidak punya linejoin.
 */
export function segiBulat(cx, cy, jari, sisi, { mulai = -90, bulat = 0.12, jitter = [] } = {}) {
  const titik = []
  for (let i = 0; i < sisi; i++) {
    const r = jari * (1 + (jitter[i % jitter.length] ?? 0))
    titik.push(pada(cx, cy, r, mulai + (360 / sisi) * i))
  }
  let d = ''
  for (let i = 0; i < sisi; i++) {
    const p0 = titik[i]; const p1 = titik[(i + 1) % sisi]; const p2 = titik[(i + 2) % sisi]
    const a = [p1[0] + (p0[0] - p1[0]) * bulat, p1[1] + (p0[1] - p1[1]) * bulat]
    const b = [p1[0] + (p2[0] - p1[0]) * bulat, p1[1] + (p2[1] - p1[1]) * bulat]
    d += i === 0 ? `M${n(a[0])} ${n(a[1])}` : `L${n(a[0])} ${n(a[1])}`
    d += `C${n(p1[0])} ${n(p1[1])} ${n(p1[0])} ${n(p1[1])} ${n(b[0])} ${n(b[1])}`
  }
  return d + 'Z'
}

/** Rel band: sebuah `d` tertutup yang di-offset ke dalam, jadi cincin lewat `evenodd`. */
export function pita(luar, dalam) {
  return `${luar}${dalam}`
}

/**
 * Simpul damask — medalion simetri cermin di dalam belah ketupat.
 *
 * Diukur dari ubin referensi: satu rapport 144 satuan, medalion mengisi ±0,62 tingginya, dan
 * tiap medalion disambung tetangganya oleh palang mendatar setinggi rapport/2.
 */
export function damask(cx, cy, lebar, tinggi) {
  const w = lebar / 2; const h = tinggi / 2
  const P = (fx, fy) => [cx + w * fx, cy + h * fy]

  /*
   * Badan ogee, bukan belah ketupat.
   *
   * Versi pertama memakai jangkar berjari-jari berselang-seling dan hasilnya bintang bersudut
   * empat: jangkar pinggang yang masuk ke 0,4 menarik spline melewati talinya sendiri. Enam
   * jangkar berpinggang 0,62 memberi siluet ogee yang memang dituju, dan cupingnya dipasang
   * sebagai keping tersendiri — bukan dipaksa lahir dari satu spline.
   */
  const badan = halus([P(0, -1), P(0.62, -0.36), P(0.62, 0.36), P(0, 1), P(-0.62, 0.36), P(-0.62, -0.36)], { tegangan: 0.55 })
  const inti = halus([P(0, -0.3), P(0.17, 0), P(0, 0.3), P(-0.17, 0)], { tegangan: 0.62 })

  /** Empat cuping sulur di pinggang — inilah yang membuatnya terbaca damask, bukan ketupat. */
  const cuping = [
    kelopak(cx + w * 0.42, cy - h * 0.24, Math.min(w, h) * 0.4, Math.min(w, h) * 0.15, -52),
    kelopak(cx - w * 0.42, cy - h * 0.24, Math.min(w, h) * 0.4, Math.min(w, h) * 0.15, 232),
    kelopak(cx + w * 0.42, cy + h * 0.24, Math.min(w, h) * 0.4, Math.min(w, h) * 0.15, 52),
    kelopak(cx - w * 0.42, cy + h * 0.24, Math.min(w, h) * 0.4, Math.min(w, h) * 0.15, 128),
  ].join('')

  /** Ukel di dalam cuping, dipakai sebagai lapisan garis. */
  const sulur = [
    ukel(cx + w * 0.46, cy - h * 0.3, Math.min(w, h) * 0.22, { putaran: 1, awal: 200, arah: 1 }),
    ukel(cx - w * 0.46, cy - h * 0.3, Math.min(w, h) * 0.22, { putaran: 1, awal: 340, arah: -1 }),
    ukel(cx + w * 0.46, cy + h * 0.3, Math.min(w, h) * 0.22, { putaran: 1, awal: 160, arah: -1 }),
    ukel(cx - w * 0.46, cy + h * 0.3, Math.min(w, h) * 0.22, { putaran: 1, awal: 20, arah: 1 }),
  ].join('')

  return { badan, inti, cuping, sulur }
}
