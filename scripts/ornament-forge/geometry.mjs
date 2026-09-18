/**
 * Primitif geometri untuk seluruh bank ornamen Aruna.
 *
 * **Diangkat dari `docs/features/ornament-builder/originals/kayon/geometry.mjs`**, bukan
 * ditulis ulang. Modul itu sudah membangun 39 glyph dan empat aturannya masing-masing lahir
 * dari kegagalan yang sudah terjadi dan tercatat; menulis ulang berarti menemukan kembali
 * keempat kegagalan itu. Yang ditambahkan di sini hanya primitif yang belum ada di sana.
 *
 * Semua bentuk **dihitung, bukan ditrace**. Tidak ada titik yang disalin dari gambar
 * referensi; yang diambil dari referensi adalah kosakata bentuknya dan proporsinya.
 *
 * Aturan `DESIGN.md` yang dipatuhi semua keluaran di sini:
 *   - badan bentuk `fill="currentColor"` bertanda `data-mass`
 *   - garis bertanda `data-draw`, `stroke-width` 2,5–4 dalam satuan viewBox
 *   - dua bidang nilai per glyph: opacity 1 dan 0,45
 *   - bingkai berongga lewat `fill-rule="evenodd"`, bukan dengan mengisi dalamnya
 */

/**
 * Pembulatan satu desimal yang tidak pernah menghasilkan `-0`.
 *
 * Pack kayon memakai dua desimal dan berkas terbesarnya 44 KB — sebelas kali ornamen
 * produksi terberat, dan jauh di atas plafon bobot. Pada viewBox 300–600 satuan, satu
 * desimal berarti presisi 0,03% dari lebar; tidak ada mata yang bisa melihat bedanya, dan
 * ia memotong sekitar seperlima berkas. Presisi diturunkan **di sumbernya**, bukan ditambal
 * dengan optimasi setelah berkasnya jadi.
 */
export const n = (v) => {
  const r = Math.round(v * 10) / 10
  return Object.is(r, -0) ? 0 : r
}

