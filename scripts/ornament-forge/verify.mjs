import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { bbox, luas, lonjakan, massaTertimbun, potongDiri, runtuh, subPathJangkar, subPathPolyline } from './bentuk.mjs'

/**
 * Gerbang mutu ornamen — "kaku" dijadikan angka.
 *
 * Tanpa berkas ini, "jangan kaku lagi" hanya selera yang akan luntur di ornamen ke-40.
 * Tiap gerbang di bawah lahir dari temuan audit yang bisa ditunjuk angkanya, bukan dari
 * preferensi: 31% bank tanpa satu pun kurva, 64% tanpa `data-draw`, kategori `motif`
 * rata-rata 14,6 perintah path, dan satu ketupat empat titik yang sama muncul di 13
 * komponen lintas 7 kategori.
 *
 * Modul ini murni pembaca — ia tidak mengubah apa pun dan tidak tahu tentang forge. Itu
 * disengaja: gerbang harus bisa dijalankan pada bank yang digambar tangan maupun yang
 * dibangkitkan, supaya garis dasarnya bisa diukur sebelum ada satu berkas pun digubah.
 */

const web = fileURLToPath(new URL('../../apps/web/', import.meta.url))

/* ── ambang ────────────────────────────────────────────────────────────────── */

export const ambang = {
  /** Perintah kurva (`C/S/Q/T/A`) minimum per ornamen. 41 ornamen lama punya NOL. */
  kurva: 8,
  /** Elemen gambar minimum per kategori — proksi kepadatan isen. */
  elemen: { motif: 12, frame: 10, divider: 10, corner: 10, symbol: 8, seal: 8, layer: 10, floral: 8, monogram: 6, venue: 8, attire: 6, envelopePocket: 2, envelopeFlap: 2 },
  /** Bidang nilai (tingkat opacity berbeda) minimum. */
  bidangNilai: 2,
  /** Ketebalan garis dalam satuan viewBox. DESIGN.md: tidak ada path di bawah 2. */
  stroke: { min: 2.5, max: 4 },
  /**
   * Plafon bobot berkas, byte.
   *
   * **Angka lama (10240) dikarang sebelum ada datanya**, saat belum ada satu pun ornamen
   * yang benar-benar terisi untuk diukur. Setelah tiga belas bingkai digubah dengan tepi
   * berukir sungguhan, biayanya terukur 9–13 KB — jadi plafon lama akan memaksa ornamennya
   * dibuat lebih miskin demi sebuah angka yang tidak punya dasar, yaitu persis keluhan yang
   * sedang diperbaiki.
   *
   * Dinaikkan ke 16 KB, dan itu aman karena `Glyph.vue` sekarang memuat ornamen secara malas:
   * tamu hanya mengunduh ornamen temanya, bukan ornamen dua belas tema. Diukur pada build
   * produksi halaman undangan yang sama — eager 956 KB, malas 758 KB, render identik.
   *
   * **20 KB sejak fase 44, dan angkanya punya sebab yang terlihat.** 16 KB diukur ketika
   * seluruh bingkai bersiluet MULUS. `frame-bentar` yang berundak adalah yang pertama tidak,
   * dan biayanya bukan dari siluetnya: ia justru bertitik lebih sedikit daripada
   * `frame-gunungan` (921 lawan 1.324). Yang mahal adalah butiran cecek pada band-nya — tiap
   * cakram adalah empat busur kubik berkoordinat absolut, sekitar 150 byte, dan bingkai
   * berundak punya band di kedua paruhnya. Kerapatan cecek sudah dipotong 28 → 20 butir per
   * paruh lebih dulu; sisanya adalah harga bentuk yang memang lebih kaya, dan menekannya lagi
   * berarti membuat ornamen miskin demi angka — persis keluhan yang sedang diperbaiki.
   */
  /*
   * `divider` dan `corner` 10 KB sejak fase 45, dan angkanya diukur.
   *
   * Plafon `lain` 8192 ditetapkan fase 39 ketika sebuah pemisah benar-benar dua path dan
   * empat elemen — yaitu keadaan yang jadi keluhan. Pemisah dan sudut yang digubah membawa
   * plat aksen, band bertepi gelombang, rongga isen, pertumbuhan, dan rel garis; diukur,
   * sembilan pemisah mendarat di 6,0–8,4 KB dan sepuluh sudut di 6,8–8,5 KB. Tiga di antaranya
   * melewati plafon lama sebanyak 1,5–3,2%.
   *
   * `motif` ikut 10 KB pada fase 46, dan sebabnya sama. Delapan dari sembilan motif yang
   * digubah mendarat di 4,5–7,6 KB; hanya `motif-catur` (tema berundak, unit paling mahal di
   * kosakata) yang sampai 9,3 KB. Pengulangan sudah dibatasi enam unit lebih dulu, turun dari
   * tujuh — bukan demi plafonnya, melainkan karena di atas enam unitnya terlalu kecil untuk
   * terbaca pada lebar pakainya.
   *
   * `seal` ikut 10 KB pada fase 47. Segel membawa bibir lilin bertema yang dipakai TIGA kali —
   * plat aksen, badan bertembus butiran, dan rel garis — jadi satu siluet berharga tiga kali.
   * Kerapatan sampelnya sudah dilonggarkan 5 → 8 satuan dan rel dari 34 → 24 titik lebih dulu;
   * sesudah itu kesembilannya mendarat di 8,3–10,1 KB.
   *
   * Yang dipotong lebih dulu adalah yang memang bisa dipotong tanpa kehilangan bentuk:
   * kerapatan isen `16 + rapport × 2` → `9 + rapport`, kerapatan sampel 6 → 9 satuan, dan rel
   * didesimasi sepertiga. Sisanya harga bentuk yang lebih kaya. Menekannya lagi berarti
   * membuat ornamen miskin demi angka yang ditetapkan sebelum ada ornamen terisi untuk diukur.
   */
  /*
   * `floral` ikut 10240 pada fase 53, dan sebabnya sama dengan empat kategori sebelumnya:
   * plafon 8192 ditetapkan fase 39 ketika sebuah floral benar-benar setangkai ranting tipis.
   *
   * Diukur pada 23 floral yang ada sekarang: 670–18.296 byte, dan **empat di antaranya sudah
   * melewati 8192 sebelum pack `sekar` ada** (`melati-tangkai-kenanga` 8375,
   * `melati-tangkai-sedap-malam` 9334, `melati-rumpun-kantil` 12.582, `kayon-mawar-mekar`
   * 18.296). Floral yang digubah membawa tangkai bermassa, dedaunan berona sendiri, dan mawar
   * berkelopak empat cincin; dua keping `sekar-rangkaian-*` mendarat di 8432 dan 8549 — lewat
   * 2,9% dan 4,4%.
   *
   * Yang bisa dipotong sudah dipotong lebih dulu, dan angkanya ada: kerapatan sampel tangkai
   * 14 → 6 per ruas, desimasi rel 1/3 → 1/2, dan cincin kelopak keempat dicabut dari kuncup
   * berjari-jari di bawah 24 (18.172 → 8432 pada keping terberat). Sisanya harga bentuk yang
   * memang lebih kaya.
   *
   * Dua keping terberat — `melati-rumpun-kantil` dan `kayon-mawar-mekar` — tetap di atas
   * plafon baru dan tetap tercatat di garis dasar. Plafon dinaikkan ke angka yang ditemukan
   * pada floral yang sudah digubah, bukan ke angka yang membuat semuanya lolos.
   */
  bobot: {
    frame: 20480, layer: 16384, venue: 16384,
    divider: 10240, corner: 10240, motif: 10240, seal: 10240, floral: 10240,
    lain: 8192,
  },
  /** Kemiripan path ternormalisasi maksimum antar glyph di kategori unik. */
  kemiripan: 0.88,
  /**
   * Rasio rusuk terpanjang terhadap rusuk tengah dalam satu sub-path polyline.
   *
   * **Diukur, tidak dikarang** — pelajaran plafon bobot 10240 fase 39. Sebaran pada 133 glyph
   * setelah dua perbaikan mesin di fase 42: p50 1,0 · p90 1,9 · p99 5,5 · maks 6,7. Sebelum
   * perbaikan, `frame-rounded` sendirian ada di **418,9**, dua kali lipat lebih jauh dari
   * seluruh bank digabung. Plafon 8 memberi ruang bagi glyph tangan yang sampelnya memang
   * tidak serata keluaran mesin, dan tetap menangkap kelas cacatnya dengan selisih 50×.
   */
  lonjakan: 8,
}

