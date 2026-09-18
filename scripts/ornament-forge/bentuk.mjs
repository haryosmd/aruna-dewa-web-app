/**
 * Analisis geometri sebuah `d` — gerbang yang bisa MELIHAT.
 *
 * Modul ini lahir dari satu kalimat di roadmap fase 41: *"delapan gerbang meloloskan tujuh
 * bingkai yang jelas rusak di layar. Gerbang mengukur kepadatan, kelengkungan, bobot,
 * keunikan — tidak satu pun bisa melihat poligon yang memotong dirinya sendiri."*
 *
 * Empat bug fase 41 dipakai sebagai spesifikasi, bukan sebagai ilustrasi. Tiga di antaranya
 * meninggalkan jejak geometris yang bisa diukur; hanya saja tidak ada yang mengukurnya:
 *
 *   1. isen ditimpakan di atas band, bukan dilubangi darinya  → `massaTertimbun`
 *   2. `offsetInward` melonjak di lembah cekung               → `potongDiri`
 *   3. `translateD` meninggalkan titik kontrol di titik asal   → `lonjakan`
 *
 * Yang keempat (metrik `isen` menghitung elemen) sudah dibereskan di fase 41 sendiri.
 *
 * **Semua ambang di sini diukur pada bank yang ada lebih dulu, bukan dikarang.** Plafon bobot
 * 10240 byte fase 39 dikarang sebelum ada ornamen terisi untuk diukur, dan ia langsung salah.
 */

/** Perintah path absolut beserta angkanya. Mesin ini tidak pernah memancarkan relatif. */
export function perintah(d) {
  const out = []
  for (const m of d.matchAll(/([MLCSQTZHVA])([^A-Za-z]*)/gi)) {
    const angka = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number)
    out.push({ cmd: m[1].toUpperCase(), angka })
  }
  return out
}

/**
 * Memecah `d` jadi sub-path, masing-masing sebagai deret **titik jangkar** — titik akhir tiap
 * perintah, bukan titik kontrolnya.
 *
 * Jangkar yang dipakai, bukan seluruh koordinat, karena titik kontrol kubik memang boleh
 * jauh dari kurvanya. Yang dicari gerbang ini adalah rusuk yang melompat, dan lompatan hidup
 * di antara jangkar.
 */
export function subPathJangkar(d) {
  const subs = []
  let kini = null
  let pos = [0, 0]
  for (const { cmd, angka } of perintah(d)) {
    if (cmd === 'M') {
      for (let i = 0; i + 1 < angka.length; i += 2) {
        pos = [angka[i], angka[i + 1]]
        // `M` beruntun adalah `M` lalu `L` implisit; yang pertama membuka sub-path baru.
        if (i === 0) { kini = { titik: [pos], tutup: false }; subs.push(kini) }
        else kini.titik.push(pos)
      }
    }
    else if (cmd === 'L' || cmd === 'T') {
      for (let i = 0; i + 1 < angka.length; i += 2) { pos = [angka[i], angka[i + 1]]; kini?.titik.push(pos) }
    }
    else if (cmd === 'C') {
      for (let i = 0; i + 5 < angka.length; i += 6) { pos = [angka[i + 4], angka[i + 5]]; kini?.titik.push(pos) }
    }
    else if (cmd === 'S' || cmd === 'Q') {
      for (let i = 0; i + 3 < angka.length; i += 4) { pos = [angka[i + 2], angka[i + 3]]; kini?.titik.push(pos) }
    }
    else if (cmd === 'H') { for (const v of angka) { pos = [v, pos[1]]; kini?.titik.push(pos) } }
    else if (cmd === 'V') { for (const v of angka) { pos = [pos[0], v]; kini?.titik.push(pos) } }
    else if (cmd === 'A') {
      for (let i = 0; i + 6 < angka.length; i += 7) { pos = [angka[i + 5], angka[i + 6]]; kini?.titik.push(pos) }
    }
    else if (cmd === 'Z' && kini) kini.tutup = true
  }
  return subs.filter(s => s.titik.length >= 2)
}

/** Sub-path yang benar-benar polyline (`M`/`L`/`Z` saja) — di situlah `poly()` hidup. */
export function subPathPolyline(d) {
  return /[CSQTA]/i.test(d) ? [] : subPathJangkar(d)
}