export const poly = (pts, close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('') + (close ? 'Z' : '')

/** Evaluasi satu segmen kubik. */
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

/** Sampel rantai kubik `[[p0,p1,p2,p3], ...]` menjadi poligon. */
export function sampleCubics(chain, per = 22) {
  const out = []
  for (const seg of chain) {
    for (let i = 0; i < per; i++) out.push(cubic(seg[0], seg[1], seg[2], seg[3], i / per))
  }
  return out
}

/**
 * Sampel rantai kubik dengan kerapatan mengikuti PANJANG, bukan cacah tetap per segmen.
 *
 * `sampleCubics` memberi tiap segmen jumlah titik yang sama berapa pun panjangnya. Untuk
 * rantai yang segmennya sebanding itu tidak apa-apa; untuk rantai campuran — filet sepanjang
 * 5 satuan bersebelahan dengan dinding sepanjang 30 — hasilnya rusuk terpanjang 9× rusuk
 * tengah, dan dua hal ikut rusak: gerbang `lonjakan` menolaknya, dan `offsetInward` menyatakan
 * sendiri heuristiknya "akan gagal pada poligon yang rusuknya sangat tidak seragam".
 *
 * Aturan yang sama sudah dipakai `ukel()` sejak fase 39, dan alasannya sama: biaya sampel
 * harus sebanding dengan apa yang benar-benar terlihat.
 */
export function sampleCubicsRata(chain, langkah = 7) {
  const out = []
  for (const seg of chain) {
    // Panjang tali busur kontrol sebagai taksiran panjang segmen — cukup untuk memilih cacah.
    let kira = 0
    for (let i = 0; i < 3; i += 1) kira += Math.hypot(seg[i + 1][0] - seg[i][0], seg[i + 1][1] - seg[i][1])
    /*
     * Ruas yang lebih pendek dari satu langkah cukup satu titik.
     *
     * Batas bawah dua memaksa filet sepanjang 0,9 satuan menyumbang dua titik berjarak 0,45
     * sementara dinding di sebelahnya berjarak 2,4 — rusuk terpanjang jadi 8,9× rusuk tengah,
     * dan gerbang `lonjakan` menolaknya. Satu titik untuk ruas pendek membuat jarak antar titik
     * sebanding di seluruh rantai, yang memang tujuan fungsi ini.
     */
    const per = kira < langkah ? 1 : Math.max(2, Math.min(28, Math.round(kira / langkah)))
    for (let i = 0; i < per; i += 1) out.push(cubic(seg[0], seg[1], seg[2], seg[3], i / per))
  }
  return out
}

function norm(v) {
  const l = Math.hypot(v[0], v[1])
  return l < 1e-9 ? null : [v[0] / l, v[1] / l]
}

/**
 * Offset poligon tertutup ke dalam sejauh `d` lewat bisektor sudut.
 *
 * Dipakai untuk membuat band bingkai yang tebalnya rata. **Bukan** hasil menskalakan bentuk
 * terhadap pusatnya — cara itu selalu menebalkan ujung yang jauh dari pusat, dan itu sudah
 * pernah dicoba.
 */
export function offsetInward(pts, d) {
  /*
   * Buang titik kembar berturut-turut LEBIH DULU.
   *
   * Rantai kubik boleh punya titik kontrol yang berimpit (dipakai untuk membuat segmen lurus),
   * dan `sampleCubics` menyalinnya apa adanya jadi deretan titik yang sama persis. Rusuk
   * nol-panjang membuat normalnya tidak terdefinisi, `norm()` mengembalikan null, bisektornya
   * jatuh ke normal tetangga, dan titik hasilnya melompat ke arah yang salah.
   *
   * Ini penyebab berkas garis memancar yang merusak tujuh dari tiga belas bingkai — dan
   * delapan gerbang mutu meloloskan semuanya, karena tidak satu pun dari mereka bisa melihat
   * poligon yang memotong dirinya sendiri. Yang menemukannya adalah melihat layarnya.
   */
  const rapat = pts.filter((q, i) => {
    const r = pts[(i + 1) % pts.length]
    return Math.hypot(r[0] - q[0], r[1] - q[1]) > 1e-6
  })
  pts = rapat.length >= 8 ? rapat : pts

  const m = pts.length
  const out = []
  for (let i = 0; i < m; i++) {
    const p = pts[i]
    const a = pts[(i - 1 + m) % m]
    const b = pts[(i + 1) % m]
    const n1 = norm([p[1] - a[1], a[0] - p[0]])
    const n2 = norm([b[1] - p[1], p[0] - b[0]])
    let bis = norm([n1[0] + n2[0], n1[1] + n2[1]])
    if (!bis) bis = n1
    const cos = bis[0] * n1[0] + bis[1] * n1[1]
    const scale = Math.min(3, 1 / Math.max(0.35, cos))
    out.push([p[0] - bis[0] * d * scale, p[1] - bis[1] * d * scale])
  }

  /*
   * Buang lonjakan di sudut cekung dalam.
   *
   * Pada lembah antar gonjong dan undakan art deco, bisektornya berbalik arah dan titik
   * hasilnya melompat jauh melewati tetangganya — poligonnya jadi memotong dirinya sendiri.
   * Di layar itu muncul sebagai berkas garis memancar dari satu titik, dan ia merusak dua
   * dari tiga belas bingkai.
   *
   * Penjepit `scale` tidak cukup, dan uji titik-dalam-poligon juga tidak: titik lonjakan
   * tetap berada DI DALAM siluet, ia hanya menyeberangi rusuk lain. Yang membedakannya adalah
   * **panjang rusuknya** — sumber poligonnya disampel merata dari rantai kubik, jadi rusuk
   * yang beberapa kali lebih panjang dari rusuk lain pasti lonjakan, bukan dinding lurus.
   *
   * Offset poligon yang benar-benar tahan perlu kliping self-intersection. Ini heuristik,
   * dan ditulis sebagai heuristik: cukup untuk siluet yang disampel merata seperti di sini,
   * dan akan gagal pada poligon yang rusuknya sangat tidak seragam.
   */
  const rusuk = out.map((q, i) => {
    const r = out[(i + 1) % out.length]
    return Math.hypot(r[0] - q[0], r[1] - q[1])
  })
  const urut = [...rusuk].sort((a, b) => a - b)
  const tengah = urut[Math.floor(urut.length / 2)] || 0
  const batas = tengah * 4
  const bersih = out.filter((q, i) => {
    const sebelum = rusuk[(i - 1 + out.length) % out.length]
    return !(tengah > 0 && rusuk[i] > batas && sebelum > batas)
  })
  return buangLoop(bersih.length >= 8 ? bersih : out)
}

/** Titik potong dua rusuk, atau null kalau keduanya tidak benar-benar menyeberang. */
function potong(p1, p2, p3, p4) {
  const rx = p2[0] - p1[0]; const ry = p2[1] - p1[1]
  const sx = p4[0] - p3[0]; const sy = p4[1] - p3[1]
  const den = rx * sy - ry * sx
  if (Math.abs(den) < 1e-12) return null
  const t = ((p3[0] - p1[0]) * sy - (p3[1] - p1[1]) * sx) / den
  const u = ((p3[0] - p1[0]) * ry - (p3[1] - p1[1]) * rx) / den
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null
  return [p1[0] + rx * t, p1[1] + ry * t]
}

/**
 * Membuang simpul yang dibuat offset — poligon hasil offset yang memotong dirinya sendiri.
 *
 * **Ini perbaikan yang ditemukan gerbang `potong-diri`, bukan yang direncanakan.** Fase 41
 * menyatakan tiga belas bingkai selesai; gerbang baru menemukan **sepuluh di antaranya masih
 * memotong dirinya sendiri**, 24 sub-path, semuanya keluaran fungsi ini. Penjepit `scale` dan
 * pembuang lonjakan di atas mengurangi gejalanya sampai tidak terlihat pada kebanyakan siluet,
 * tapi tidak pernah menghilangkannya — dan komentar fungsi ini sendiri sudah mengakuinya:
 * *"offset poligon yang benar-benar tahan perlu kliping self-intersection."*
 *
 * Sekarang ada. Tiap kali sepasang rusuk menyeberang, potongan di antara keduanya adalah simpul
 * yang lahir dari offset, bukan bagian dari bentuknya: ia dibuang dan diganti titik potongnya.
 * Diulang sampai bersih, dengan batas iterasi supaya bentuk patologis tidak menggantung build.
 */
/*
 * Batas iterasi 200, bukan 32.
 *
 * Tepi bergelombang sebuah pemisah bisa melahirkan puluhan simpul sekaligus, dan pada batas 32
 * `divider-knot` keluar dengan satu simpul yang masih tersisa — bukan karena algoritmanya gagal
 * (dijalankan sekali lagi dengan tangan, ia bersih) melainkan karena jatah putarannya habis.
 * Tiap putaran **selalu** memperkecil poligonnya, jadi batas yang lebih longgar tidak bisa
 * menggantung; ia hanya perlu cukup besar untuk poligon terburuk.
 */
export function buangLoop(pts, maksIterasi = 200) {
  let kini = pts
  for (let iterasi = 0; iterasi < maksIterasi; iterasi += 1) {
    const m = kini.length
    if (m < 8) return kini
    let ketemu = null
    for (let i = 0; i < m && !ketemu; i += 1) {
      const a1 = kini[i]; const a2 = kini[(i + 1) % m]
      for (let j = i + 2; j < m; j += 1) {
        // Rusuk pertama dan terakhir berbagi ujung pada poligon tertutup.
        if (i === 0 && j === m - 1) continue
        const p = potong(a1, a2, kini[j], kini[(j + 1) % m])
        if (p) { ketemu = { i, j, p }; break }
      }
    }
    if (!ketemu) return kini
    // Yang di antara kedua rusuk adalah simpulnya; potongan lainnya adalah bentuknya.
    const dalam = kini.slice(ketemu.i + 1, ketemu.j + 1)
    const luar = [...kini.slice(0, ketemu.i + 1), ...kini.slice(ketemu.j + 1)]
    const calon = dalam.length > luar.length
      ? [...dalam, ketemu.p]
      : [...luar.slice(0, ketemu.i + 1), ketemu.p, ...luar.slice(ketemu.i + 1)]
    if (calon.length < 8 || calon.length >= m) return kini
    kini = calon
  }
  return kini
}

/** Uji titik-dalam-poligon (ray casting). Dipakai agar isen tetap di dalam siluet. */
export function inside(pts, x, y) {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * Siluet gunungan/kayon dalam kotak `w × h`, puncak di atas.
 *
 * Titik terlebarnya di 72% tinggi, dan kakinya sengaja melewati `y = 1.03` — menggembung
 * sedikit keluar kotak. Tanpa gembung itu ia terbaca sebagai daun, bukan gunungan. Proporsi
 * ini terbaca dari frame referensi, bukan dari dokumen mana pun.
 */
export function kayonOutline(w, h, per = 26) {
  const x = (u) => u * w
  const y = (v) => v * h
  return sampleCubics([
    [[x(0.5), y(0)], [x(0.66), y(0.1)], [x(0.86), y(0.36)], [x(0.96), y(0.62)]],
    [[x(0.96), y(0.62)], [x(1.0), y(0.78)], [x(0.95), y(0.92)], [x(0.78), y(0.99)]],
    [[x(0.78), y(0.99)], [x(0.66), y(1.03)], [x(0.34), y(1.03)], [x(0.22), y(0.99)]],
    [[x(0.22), y(0.99)], [x(0.05), y(0.92)], [x(0), y(0.78)], [x(0.04), y(0.62)]],
    [[x(0.04), y(0.62)], [x(0.14), y(0.36)], [x(0.34), y(0.1)], [x(0.5), y(0)]],
  ], per)
}

/**
 * Ukel — sulur melingkar yang meruncing, digambar sebagai **pita bermassa**.
 *
 * Tepi luar mengikuti spiral logaritmik `r = r0·e^(k·θ)`; tepi dalamnya spiral yang sama
 * dikurangi lebar yang ikut menyusut, lalu keduanya ditutup jadi satu bidang. Hasilnya
 * bentuk berisi, bukan stroke — syarat "ornamen bermassa".
 *
 * `turns` sengaja di sekitar 1 dan terbuka. Spiral rapat dua-tiga putaran terbaca sebagai
 * per, bukan sebagai sulur.
 */
export function ukel({ r0 = 30, turns = 0.85, decay = 0.42, w0 = null, w1 = null, dir = 1, phase = 0 }) {
  const W0 = w0 ?? r0 * 0.3
  const W1 = w1 ?? r0 * 0.04
  const total = turns * Math.PI * 2
  const k = Math.log(decay) / total
  /*
   * Kerapatan sampel mengikuti PANJANG BUSUR, bukan jumlah putaran.
   *
   * Pack kayon memakai langkah sudut tetap (`total / 0.07`), jadi curl isen sekecil r0 = 30
   * disampel serapat sulur utama r0 = 120 — dan karena isen dipasang belasan kali per glyph,
   * di situlah berkas 44 KB itu lahir. Dengan panjang busur, tiap segmen selalu sekitar
   * 9 satuan viewBox berapa pun ukuran curl-nya: cukup halus untuk tidak terbaca bersegi
   * pada ukuran render ornamen, dan biayanya sebanding dengan apa yang benar-benar terlihat.
   */
  const steps = Math.max(10, Math.min(34, Math.round((total * r0) / 9)))
  const outer = []
  const inner = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const th = total * t
    const r = r0 * Math.exp(k * th)
    const a = phase + dir * th
    const wid = W0 + (W1 - W0) * t
    outer.push([Math.cos(a) * r, Math.sin(a) * r])
    inner.push([Math.cos(a) * (r - wid), Math.sin(a) * (r - wid)])
  }
  return poly(outer.concat(inner.reverse()))
}

/**
 * Ukel bertangkai: pita meruncing yang tumbuh dari pangkal lalu melingkar.
 *
 * **Aturan bentuk paling tegas di seluruh kosakata ini.** Tiap sulur wajib punya batang yang
 * mengalir ke curl-nya; curl telanjang terbaca sebagai spiral teknis, bukan ornamen.
 */
export function ukelBertangkai({ len = 40, r0 = 26, turns = 0.85, decay = 0.42, w0 = null, dir = 1, tilt = 0 }) {
  const W0 = w0 ?? r0 * 0.34
  const a0 = tilt - (dir * Math.PI) / 2
  const cx = Math.cos(tilt) * len
  const cy = Math.sin(tilt) * len
  const start = [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0]
  const stem = sampleCubics([[[0, 0], [cx * 0.4, cy * 0.4], [start[0] * 0.72, start[1] * 0.72], start]], 9)
  const nrm = [Math.sin(tilt) * dir, -Math.cos(tilt) * dir]
  const back = stem
    .map((p, i) => {
      const t = 1 - i / (stem.length - 1)
      const wid = W0 * (0.35 + 0.65 * (1 - t))
      return [p[0] + nrm[0] * wid, p[1] + nrm[1] * wid]
    })
    .reverse()
  return poly(stem.concat(back)) + translateD(ukel({ r0, turns, decay, w0: W0, dir, phase: a0 }), cx, cy)
}

/**
 * Menggeser SELURUH koordinat sebuah path absolut.
 *
 * Versi pertama hanya menggeser perintah `M` dan `L` — dan itu bug yang mahal. `cakram()`
 * dan `cincin()` seluruhnya perintah `C`, jadi hanya titik awalnya yang pindah sementara
 * semua titik kontrol kurvanya tertinggal di dekat titik asal. Di layar setiap "titik cecek"
 * berubah jadi sapuan raksasa dari pojok kiri atas, dan tujuh dari tiga belas bingkai keluar
 * dengan berkas garis memancar.
 *
 * Yang membuatnya sulit terlihat: `ukel` memakai `poly()` yang hanya `M`/`L`, jadi bingkai
 * ber-isen ukel tampak baik-baik saja. Hanya yang ber-isen cecek yang rusak — dan itu terbaca
 * seperti masalah pada siluetnya, bukan pada penggesernya. Delapan gerbang mutu meloloskan
 * semuanya; yang menemukannya adalah mematikan grup satu per satu di layar.
 *
 * Menangani `M L C S Q T` absolut. `H`/`V`/`A` tidak pernah dipancarkan mesin ini; kalau suatu
 * saat dipakai, fungsi ini harus diperluas lebih dulu.
 */
export function translateD(d, x, y) {
  return d.replace(/([MLCSQT])([^A-Za-z]*)/g, (_, cmd, isi) => {
    const angka = isi.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    const geser = angka.map((v, i) => n(v + (i % 2 === 0 ? x : y)))
    return cmd + geser.join(' ')
  })
}

/**
 * Memutar sebuah `d` absolut mengelilingi titik asalnya.
 *
 * Pasangannya `translateD`, dan ia ada karena satu cabang kosakata ternyata tidak punya
 * orientasi sama sekali: `tunasTema` cabang `sawut` memancarkan `ribbon()` apa adanya —
 * mendatar dari titik asal — berapa pun `tilt` yang diminta pemanggilnya. Selama pelepah
 * sawut hanya dipakai pada tunas yang arahnya memang mendatar, tidak ada yang terlihat salah.
 * Begitu ia diminta memancar ke samping, dua hal terjadi sekaligus: pelepahnya menunjuk ke
 * arah yang keliru, dan kuncup yang diletakkan di belakang pangkal — sepanjang sumbu tunas,
 * yang kini berbeda dari sumbu pelepah — jatuh DI DALAM pelepahnya sendiri. Gerbang
 * `massa-tertimbun` menangkap yang kedua; yang pertama hanya terlihat di layar.
 *
 * Batasannya sama dengan `translateD`: `M L C S Q T` absolut saja.
 */
export function putarD(d, rad) {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return d.replace(/([MLCSQT])([^A-Za-z]*)/g, (_, cmd, isi) => {
    const angka = isi.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    const out = []
    for (let i = 0; i + 1 < angka.length; i += 2) {
      out.push(n(angka[i] * c - angka[i + 1] * s), n(angka[i] * s + angka[i + 1] * c))
    }
    return cmd + out.join(' ')
  })
}

/** Daun/patran tunggal: dua busur bertemu di dua ujung runcing, sengaja asimetris. */
export function daun(len, wid, bend = 0.22) {
  return poly(sampleCubics([
    [[0, 0], [len * 0.22, -wid * (1 + bend)], [len * 0.72, -wid], [len, 0]],
    [[len, 0], [len * 0.72, wid * 0.72], [len * 0.22, wid * (0.72 + bend)], [0, 0]],
  ], 16))
}

/** Kelopak/daun tegak: runcing di atas, membulat di pangkal. */
export function daunTegak(len, wid) {
  return poly(sampleCubics([
    [[0, 0], [-wid, -len * 0.26], [-wid * 0.86, -len * 0.74], [0, -len]],
    [[0, -len], [wid * 0.86, -len * 0.74], [wid, -len * 0.26], [0, 0]],
  ], 16))
}

/** Lingkaran penuh (titik cecek, cakram medalion). Empat busur kubik, bukan `<circle>`. */
export const cakram = (r) => {
  const c = r * 0.5523
  return (
    `M0 ${n(-r)}C${n(c)} ${n(-r)} ${n(r)} ${n(-c)} ${n(r)} 0` +
    `C${n(r)} ${n(c)} ${n(c)} ${n(r)} 0 ${n(r)}` +
    `C${n(-c)} ${n(r)} ${n(-r)} ${n(c)} ${n(-r)} 0` +
    `C${n(-r)} ${n(-c)} ${n(-c)} ${n(-r)} 0 ${n(-r)}Z`
  )
}

/**
 * Cincin berongga. Kedua lingkaran digambar searah, jadi bidangnya **harus** dirender
 * `fill-rule="evenodd"` — dengan nonzero ia jadi cakram padat.
 *
 * Jangan menggambarnya sebagai satu busur yang ujungnya hampir berimpit: penyelesaian
 * pusatnya membagi dengan tali busur mendekati nol, dan hasilnya keluar sebagai dua gumpalan
 * terisi penuh. Itu sudah terjadi sekali pada `monogram-cincin`.
 */
export function cincin(r, band) {
  const ring = (rad) => {
    const c = rad * 0.5523
    return (
      `M0 ${n(-rad)}C${n(c)} ${n(-rad)} ${n(rad)} ${n(-c)} ${n(rad)} 0` +
      `C${n(rad)} ${n(c)} ${n(c)} ${n(rad)} 0 ${n(rad)}` +
      `C${n(-c)} ${n(rad)} ${n(-rad)} ${n(c)} ${n(-rad)} 0` +
      `C${n(-rad)} ${n(-c)} ${n(-c)} ${n(-rad)} 0 ${n(-rad)}Z`
    )
  }
  return ring(r) + ring(r - band)
}

/** Tumpal — gigi segitiga sebagai pita tepi. Satu baris; kepadatannya datang dari menumpuk dua frekuensi. */
export function tumpal(w, h, count) {
  const step = w / count
  const pts = [[0, h]]
  for (let i = 0; i < count; i++) pts.push([i * step + step / 2, 0], [(i + 1) * step, h])
  return poly(pts)
}

/**
 * Pita melengkung dengan lebar yang mengecil — dipakai untuk kelopak panjang yang meluruh
 * (kenanga) dan untuk benang ronce.
 */
export function ribbon(len, wid, bend = 0.34) {
  const chain = [[[0, 0], [len * 0.28, -len * bend], [len * 0.72, -len * bend * 0.72], [len, 0]]]
  const atas = sampleCubics(chain, 18)
  const bawah = atas
    .map((p, i) => [p[0], p[1] + wid * (0.35 + 0.65 * Math.sin(Math.PI * (1 - i / (atas.length - 1)) * 0.8))])
    .reverse()
  return poly(atas.concat(bawah))
}

/** Kuncup ronce: satuan dasar untaian melati. Bukan bunga mekar — ronce ditulis dari kuncup. */
export function kuncup(len = 16, wid = 6) {
  return poly(sampleCubics([
    [[0, 0], [-wid, -len * 0.22], [-wid * 0.92, -len * 0.72], [0, -len]],
    [[0, -len], [wid * 0.92, -len * 0.72], [wid, -len * 0.22], [0, 0]],
  ], 14))
}

/** Generator acak deterministik — sebaran yang tidak seragam tapi selalu sama tiap build. */
export function prng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

/** Titik dan tangen pada rantai kubik, untuk menempatkan kuncup di sepanjang untaian. */
export function alongCubic(seg, t) {
  const [p0, p1, p2, p3] = seg
  const u = 1 - t
  const pt = [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
  const tg = [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ]
  return { pt, sudut: (Math.atan2(tg[1], tg[0]) * 180) / Math.PI }
}

/** Interpolasi lurus antara dua titik. */
const antara = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/**
 * Poligon bersudut → rantai kubik dengan tiap sudut difilet.
 *
 * Dipakai siluet berundak. Undakan yang digambar dengan sudut siku murni memang benar
 * bentuknya, tapi dua hal terjadi: `buktiLengkung` menilainya nol dan ia harus didaftarkan
 * sebagai pengecualian `rectilinear` — pengakuan bahwa ia "belum digambar" — dan di layar ia
 * terbaca seperti gambar teknik, bukan seperti batu yang dipahat. Pelipit padas memang
 * berpelipit membulat; filet di sini bukan pemanis untuk meloloskan gerbang, ia bentuk yang
 * benar yang kebetulan juga jujur terhadap gerbangnya.
 *
 * Jari-jari filet dijepit ke 45% rusuk terpendek di tiap sudut, jadi undakan sesempit apa pun
 * tidak pernah menghasilkan filet yang saling memakan.
 */
export function filetPoligon(pts, r) {
  const m = pts.length
  if (m < 3) return []
  const chain = []
  const masuk = []
  const keluar = []
  for (let i = 0; i < m; i += 1) {
    const p0 = pts[(i - 1 + m) % m]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % m]
    const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1
    const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1
    const rr = Math.min(r, d01 * 0.45, d12 * 0.45)
    masuk.push(antara(p1, p0, rr / d01))
    keluar.push(antara(p1, p2, rr / d12))
  }
  for (let i = 0; i < m; i += 1) {
    // Filet di sudut i: kubik dari titik masuk ke titik keluar, kontrol menarik ke sudutnya.
    chain.push([masuk[i], antara(masuk[i], pts[i], 0.55), antara(keluar[i], pts[i], 0.55), keluar[i]])
    // Ruas lurus menuju filet berikutnya, ditulis sebagai kubik ber-parameterisasi linear.
    const a = keluar[i]
    const b = masuk[(i + 1) % m]
    chain.push([a, antara(a, b, 1 / 3), antara(a, b, 2 / 3), b])
  }
  return chain
}

/**
 * Menyusuri keliling sebuah siluet menurut PANJANG BUSUR, lalu mengembalikan titik tengah
 * band beserta garis singgungnya.
 *
 * **Diangkat jadi fungsi bersama karena `cecekTepi` dulu tidak memakainya, dan itu penyebab
 * keluhan "titik cecek terasa tersebar acak".** `isenTepi` sudah berjalan menurut panjang
 * busur sejak fase 41; `cecekTepi` melangkah dengan INDEKS TITIK (`Math.floor(m * i / jumlah)`).
 * Poligon sumbernya datang dari `sampleCubics`, yang menyampel tiap segmen kubik dengan cacah
 * TETAP berapa pun panjangnya — jadi segmen pendek tersampel rapat dan segmen panjang jarang.
 * Melangkah dengan indeks di atas poligon seperti itu menumpuk titik di tikungan dan
 * mengosongkan dinding lurus. Bukan selera; aritmetika.
 */
export function sepanjangTepi(outer, { band = 30, jumlah = 26, mulai = 0 } = {}) {
  const m = outer.length
  const panjang = []
  let total = 0
  for (let i = 0; i < m; i += 1) {
    const a = outer[i]
    const b = outer[(i + 1) % m]
    total += Math.hypot(b[0] - a[0], b[1] - a[1])
    panjang.push(total)
  }
  if (!total) return []

  const pusat = outer.reduce((a, p) => [a[0] + p[0] / m, a[1] + p[1] / m], [0, 0])
  const out = []
  for (let i = 0; i < jumlah; i += 1) {
    const target = (total * (((i + 0.5) / jumlah + mulai) % 1))
    let k = panjang.findIndex(v => v >= target)
    if (k < 0) k = m - 1
    const a = outer[k]
    const b = outer[(k + 1) % m]
    const sisa = target - (k ? panjang[k - 1] : 0)
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const t = Math.min(1, sisa / seg)
    const px = a[0] + (b[0] - a[0]) * t
    const py = a[1] + (b[1] - a[1]) * t

    // Normal ke dalam diarahkan ke pusat, jadi ia benar untuk siluet cekung maupun cembung.
    let nx = pusat[0] - px
    let ny = pusat[1] - py
    const nl = Math.hypot(nx, ny) || 1
    nx /= nl; ny /= nl

    const cx = px + nx * band * 0.5
    const cy = py + ny * band * 0.5
    if (!inside(outer, cx, cy)) continue
    out.push({ cx, cy, sudut: Math.atan2(b[1] - a[1], b[0] - a[0]), urut: i })
  }
  return out
}