/** Kategori yang DESIGN.md:295 wajibkan unik antar tema. */
export const kategoriUnik = ['frame', 'divider', 'corner', 'motif', 'symbol', 'seal']

/**
 * Ornamen yang memang rectilinear menurut bentuknya, beserta alasannya.
 *
 * Pengecualian harus **dideklarasikan dengan alasan**, bukan diam-diam dilewati. Kalau
 * sebuah ornamen ada di sini tanpa alasan yang masuk akal, itu tanda ia sebenarnya cuma
 * belum digambar.
 */
export const rectilinear = {
  'motif-catur': 'Papan catur dua nilai selang-seling; melengkungkannya justru salah.',
  'motif-songket': 'Songket adalah tenun pakan tambahan — polanya lurus karena benangnya lurus.',
  'amplop-kantong-lurus': 'Kantong amplop adalah lipatan kertas; lipatan yang lurus memang lurus.',
  'amplop-flap-runcing': 'Flap segitiga: dua lipatan lurus bertemu di ujung.',
  'amplop-flap-bertakik': 'Gerigi tumpal adalah guntingan lurus; melengkungkannya menghapus takiknya.',
}

/* ── pembacaan ─────────────────────────────────────────────────────────────── */

const baca = (rel) => readFileSync(web + rel, 'utf8')