export function bbox(pts) {
  const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

/** Luas bertanda (shoelace). Nilai mutlaknya dipakai untuk mendeteksi bidang yang runtuh. */
export function luas(pts) {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
  }
  return Math.abs(a) / 2
}

/* ── potong-diri ───────────────────────────────────────────────────────────── */

const silang = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

/**
 * Perpotongan SEJATI dua rusuk: keduanya benar-benar menyeberang, bukan sekadar bersentuhan
 * di ujung. Sentuhan ujung adalah hal biasa pada poligon tertutup dan bukan cacat.
 */
function menyeberang(p1, p2, p3, p4) {
  const d1 = silang(p3, p4, p1); const d2 = silang(p3, p4, p2)
  const d3 = silang(p1, p2, p3); const d4 = silang(p1, p2, p4)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/**
 * Apakah sebuah sub-path memotong dirinya sendiri.
 *
 * **Hanya di dalam SATU sub-path.** Rongga `evenodd` memang hidup berdampingan dengan bandnya
 * di dalam satu `d`, dan membandingkan antar sub-path akan melaporkan tiap ukiran tembus
 * sebagai cacat — yaitu persis pekerjaan yang gerbang ini ada untuk melindunginya.
 *
 * Rusuk dibucket ke kisi supaya siluet 600 titik tidak jadi 180.000 pasangan. Poligon ornamen
 * selalu punya rentang terbatas, jadi bucket cukup.
 */
export function potongDiri(pts, tutup = true) {
  const m = pts.length
  if (m < 4) return null
  const n = tutup ? m : m - 1
  const rusuk = []
  for (let i = 0; i < n; i++) {
    const a = pts[i]; const b = pts[(i + 1) % m]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue
    rusuk.push({ i, a, b })
  }
  const kotak = bbox(pts)
  const sel = Math.max(1e-6, Math.max(kotak.x1 - kotak.x0, kotak.y1 - kotak.y0) / 24)
  const ember = new Map()
  const kunciDari = (r) => {
    const keys = []
    const cx0 = Math.floor(Math.min(r.a[0], r.b[0]) / sel); const cx1 = Math.floor(Math.max(r.a[0], r.b[0]) / sel)
    const cy0 = Math.floor(Math.min(r.a[1], r.b[1]) / sel); const cy1 = Math.floor(Math.max(r.a[1], r.b[1]) / sel)
    for (let x = cx0; x <= cx1; x++) for (let y = cy0; y <= cy1; y++) keys.push(`${x}:${y}`)
    return keys
  }
  for (const r of rusuk) {
    for (const k of kunciDari(r)) {
      const daftar = ember.get(k)
      if (daftar) {
        for (const s of daftar) {
          // Rusuk bertetangga selalu berbagi ujung; itu bukan perpotongan.
          if (Math.abs(r.i - s.i) <= 1 || Math.abs(r.i - s.i) === n - 1) continue
          if (menyeberang(r.a, r.b, s.a, s.b)) return { i: s.i, j: r.i }
        }
        daftar.push(r)
      }
      else ember.set(k, [r])
    }
  }
  return null
}

/* ── lonjakan ──────────────────────────────────────────────────────────────── */

/**
 * Rasio rusuk terpanjang terhadap rusuk tengah dalam satu sub-path.
 *
 * Heuristiknya bukan baru — `offsetInward` sudah memakainya di dalam dirinya sendiri, dan
 * alasannya tertulis di sana: *"sumber poligonnya disampel merata dari rantai kubik, jadi
 * rusuk yang beberapa kali lebih panjang dari rusuk lain pasti lonjakan, bukan dinding
 * lurus."* Yang baru hanya mengangkatnya jadi gerbang, supaya lonjakan yang lolos dari
 * pembersih di dalam `offsetInward` tetap ketahuan sebelum sampai ke layar.
 *
 * Ia juga yang menangkap bug `translateD`: cakram yang titik kontrolnya tertinggal di titik
 * asal meninggalkan satu kaki raksasa di antara jangkar-jangkar kecilnya.
 */
export function lonjakan(pts, tutup = true) {
  const m = pts.length
  if (m < 4) return 1
  const n = tutup ? m : m - 1
  const panjang = []
  for (let i = 0; i < n; i++) {
    const a = pts[i]; const b = pts[(i + 1) % m]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (l > 1e-9) panjang.push(l)
  }
  if (panjang.length < 4) return 1
  const urut = [...panjang].sort((x, y) => x - y)
  const tengah = urut[Math.floor(urut.length / 2)]
  return tengah > 1e-9 ? urut[urut.length - 1] / tengah : 1
}

/* ── runtuh ────────────────────────────────────────────────────────────────── */

/**
 * Sub-path yang bidangnya runtuh — sliver, atau kurang dari tiga titik berbeda.
 *
 * **Hanya berlaku untuk sub-path polyline.** Versi pertama memeriksa semua sub-path lewat
 * titik jangkarnya, dan langsung menuduh 72 glyph: daun sah seperti
 * `M132 20 C122 12 110 8 96 8 C102 18 114 24 132 20 Z` hanya punya dua jangkar, karena
 * badannya hidup di titik kontrol. Itu kesalahan sekeluarga dengan metrik huruf kurva fase 39
 * dan metrik hitung-elemen fase 41: **mengukur bentuk lewat cara penulisannya.** Pada polyline
 * jangkar memang seluruh bentuknya, jadi di sana saja ia sah.
 */
export function runtuh(pts) {
  const unik = new Set(pts.map(p => `${p[0]},${p[1]}`)).size
  if (unik < 3) return true
  const k = bbox(pts)
  const luasKotak = (k.x1 - k.x0) * (k.y1 - k.y0)
  return luasKotak > 1 && luas(pts) < luasKotak * 0.02
}

/* ── massa tertimbun ───────────────────────────────────────────────────────── */

const kotakDidalam = (kecil, besar) =>
  kecil.x0 >= besar.x0 && kecil.x1 <= besar.x1 && kecil.y0 >= besar.y0 && kecil.y1 <= besar.y1

/** Uji titik-dalam-poligon (ray casting), disalin ringkas supaya modul ini tetap mandiri. */
function didalamPoligon(pts, x, y) {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

const pusatDari = (pts) => {
  const m = pts.length
  return pts.reduce((a, p) => [a[0] + p[0] / m, a[1] + p[1] / m], [0, 0])
}

/**
 * Massa sewarna yang ditumpuk di atas massa sewarna — tidak akan pernah terlihat.
 *
 * Aturannya sudah tercatat di pack melati jauh sebelum fase 41 (*"massa berwarna sama di atas
 * massa tidak pernah terlihat"*), disalin ke komentar mesin, lalu tetap dilanggar: delapan
 * belas keping isen ditulis ke berkas, di koordinat yang benar, dan tidak satu pun tampak.
 *
 * Yang diperiksa adalah pasangan bidang `data-mass` **dalam satu grup, pada opacity yang sama,
 * dan tanpa `fill-rule="evenodd"`** — ukiran tembus yang benar hidup sebagai sub-path di dalam
 * satu path `evenodd`, jadi ia tidak pernah muncul sebagai pasangan seperti ini.
 *
 * **Kotak pembatas saja tidak cukup, dan versi pertama memakainya.** Manik yang duduk di
 * SAMPING sebuah tangkai punya kotak yang masih berada di dalam kotak tangkainya, padahal ia
 * jelas terlihat — empat ornamen dituduh begitu. Karena itu kotak hanya dipakai sebagai
 * saringan murah, dan yang memutuskan adalah uji titik-dalam-poligon pada pusat bidang kecil.
 * Ini kesalahan sekeluarga dengan metrik huruf kurva fase 39: mengukur dengan besaran yang
 * mudah dihitung, bukan dengan besaran yang ditanyakan.
 */
export function massaTertimbun(kepingan) {
  for (let i = 0; i < kepingan.length; i++) {
    for (let j = 0; j < kepingan.length; j++) {
      if (i === j) continue
      const a = kepingan[i]; const b = kepingan[j]
      if (a.grup !== b.grup || a.opacity !== b.opacity) continue
      if (a.evenodd || b.evenodd) continue
      if (a.luas >= b.luas) continue
      if (!kotakDidalam(a.kotak, b.kotak)) continue
      // Saringan kotak lolos; sekarang pertanyaan yang sebenarnya.
      if (!b.titik || !a.titik) return { kecil: i, besar: j }
      const [cx, cy] = pusatDari(a.titik)
      if (didalamPoligon(b.titik, cx, cy)) return { kecil: i, besar: j }
    }
  }
  return null
}