/** Bank ornamen: id → { file, nama, kategori }. */
export function bacaBank() {
  const src = baca('utils/ornaments.ts')
  const out = {}
  const objek = /'([a-z0-9-]+)':\s*\{\s*component:\s*'Ornament(\w+)',\s*name:\s*'([^']*)',\s*category:\s*'(\w+)'/g
  for (const m of src.matchAll(objek)) out[m[1]] = { file: m[2], nama: m[3], kategori: m[4] }
  // 45 keping `layer` didaftarkan lewat helper `layer(...)`, bukan objek literal. Tanpa pola
  // kedua ini sepertiga bank tidak pernah ikut diukur — dan justru sepertiga itu yang paling
  // sering dilihat tamu saat menggulir.
  const helper = /'([a-z0-9-]+)':\s*layer\('Ornament(\w+)',\s*'([^']*)'/g
  for (const m of src.matchAll(helper)) out[m[1]] = { file: m[2], nama: m[3], kategori: 'layer' }
  return out
}

/** Set ornamen per tema, untuk gerbang keunikan dan kohesi. */
export function bacaTema() {
  const src = baca('utils/theme.ts')
  const out = {}
  for (const m of src.matchAll(/'(aruna-[a-z]+)':\s*\{([\s\S]*?)\n  \},/g)) {
    const blok = m[2]
    const orn = {}
    for (const k of kategoriUnik) {
      const hit = blok.match(new RegExp(`\\b${k}:\\s*'([a-z0-9-]+)'`))
      if (hit) orn[k] = hit[1]
    }
    if (Object.keys(orn).length) out[m[1]] = orn
  }
  return out
}

/** Berkas komponen sebuah ornamen, beserta blok `<svg>`-nya. */
export function bacaGlyph(file) {
  const rel = `components/ornament/${file}.vue`
  const raw = baca(rel)
  const svg = raw.match(/<svg[\s\S]*?<\/svg>/)
  return { rel, raw, svg: svg ? svg[0] : '', bytes: Buffer.byteLength(raw, 'utf8') }
}

/* ── pengukuran satu glyph ─────────────────────────────────────────────────── */

const HURUF_KURVA = /[CSQTA]/g

/**
 * Titik-titik sebuah path polyline (`M`/`L` saja). Path ber-kubik dikembalikan kosong —
 * ia sudah terbukti melengkung lewat huruf perintahnya.
 */
function titikPolyline(d) {
  if (HURUF_KURVA.test(d.toUpperCase())) return []
  const angka = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  const pts = []
  for (let i = 0; i + 1 < angka.length; i += 2) pts.push([angka[i], angka[i + 1]])
  return pts
}

/**
 * Bukti kelengkungan sebuah path.
 *
 * **Menghitung huruf `C`/`S`/`Q` saja adalah metrik yang salah, dan itu ketahuan dengan
 * cara yang mahal.** `bingkai-kayon.svg` — ornamen paling kaya di seluruh repo — punya
 * **nol** perintah kurva dan 3.341 perintah garis: ia poligon hasil sampling rantai kubik.
 * Gerbang yang menghitung huruf akan menghukumnya sebagai primitif, dan akan memblokir
 * seluruh keluaran mesin ini, yang memakai teknik yang sama.
 *
 * Yang membedakan kurva tersampel dari kotak bukan huruf perintahnya, melainkan **banyak
 * titik dengan belokan kecil**. Kotak: 4 titik, belok 90°. Ketupat: 4 titik, belok 90°.
 * Kurva tersampel: puluhan titik, belok di bawah 25°.
 */
export function buktiLengkung(d) {
  const kubik = (d.toUpperCase().match(HURUF_KURVA) || []).length
  if (kubik) return kubik

  /*
   * Tiap sub-path dinilai SENDIRI.
   *
   * `ukelBertangkai` — primitif terpenting di seluruh kosakata — memancarkan dua sub-path
   * dalam satu `d`: pita batang lalu spiralnya. Dibaca sebagai satu deret titik, lompatan
   * antar sub-path dan balikan tajam di ujung batang membuat belokan rata-ratanya meledak,
   * dan primitif yang paling melengkung di repo ini dinilai nol. Itu ketahuan karena metrik
   * ini diuji pada bentuk yang sudah diketahui jawabannya, bukan hanya dijalankan pada bank.
   */
  let bukti = 0
  for (const sub of d.split(/(?=M)/)) {
    const pts = titikPolyline(sub)
    if (pts.length < 16) continue

    let jumlahBelok = 0
    let n2 = 0
    for (let i = 1; i + 1 < pts.length; i++) {
      const a = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]
      const b = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]]
      const la = Math.hypot(...a); const lb = Math.hypot(...b)
      if (la < 1e-6 || lb < 1e-6) continue
      const cos = Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))
      jumlahBelok += Math.abs(Math.acos(cos))
      n2 += 1
    }
    if (!n2) continue
    // Belokan rata-rata di atas 25° berarti bentuknya bersudut, bukan melengkung — berapa
    // pun banyak titiknya. Poligon bergerigi tidak boleh lolos karena titiknya banyak.
    if (((jumlahBelok / n2) * 180) / Math.PI > 25) continue
    bukti += Math.round(pts.length / 4)
  }
  return bukti
}

/**
 * Tiap `<path>` beserta konteksnya: grup keberapa, opacity efektifnya, dan apakah ia bidang
 * `evenodd`. Dibutuhkan gerbang `massa-tertimbun`, yang menanyakan pertanyaan yang tidak bisa
 * dijawab oleh `d` sendirian — dua bidang sewarna di grup yang sama saling menimbun atau tidak.
 */
export function kepingan(svg) {
  const out = []
  let grup = 0
  let opacityGrup = '1'
  for (const m of svg.matchAll(/<g\b[^>]*>|<\/g>|<path\b[^>]*>/g)) {
    const tag = m[0]
    if (tag.startsWith('<g')) {
      grup += 1
      opacityGrup = (tag.match(/opacity="([\d.]+)"/) || [])[1] ?? '1'
      continue
    }
    if (tag === '</g>') { opacityGrup = '1'; continue }
    const d = (tag.match(/\bd="([^"]+)"/) || [])[1]
    if (!d) continue
    out.push({
      d,
      grup,
      opacity: (tag.match(/opacity="([\d.]+)"/) || [])[1] ?? opacityGrup,
      evenodd: /evenodd/.test(tag),
      mass: /data-mass|data-seal-body/.test(tag),
      draw: /data-draw/.test(tag),
    })
  }
  return out
}

export function ukur(id, entri) {
  const { svg, bytes, rel } = bacaGlyph(entri.file)
  const ds = [...svg.matchAll(/\bd="([^"]+)"/g)].map(m => m[1])

  const kurva = ds.reduce((jml, d) => jml + buktiLengkung(d), 0)
  const elemen = (svg.match(/<(path|circle|rect|ellipse|polygon|line)\b/g) || []).length

  /*
   * Kepadatan isen diukur dari SUB-PATH, bukan dari jumlah elemen.
   *
   * Metrik pertama menghitung elemen, dan itu salah begitu isen dikerjakan dengan benar:
   * isen pada sebuah band harus DILUBANGI, bukan ditimpakan, jadi delapan belas sulur tembus
   * hidup sebagai delapan belas sub-path di dalam SATU `<path>` ber-`fill-rule="evenodd"`.
   * Dihitung per elemen, bingkai yang justru paling padat terbaca sebagai yang paling kosong —
   * dan gerbangnya akan menghukum persis pekerjaan yang ia ada untuk mendorongnya.
   */
  const subpath = ds.reduce((jml, d) => jml + (d.match(/M/g) || []).length, 0)

  // `v-for` membuat elemen terrender lebih banyak dari hitungan statis; kalikan kasar supaya
  // ornamen ber-`v-for` tidak terbaca lebih miskin daripada yang sebenarnya dirender.
  const vfor = [...svg.matchAll(/v-for="\w+ in \[([^\]]*)\]"/g)].map(m => m[1].split(',').length)
  const elemenTerrender = vfor.length ? elemen * Math.max(...vfor) : elemen

  /*
   * Gerbang geometris fase 42 — yang bisa MELIHAT.
   *
   * Delapan gerbang fase 41 mengukur kepadatan, kelengkungan, bobot, dan keunikan, lalu
   * meloloskan tujuh bingkai yang jelas rusak di layar. Keempat metrik di bawah adalah empat
   * bug fase 41 yang diubah jadi angka; `potong-diri` langsung menemukan bahwa SEPULUH dari
   * tiga belas bingkai yang dinyatakan selesai masih memotong dirinya sendiri.
   */
  const potong = []
  let lonjakanMaks = 1
  let runtuhJml = 0
  const bidang = []
  for (const k of kepingan(svg)) {
    for (const sub of subPathPolyline(k.d)) {
      if (potongDiri(sub.titik, sub.tutup)) potong.push(k.d.slice(0, 24))
      lonjakanMaks = Math.max(lonjakanMaks, lonjakan(sub.titik, sub.tutup))
      // Lapisan garis memang tidak berbidang, jadi "runtuh" tidak berarti apa-apa di sana.
      if (!k.draw && sub.tutup && runtuh(sub.titik)) runtuhJml += 1
    }
    if (!k.mass) continue
    for (const sub of subPathJangkar(k.d)) {
      bidang.push({ grup: k.grup, opacity: k.opacity, evenodd: k.evenodd, luas: luas(sub.titik), kotak: bbox(sub.titik), titik: sub.titik })
    }
  }
  const tertimbun = massaTertimbun(bidang)

  const opac = new Set(['1', ...[...svg.matchAll(/opacity="([\d.]+)"/g)].map(m => m[1])])
  const strokes = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => parseFloat(m[1]))
  const punyaDraw = /data-draw/.test(svg)
  const punyaMass = /data-mass|data-seal-body/.test(svg)

  return {
    id, rel, kategori: entri.kategori, bytes,
    kurva, elemen, elemenTerrender, subpath, bidangNilai: opac.size,
    strokes, punyaDraw, punyaMass, ds,
    potong: potong.length, lonjakanMaks, runtuh: runtuhJml, tertimbun: Boolean(tertimbun),
  }
}

/* ── gerbang ───────────────────────────────────────────────────────────────── */

export function gerbangGlyph(u) {
  const gagal = []
  const plafon = ambang.bobot[u.kategori] ?? ambang.bobot.lain

  if (u.kurva < ambang.kurva && !rectilinear[u.id]) {
    gagal.push({ gerbang: 'kurva', pesan: `${u.kurva} perintah kurva, minimum ${ambang.kurva}` })
  }
  const minElemen = ambang.elemen[u.kategori] ?? 8
  // Yang lebih padat dari keduanya yang dipakai: ornamen boleh mencapai kepadatan lewat
  // banyak elemen (glyph lama) atau lewat banyak sub-path tertembus (glyph forge).
  const padat = Math.max(u.elemenTerrender, u.subpath)
  if (padat < minElemen) {
    gagal.push({ gerbang: 'isen', pesan: `${padat} keping, minimum ${minElemen} untuk kategori ${u.kategori}` })
  }
  if (u.bidangNilai < ambang.bidangNilai) {
    gagal.push({ gerbang: 'bidang-nilai', pesan: `${u.bidangNilai} tingkat opacity, minimum ${ambang.bidangNilai}` })
  }
  if (!u.punyaDraw) {
    gagal.push({ gerbang: 'data-draw', pesan: 'tidak ada grup garis — tidak bisa dianimasi DrawSVG' })
  }
  if (!u.punyaMass) {
    gagal.push({ gerbang: 'data-mass', pesan: 'tidak ada badan bermassa' })
  }
  for (const w of u.strokes) {
    if (w < ambang.stroke.min || w > ambang.stroke.max) {
      gagal.push({ gerbang: 'stroke', pesan: `stroke-width ${w} di luar ${ambang.stroke.min}–${ambang.stroke.max}` })
    }
  }
  if (u.bytes > plafon) {
    gagal.push({ gerbang: 'bobot', pesan: `${u.bytes} byte, plafon ${plafon}` })
  }
  if (u.potong) {
    gagal.push({ gerbang: 'potong-diri', pesan: `${u.potong} sub-path memotong dirinya sendiri` })
  }
  if (u.lonjakanMaks > ambang.lonjakan) {
    gagal.push({ gerbang: 'lonjakan', pesan: `rusuk terpanjang ${u.lonjakanMaks.toFixed(1)}× rusuk tengah, plafon ${ambang.lonjakan}` })
  }
  if (u.runtuh) {
    gagal.push({ gerbang: 'runtuh', pesan: `${u.runtuh} sub-path berbidang runtuh` })
  }
  if (u.tertimbun) {
    gagal.push({ gerbang: 'massa-tertimbun', pesan: 'massa sewarna ditumpuk di atas massa sewarna — tidak akan terlihat' })
  }
  return gagal
}

/* ── keunikan lintas tema ──────────────────────────────────────────────────── */

/**
 * Menormalkan sebuah `d` jadi sidik jari yang tahan geser dan skala.
 *
 * Empat pelanggaran DESIGN.md:295 yang ada sekarang tidak satu pun identik byte-per-byte —
 * semuanya bentuk yang sama digeser beberapa piksel atau diskalakan sedikit. Membandingkan
 * string mentah tidak akan menangkapnya; itu sebabnya koordinat digeser ke titik pertama
 * lalu diskalakan ke kotak satuan sebelum dibandingkan.
 */
export function sidik(d) {
  const huruf = (d.match(/[A-Za-z]/g) || []).join('')
  const angka = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  if (angka.length < 4) return null
  const xs = angka.filter((_, i) => i % 2 === 0)
  const ys = angka.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs); const y0 = Math.min(...ys)
  const span = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1
  return { huruf, titik: angka.map((v, i) => ((i % 2 === 0 ? v - x0 : v - y0) / span)) }
}

export function miripkah(a, b) {
  if (!a || !b || a.huruf !== b.huruf || a.titik.length !== b.titik.length) return 0
  let jumlah = 0
  for (let i = 0; i < a.titik.length; i++) jumlah += Math.abs(a.titik[i] - b.titik[i])
  return 1 - Math.min(1, jumlah / a.titik.length / 0.2)
}

/** Pasangan glyph di kategori unik yang geometrinya terlalu mirip, lintas tema. */
export function gerbangKeunikan(ukuran, tema) {
  const pemilik = {}
  for (const [id, set] of Object.entries(tema)) {
    for (const g of Object.values(set)) (pemilik[g] ??= []).push(id)
  }
  const kandidat = Object.values(ukuran).filter(u => kategoriUnik.includes(u.kategori))
  const langgar = []
  for (let i = 0; i < kandidat.length; i++) {
    for (let j = i + 1; j < kandidat.length; j++) {
      const a = kandidat[i]; const b = kandidat[j]
      // Hanya berarti kalau keduanya benar-benar dipakai, dan oleh tema yang berbeda.
      const ta = pemilik[a.id]; const tb = pemilik[b.id]
      if (!ta || !tb || ta.every(t => tb.includes(t))) continue
      /*
       * Sidik dengan titik terlalu sedikit dibuang. Sebuah garis dua titik atau ketupat
       * empat titik akan cocok dengan ribuan bentuk lain setelah dinormalkan — dan itu
       * melaporkan pelanggaran di tempat yang sebenarnya cuma primitif yang sama. Yang
       * dicari gerbang ini adalah bentuk yang digambar, bukan primitif yang kebetulan sama.
       */
      const sa = a.ds.map(sidik).filter(x => x && x.titik.length >= 12)
      const sb = b.ds.map(sidik).filter(x => x && x.titik.length >= 12)
      if (!sa.length || !sb.length) continue
      let cocok = 0
      for (const x of sa) for (const y of sb) if (miripkah(x, y) >= ambang.kemiripan) { cocok += 1; break }
      // `cocok` dihitung dari `sa` saja, jadi pembaginya harus `sa.length` — memakai `min()`
      // menghasilkan pecahan di atas 1, yang jelas bukan pecahan.
      const frac = cocok / sa.length
      if (frac >= 0.4) langgar.push({ a: a.id, b: b.id, temaA: ta, temaB: tb, path: cocok, frac: Math.round(frac * 100) / 100 })
    }
  }
  return langgar
}

/* ── kohesi tema ───────────────────────────────────────────────────────────── */

/**
 * Sebelas glyph satu tema wajib berbagi ketebalan garis dan punya lapisan garis.
 *
 * Inilah gerbang yang langsung menjawab keluhan "ornamen dan bingkai tidak cocok": kalau
 * bingkai memakai stroke 3 dan pemisahnya 2,6 sementara sudutnya tidak punya garis sama
 * sekali, ketiganya memang tidak akan pernah terbaca sebagai satu keluarga.
 */
export function gerbangKohesi(ukuran, tema) {
  const hasil = []
  for (const [id, set] of Object.entries(tema)) {
    const anggota = Object.values(set).map(g => ukuran[g]).filter(Boolean)
    if (!anggota.length) continue
    const lebar = [...new Set(anggota.flatMap(a => a.strokes))]
    const tanpaGaris = anggota.filter(a => !a.punyaDraw).map(a => a.id)
    const masalah = []
    if (lebar.length > 1) masalah.push(`ketebalan garis tidak seragam: ${lebar.join(', ')}`)
    if (tanpaGaris.length) masalah.push(`${tanpaGaris.length} glyph tanpa lapisan garis: ${tanpaGaris.join(', ')}`)
    if (masalah.length) hasil.push({ tema: id, masalah })
  }
  return hasil
}

/* ── laporan ───────────────────────────────────────────────────────────────── */

export function jalankan() {
  const bank = bacaBank()
  const tema = bacaTema()
  const ukuran = {}
  for (const [id, entri] of Object.entries(bank)) ukuran[id] = ukur(id, entri)

  const perGlyph = {}
  for (const [id, u] of Object.entries(ukuran)) {
    const g = gerbangGlyph(u)
    if (g.length) perGlyph[id] = g.map(x => x.gerbang).sort()
  }

  return {
    jumlahGlyph: Object.keys(bank).length,
    jumlahTema: Object.keys(tema).length,
    perGlyph,
    keunikan: gerbangKeunikan(ukuran, tema),
    kohesi: gerbangKohesi(ukuran, tema),
    ukuran,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = jalankan()
  const total = Object.keys(r.perGlyph).length
  console.log(`glyph: ${r.jumlahGlyph} · tema: ${r.jumlahTema}`)
  console.log(`gagal gerbang: ${total} glyph (${Math.round((total / r.jumlahGlyph) * 100)}%)`)
  const tally = {}
  for (const g of Object.values(r.perGlyph)) for (const x of g) tally[x] = (tally[x] || 0) + 1
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(14)} ${v}`)
  console.log(`pelanggaran keunikan: ${r.keunikan.length}`)
  for (const v of r.keunikan) console.log(`  ${v.a} ↔ ${v.b}  (${v.path} path, frac ${v.frac})`)
  console.log(`tema tidak kohesif: ${r.kohesi.length}`)
}
