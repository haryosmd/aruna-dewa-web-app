import { filetPoligon, kayonOutline, offsetInward, poly, sampleCubics, sampleCubicsRata } from '../geometry.mjs'
import { cecekTepi, isenSawut, isenTepi } from '../isen.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'
import { paramUntuk } from './tema.mjs'

const W = 300
const H = 420

/**
 * Bingkai ditumpangkan DI ATAS foto (`Cover.vue`, tata letak `kayon-frame`), jadi interiornya
 * wajib tetap berongga dan isennya hidup di dalam BAND, bukan di interior.
 *
 * Pack kayon sudah mencatat kegagalan ini: bingkai bertatah penuh dipakai sebagai kartu nama
 * membuat tatahannya menabrak teks — "itu dicoba di demo dan memang menabrak". Di sini yang
 * ditabrak akan wajah orang.
 */
const BAND = 30

/* ── mahkota: satu-satunya yang membedakan wajah tiap tema ─────────────────── */

/** Tiap mahkota mengembalikan rantai kubik dari (0, ys) melintasi puncak ke (W, ys). */
const mahkota = {
  gerbang: (ys) => [
    [[0, ys], [0, ys * 0.42], [W * 0.22, 0], [W / 2, 0]],
    [[W / 2, 0], [W * 0.78, 0], [W, ys * 0.42], [W, ys]],
  ],
  ogee: (ys) => [
    [[0, ys], [0, ys * 0.52], [W * 0.3, ys * 0.46], [W * 0.42, ys * 0.2]],
    [[W * 0.42, ys * 0.2], [W * 0.47, ys * 0.07], [W * 0.49, 0], [W / 2, 0]],
    [[W / 2, 0], [W * 0.51, 0], [W * 0.53, ys * 0.07], [W * 0.58, ys * 0.2]],
    [[W * 0.58, ys * 0.2], [W * 0.7, ys * 0.46], [W, ys * 0.52], [W, ys]],
  ],
  /**
   * Pelita: kubah berbahu tegas dengan puncak bertingkat tiga.
   *
   * Tidak memakai ulang `deco` milik lumine yang sudah pensiun, walau mahkotanya kini tak
   * bertuan: resepnya terlalu berdekatan (deco/cecek, rapport 6) dan seluruh kategori
   * diturunkan dari mahkota yang sama, jadi glyphnya akan bertabrakan dengan milik lumine di
   * gerbang keunikan. Pembedanya di sini **bahu yang naik**, bukan undakan yang menyempit:
   * siluetnya melebar dulu sebelum menanjak, yang pada bidang gelap terbaca sebagai cahaya
   * yang menyebar dari satu titik.
   */
  pelita: (ys) => [
    [[0, ys], [0, ys * 0.5], [W * 0.06, ys * 0.34], [W * 0.18, ys * 0.34]],
    [[W * 0.18, ys * 0.34], [W * 0.26, ys * 0.34], [W * 0.26, ys * 0.2], [W * 0.34, ys * 0.2]],
    [[W * 0.34, ys * 0.2], [W * 0.4, ys * 0.2], [W * 0.42, ys * 0.06], [W / 2, 0]],
    [[W / 2, 0], [W * 0.58, ys * 0.06], [W * 0.6, ys * 0.2], [W * 0.66, ys * 0.2]],
    [[W * 0.66, ys * 0.2], [W * 0.74, ys * 0.2], [W * 0.74, ys * 0.34], [W * 0.82, ys * 0.34]],
    [[W * 0.82, ys * 0.34], [W * 0.94, ys * 0.34], [W, ys * 0.5], [W, ys]],
  ],
  deco: (ys) => [
    [[0, ys], [0, ys * 0.62], [W * 0.04, ys * 0.54], [W * 0.14, ys * 0.5]],
    [[W * 0.14, ys * 0.5], [W * 0.2, ys * 0.48], [W * 0.24, ys * 0.34], [W * 0.3, ys * 0.22]],
    [[W * 0.3, ys * 0.22], [W * 0.36, ys * 0.08], [W * 0.43, 0], [W / 2, 0]],
    [[W / 2, 0], [W * 0.57, 0], [W * 0.64, ys * 0.08], [W * 0.7, ys * 0.22]],
    [[W * 0.7, ys * 0.22], [W * 0.76, ys * 0.34], [W * 0.8, ys * 0.48], [W * 0.86, ys * 0.5]],
    [[W * 0.86, ys * 0.5], [W * 0.96, ys * 0.54], [W, ys * 0.62], [W, ys]],
  ],
  /**
   * Hening: garis atas yang nyaris lurus, dipotong satu takik halus di tengah.
   *
   * Tidak memakai ulang `halus` milik alba yang sudah pensiun, walau mahkotanya kini tak
   * bertuan. Resep keduanya terlalu berdekatan (halus/sawut, rapport 8 vs 10), dan seluruh
   * kategori diturunkan dari mahkota yang sama — glyphnya akan bertabrakan dengan milik alba
   * di gerbang keunikan. Yang membedakan tema ini bukan kelembutan sudutnya melainkan
   * TAKIKNYA: satu insisi tunggal pada garis yang selain itu datar.
   */
  hening: (ys) => [
    [[0, ys], [0, ys * 0.44], [W * 0.02, ys * 0.2], [W * 0.1, ys * 0.18]],
    [[W * 0.1, ys * 0.18], [W * 0.22, ys * 0.16], [W * 0.34, ys * 0.16], [W * 0.44, ys * 0.16]],
    // Takiknya: turun sedikit, lalu naik ke puncak yang tetap rendah.
    [[W * 0.44, ys * 0.16], [W * 0.47, ys * 0.16], [W * 0.48, 0], [W / 2, 0]],
    [[W / 2, 0], [W * 0.52, 0], [W * 0.53, ys * 0.16], [W * 0.56, ys * 0.16]],
    [[W * 0.56, ys * 0.16], [W * 0.66, ys * 0.16], [W * 0.78, ys * 0.16], [W * 0.9, ys * 0.18]],
    [[W * 0.9, ys * 0.18], [W * 0.98, ys * 0.2], [W, ys * 0.44], [W, ys]],
  ],
  /** Sudut membulat lembut. Alba paling tertahan, tapi tetap tidak boleh bersudut siku. */
  halus: (ys) => [
    [[0, ys], [0, ys * 0.5], [W * 0.03, ys * 0.12], [W * 0.13, ys * 0.04]],
    [[W * 0.13, ys * 0.04], [W * 0.26, 0], [W * 0.74, 0], [W * 0.87, ys * 0.04]],
    [[W * 0.87, ys * 0.04], [W * 0.97, ys * 0.12], [W, ys * 0.5], [W, ys]],
  ],
  /**
   * Awan berlapis bersarang. Mega mendung hidup dari LAPISNYA, bukan dari satu kait —
   * tujuh gradasi warnanya diterjemahkan jadi jumlah lapis, karena bank ini satu warna.
   */
  mendung: (ys) => {
    const lobus = 5
    const rantai = []
    let x = 0
    for (let i = 0; i < lobus; i++) {
      const x2 = (W * (i + 1)) / lobus
      const tinggi = ys * (i === Math.floor(lobus / 2) ? 0.06 : 0.3 + Math.abs(i - lobus / 2) * 0.16)
      rantai.push([[x, i === 0 ? ys : ys * 0.42], [x + (x2 - x) * 0.18, tinggi], [x2 - (x2 - x) * 0.18, tinggi], [x2, i === lobus - 1 ? ys : ys * 0.42]])
      x = x2
    }
    return rantai
  },
  /** Kelopak PITA yang meluruh — pembeda kenanga menurut sumber, bukan kelopak membulat. */
  kenanga: (ys) => [
    [[0, ys], [W * 0.02, ys * 0.5], [W * 0.14, ys * 0.62], [W * 0.2, ys * 0.3]],
    [[W * 0.2, ys * 0.3], [W * 0.26, ys * 0.02], [W * 0.38, ys * 0.5], [W * 0.42, ys * 0.18]],
    [[W * 0.42, ys * 0.18], [W * 0.46, 0], [W * 0.54, 0], [W * 0.58, ys * 0.18]],
    [[W * 0.58, ys * 0.18], [W * 0.62, ys * 0.5], [W * 0.74, ys * 0.02], [W * 0.8, ys * 0.3]],
    [[W * 0.8, ys * 0.3], [W * 0.86, ys * 0.62], [W * 0.98, ys * 0.5], [W, ys]],
  ],
  /**
   * EMPAT gonjong, bukan tiga.
   *
   * Jumlah gonjong menandai kedudukan: dua untuk warga biasa, empat untuk seorang Datuak,
   * enam untuk koordinator para datuak (detikProperti, diperiksa 2026-09-18). Versi lama
   * menggambar tiga — yang tidak ada dalam himpunan itu, jadi ia menyatakan sesuatu yang
   * tidak ada. Lihat `docs/features/ornament-builder/CULTURE-BANK.md`.
   */
  gonjong: (ys) => {
    const n = 4
    const rantai = []
    for (let i = 0; i < n; i++) {
      const x0 = (W * i) / n
      const x1 = (W * (i + 1)) / n
      const mid = (x0 + x1) / 2
      // Tanduk: naik melengkung ke puncak runcing, turun melengkung ke lembah.
      // Tanduk kerbau bukan duri: pangkalnya lebar, badannya menggembung keluar, dan
      // puncaknya berdataran kecil. Versi pertama meruncing langsung ke satu titik dan
      // terbaca sebagai mahkota duri.
      const w2 = (x1 - x0) * 0.5
      rantai.push([[x0, i === 0 ? ys : ys * 0.78], [x0 + w2 * 0.1, ys * 0.62], [mid - w2 * 0.62, ys * 0.3], [mid - w2 * 0.2, ys * 0.05]])
      rantai.push([[mid - w2 * 0.2, ys * 0.05], [mid - w2 * 0.08, 0], [mid + w2 * 0.08, 0], [mid + w2 * 0.2, ys * 0.05]])
      rantai.push([[mid + w2 * 0.2, ys * 0.05], [mid + w2 * 0.62, ys * 0.3], [x1 - w2 * 0.1, ys * 0.62], [x1, i === n - 1 ? ys : ys * 0.78]])
    }
    return rantai
  },
  /**
   * Wastra: dua bahu datar dan rendah, lalu naik tegak ke SATU dataran lebar.
   *
   * `tumpal` di bawah meruncing ke satu titik dan terbaca sebagai renda tepi. Yang ini
   * dipenggal di puncaknya, jadi yang dibaca mata adalah bidangnya — motif yang diabstraksi
   * jadi bidang besar, bukan diperkecil jadi gigi.
   */
  wastra: (ys) => [
    // Bahu rendah dan datar — bukan pangkal kubah.
    [[0, ys], [0, ys * 0.92], [W * 0.02, ys * 0.88], [W * 0.08, ys * 0.88]],
    // Titik kendali nyaris kolinear: yang diinginkan diagonal LURUS, bukan lengkung.
    [[W * 0.08, ys * 0.88], [W * 0.14, ys * 0.63], [W * 0.2, ys * 0.39], [W * 0.26, ys * 0.15]],
    [[W * 0.26, ys * 0.15], [W * 0.28, ys * 0.05], [W * 0.31, 0], [W * 0.36, 0]],
    // Dataran, dan ia harus benar-benar datar: inilah satu-satunya pembeda tema ini.
    [[W * 0.36, 0], [W * 0.45, 0], [W * 0.55, 0], [W * 0.64, 0]],
    [[W * 0.64, 0], [W * 0.69, 0], [W * 0.72, ys * 0.05], [W * 0.74, ys * 0.15]],
    [[W * 0.74, ys * 0.15], [W * 0.8, ys * 0.39], [W * 0.86, ys * 0.63], [W * 0.92, ys * 0.88]],
    [[W * 0.92, ys * 0.88], [W * 0.98, ys * 0.88], [W, ys * 0.92], [W, ys]],
  ],
  tumpal: (ys) => [
    [[0, ys], [0, ys * 0.5], [W * 0.05, ys * 0.2], [W * 0.16, ys * 0.14]],
    [[W * 0.16, ys * 0.14], [W * 0.3, ys * 0.08], [W * 0.7, ys * 0.08], [W * 0.84, ys * 0.14]],
    [[W * 0.84, ys * 0.14], [W * 0.95, ys * 0.2], [W, ys * 0.5], [W, ys]],
  ],
}

/** Dinding samping dan alas — sama untuk semua bingkai bermahkota. */
const badan = (ys) => [
  [[W, ys], [W, ys + (H - ys) * 0.3], [W, H - (H - ys) * 0.3], [W, H]],
  [[W, H], [W * 0.66, H], [W * 0.34, H], [0, H]],
  [[0, H], [0, H - (H - ys) * 0.3], [0, ys + (H - ys) * 0.3], [0, ys]],
]

/** Siluet penuh: mahkota + badan, disampel jadi poligon. */
function siluet(nama, bahu = 0.34) {
  if (nama === 'kayon') return kayonOutline(W, H, 22)
  if (nama === 'oval') {
    return sampleCubics([
      [[W / 2, 0], [W * 0.92, 0], [W, H * 0.22], [W, H / 2]],
      [[W, H / 2], [W, H * 0.78], [W * 0.92, H], [W / 2, H]],
      [[W / 2, H], [W * 0.08, H], [0, H * 0.78], [0, H / 2]],
      [[0, H / 2], [0, H * 0.22], [W * 0.08, 0], [W / 2, 0]],
    ], 22)
  }
  if (nama === 'rose') {
    const r = Math.min(W, H) / 2
    return sampleCubics([
      [[W / 2, H / 2 - r], [W / 2 + r * 0.55, H / 2 - r], [W / 2 + r, H / 2 - r * 0.55], [W / 2 + r, H / 2]],
      [[W / 2 + r, H / 2], [W / 2 + r, H / 2 + r * 0.55], [W / 2 + r * 0.55, H / 2 + r], [W / 2, H / 2 + r]],
      [[W / 2, H / 2 + r], [W / 2 - r * 0.55, H / 2 + r], [W / 2 - r, H / 2 + r * 0.55], [W / 2 - r, H / 2]],
      [[W / 2 - r, H / 2], [W / 2 - r, H / 2 - r * 0.55], [W / 2 - r * 0.55, H / 2 - r], [W / 2, H / 2 - r]],
    ], 22)
  }
  if (nama === 'rounded') return siluetHalus(0.1)
  const ys = H * bahu
  return sampleCubics([...mahkota[nama](ys), ...badan(ys)], 14)
}

/**
 * Ruas lurus sebagai kubik yang tersampel MERATA.
 *
 * Menulis ruas lurus sebagai `[a, b, b, b]` memang menghasilkan garis yang benar, tapi
 * sampelnya menumpuk di ujung: `frame-rounded` keluar dengan rusuk terpanjang **345×** rusuk
 * tengahnya. Di layar bentuknya betul — titiknya toh semua di garis yang sama — jadi tidak
 * ada gerbang lama yang bisa melihatnya. Yang rusak adalah apa yang dibangun DI ATASNYA:
 * `offsetInward` menyatakan sendiri heuristiknya "akan gagal pada poligon yang rusuknya
 * sangat tidak seragam", dan bingkai inilah poligon itu.
 *
 * Titik kontrol di sepertiga dan dua-pertiga membuat parameterisasinya linear, jadi sampelnya
 * berjarak sama.
 */
const lurus = (a, b) => [
  a,
  [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3],
  [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3],
  b,
]

/** Persegi panjang bersudut membulat, dipakai `rounded`. */
function siluetHalus(r) {
  const rx = W * r
  const ry = H * r * 0.72
  return sampleCubics([
    lurus([rx, 0], [W - rx, 0]),
    [[W - rx, 0], [W - rx * 0.4, 0], [W, ry * 0.4], [W, ry]],
    lurus([W, ry], [W, H - ry]),
    [[W, H - ry], [W, H - ry * 0.4], [W - rx * 0.4, H], [W - rx, H]],
    lurus([W - rx, H], [rx, H]),
    [[rx, H], [rx * 0.4, H], [0, H - ry * 0.4], [0, H - ry]],
    lurus([0, H - ry], [0, ry]),
    [[0, ry], [0, ry * 0.4], [rx * 0.4, 0], [rx, 0]],
  ], 12)
}

/* ── resep ─────────────────────────────────────────────────────────────────── */

export function bingkai(id) {
  const p = paramUntuk(id)

  // `bentar` adalah gerbang TERBELAH: dua paruh cermin yang terpisah sempurna di puncak,
  // hanya bertemu di bawah. Ia tidak bisa dibangun dari siluet tunggal.
  if (p.mahkota === 'bentar') return bingkaiBentar(id, p)

  const luar = siluet(p.mahkota)
  const dalam = offsetInward(luar, BAND)

  return { file: fileDari(id), viewBox: `0 0 ${W} ${H}`, bagian: rakit(luar, dalam, p, BAND) }
}

/**
 * Perakitan yang sama untuk semua bingkai — itulah yang membuat sebelas glyph satu tema
 * terbaca sebagai satu keluarga, bukan sebelas gambar yang kebetulan bertetangga.
 */
function rakit(luar, dalam, p, band) {
  /*
   * Isen DILUBANGI dari band, bukan ditimpakan di atasnya.
   *
   * `sawut` satu-satunya yang tetap berupa garis, karena ia memang lapisan `data-draw` —
   * ia digambar di atas band dengan warna yang sama tapi sebagai stroke, jadi ia terlihat.
   */
  const rongga = p.isen === 'ukel'
    ? isenTepi(luar, { band, jumlah: 18, skala: p.isenSkala * 2.1 })
    // `sawut` tetap dapat rongga, hanya lebih sedikit dan lebih kecil.
    //
    // Versi pertama memberinya garis saja, dan kedua tema ber-sawut keluar dengan lima
    // sub-path — band kosong dengan beberapa goresan. Tertahan tidak boleh berarti kosong;
    // itu justru keluhan yang sedang diperbaiki. Yang membedakan tema tertahan dari tema
    // padat adalah KERAPATAN dan UKURAN rongganya, bukan ada-tidaknya.
    : cecekTepi(luar, {
      band,
      jumlah: p.isen === 'cecek' ? 34 : 20,
      skala: p.isenSkala * (p.isen === 'cecek' ? 2.4 : 2),
      rapport: p.rapport,
    })
  const sawut = p.isen === 'sawut'
    ? isenSawut(luar, { jumlah: 16, tebal: p.stroke, panjang: 0.08, lubang: dalam })
    : ''

  /*
   * Rel garis mengikuti tepi DALAM band, bukan melayang di interior.
   *
   * Versi pertama menaruh dua garis tegak di tengah bidang foto — di layar ia terbaca sebagai
   * goresan nyasar, bukan ornamen. Rel yang menyusuri bandnya sendiri sekaligus memberi
   * DrawSVG satu lintasan yang berarti untuk digambar saat di-scroll.
   */
  // Rel didesimasi tiap titik ketiga: pada band selebar ini bedanya tidak terlihat,
  // dan bytenya sepertiga.
  const rel = offsetInward(luar, band * 0.76).filter((_, i) => i % 3 === 0)

  /*
   * Tiga lapis, dan urutannya yang membuat warnanya berarti.
   *
   * Rongga isen menembus band lewat `evenodd`. Kalau ada PLAT beraksen tepat di bawah band,
   * tiap ukiran tembus itu memperlihatkan emasnya — ornamen jadi dua warna tanpa satu pun
   * bentuk baru digambar. Itu persis cara gunungan pack Canva bekerja, dan mesinnya sudah
   * punya seluruh mekanismenya sejak fase 41; yang kurang cuma platnya.
   *
   * Platnya mengikuti BAND, bukan siluet penuh: bingkai ditumpangkan di atas foto, jadi
   * interiornya wajib tetap berongga. Plat sepenuh siluet akan menutupi wajah orang.
   */
  /*
   * Badan DIPERKECIL ke dalam, supaya platnya menyembul sebagai tepi beraksen.
   *
   * Versi pertama membuat badan sepenuh plat, jadi aksen hanya terlihat lewat lubang cecek —
   * beberapa titik kecil di dalam band selebar 30. Dilihat di lembar kontak, hasilnya tetap
   * terbaca satu warna, yaitu keluhan yang sedang diperbaiki. Ornamen emas rujukan tidak
   * bekerja begitu: emasnya memikul LUAS, sebagai tepi yang mengelilingi badan, dan ukirannya
   * datang belakangan. `bibir` selebar 18% band memberi tepi itu tanpa menipiskan badannya.
   */
  const bibir = offsetInward(luar, band * 0.18)

  return [
    grup(massHollow(poly(luar) + poly(dalam)), 1, 'accent'),
    // Band dengan sulurnya tertembus — satu bidang, `evenodd`, seperti ukiran tembus.
    grup(massHollow(poly(bibir) + poly(dalam) + rongga.join('')), 1, 'body'),
    // Bidang nilai kedua: rel tipis di tepi dalam band, terlihat karena ia menempel pada
    // sisi rongga dan bukan mengambang di atas massa sewarna.
    grup(massHollow(poly(rel) + poly(offsetInward(luar, band * 0.9))), 0.45, 'glow'),
    grup(sawut + draw(poly(rel), p.stroke, 0.5)),
  ]
}

/**
 * Candi bentar — dan celah puncaknya tidak boleh diseberangi apa pun.
 *
 * Sumber: kedua sisi "terpisah sempurna, dan hanya terhubung di bagian bawah oleh anak
 * tangga"; itu yang membedakannya dari kori agung/paduraksa yang beratap dan berpintu
 * (Badan Penghubung Provinsi Bali, tirto.id, diperiksa 2026-09-18). Jadi tidak ada isen,
 * pita, atau garis yang boleh melintasi tengah di atas alas.
 */
function bingkaiBentar(id, p) {
  const celah = W * 0.13
  const lebar = (W - celah) / 2

  /*
   * Profil BERUNDAK, dan ini perbaikan yang diminta pemilik: *"siluet FrameBentar masih
   * terbaca seperti dua lempeng miring alih-alih menara cermin bertingkat."*
   *
   * Penyebabnya bisa ditunjuk, bukan selera. Versi lama menggambar tepi luarnya sebagai SATU
   * sapuan kubik mulus dari x≈115 di puncak turun ke x=0 di alas. Sapuan mulus dari sempit ke
   * lebar memang lempeng miring — tidak ada undakan di mana pun untuk dilihat mata.
   *
   * Sebuah candi bentar adalah menara berundak yang dibelah: kaki, badan bertingkat, kepala.
   * Daftar di bawah adalah sudut-sudut luar menara itu dalam koordinat ternormalkan — `w`
   * pecahan lebar dari tepi celah, `v` pecahan tinggi — dan tiap pasangnya satu tingkat: muka
   * tegak lalu langkah keluar.
   *
   * Tangganya sengaja **melebar terus ke bawah tanpa lekuk masuk**. Pelipit yang benar-benar
   * menjorok melewati tingkat di bawahnya akan membuat sudut cekung dalam, dan di situlah
   * `offsetInward` melahirkan simpul — kegagalan yang merusak tujuh bingkai di fase 41 dan
   * yang sekarang dijaga gerbang `potong-diri`. Undakan yang monoton melebar memberi bacaan
   * "bertingkat" yang sama tanpa membangun ulang kegagalan itu.
   */
  const undakan = [
    [0.38, 0.050], [0.38, 0.090],
    [0.48, 0.090], [0.48, 0.150],
    [0.58, 0.150], [0.58, 0.250],
    [0.67, 0.250], [0.67, 0.360],
    [0.76, 0.360], [0.76, 0.470],
    [0.85, 0.470], [0.85, 0.590],
    [0.93, 0.590], [0.93, 0.720],
    [1.00, 0.720], [1.00, 0.930],
  ]

  const paruh = (cermin) => {
    // `w` diukur dari tepi CELAH ke luar, jadi tepi dalam selalu w = 0.
    const x = (w) => (cermin ? W - (1 - w) * lebar - celah / 2 + celah / 2 : (1 - w) * lebar)
    const sudut = [
      [x(0), H * 0.05],
      ...undakan.map(([w, v]) => [x(w), H * v]),
      [x(0), H * 0.93],
    ]
    /*
     * Difilet, lalu disampel menurut panjang. Keduanya wajib: tanpa filet siluetnya dinilai
     * nol oleh `buktiLengkung` dan harus didaftarkan sebagai pengecualian `rectilinear` —
     * pengakuan bahwa ia belum digambar — dan tanpa sampel merata rusuknya jadi 9× tidak
     * seragam, yang membuat `offsetInward` tidak bisa dipercaya di atasnya.
     */
    /*
     * Langkah 9 satuan viewBox, angka yang sama dengan `ukel()` dan karena alasan yang sama:
     * cukup halus untuk tidak terbaca bersegi pada ukuran render ornamen, dan biayanya
     * sebanding dengan apa yang benar-benar terlihat. Pada langkah 6 bingkai ini keluar
     * 24.270 byte — di atas plafon 16.384 — karena siluetnya dipakai sepuluh kali (dua paruh
     * × tepi luar, bibir, tepi dalam, dan rel garis, sebagian dipancarkan dua kali).
     */
    return sampleCubicsRata(filetPoligon(sudut, 4.5), 11)
  }

  const band = 22
  const kiri = paruh(false)
  const kanan = paruh(true)
  const dKiri = offsetInward(kiri, band)
  const dKanan = offsetInward(kanan, band)
  const bKiri = offsetInward(kiri, band * 0.18)
  const bKanan = offsetInward(kanan, band * 0.18)
  /*
   * 20 butir per paruh, bukan 28.
   *
   * Tiap butir adalah cakram empat busur kubik berkoordinat absolut — sekitar 150 byte. Dua
   * paruh × 28 butir berharga 8,4 KB, dan itulah sebab bingkai ini lebih berat daripada
   * `frame-gunungan` meski TITIKNYA lebih sedikit (921 lawan 1.324). Yang dipotong di sini
   * kerapatan, bukan bentuk: pada dua puluh butir iramanya tetap terbaca dan band-nya tetap
   * penuh, karena `rapport` yang memberi tekanan, bukan jumlahnya.
   */
  const cecek = (sisi) => cecekTepi(sisi, { band, jumlah: 20, skala: p.isenSkala * 2.2, rapport: p.rapport }).join('')

  const bagian = [
    grup(massHollow(poly(kiri) + poly(dKiri)) + massHollow(poly(kanan) + poly(dKanan)), 1, 'accent'),
    grup(massHollow(poly(bKiri) + poly(dKiri) + cecek(kiri))
      + massHollow(poly(bKanan) + poly(dKanan) + cecek(kanan)), 1, 'body'),
    // Anak tangga: SATU-SATUNYA yang boleh menghubungkan kedua paruh, dan hanya di bawah.
    grup(mass(poly([[W * 0.14, H * 0.93], [W * 0.86, H * 0.93], [W * 0.9, H], [W * 0.1, H]]))
      + mass(poly([[W * 0.2, H * 0.88], [W * 0.8, H * 0.88], [W * 0.83, H * 0.93], [W * 0.17, H * 0.93]]), 0.45), 1, 'body'),
    // Rel didesimasi tiap titik ketiga, aturan yang sama dengan `rakit()`: pada band selebar
    // ini bedanya tidak terlihat, dan bytenya sepertiga.
    grup(draw(poly(offsetInward(kiri, band * 0.72).filter((_, i) => i % 3 === 0)), p.stroke, 0.5)
      + draw(poly(offsetInward(kanan, band * 0.72).filter((_, i) => i % 3 === 0)), p.stroke, 0.5)),
  ]
  return { file: fileDari(id), viewBox: `0 0 ${W} ${H}`, bagian }
}

const fileDari = (id) => ({
  arch: 'Arch',
  'frame-oval': 'FrameOval',
  'frame-ogee': 'FrameOgee',
  'frame-deco': 'FrameDeco',
  'frame-rounded': 'FrameRounded',
  'frame-rose': 'FrameRose',
  'frame-tumpal': 'FrameTumpal',
  'frame-line': 'FrameLine',
  'frame-gunungan': 'FrameGunungan',
  'frame-gonjong': 'FrameGonjong',
  'frame-mendung': 'FrameMendung',
  'frame-kenanga': 'FrameKenanga',
  'frame-bentar': 'FrameBentar',
  'frame-wastra': 'FrameWastra',
  'frame-hening': 'FrameHening',
  'frame-pelita': 'FramePelita',
}[id])

export const idBingkai = Object.keys({
  arch: 1, 'frame-oval': 1, 'frame-ogee': 1, 'frame-deco': 1, 'frame-rounded': 1,
  'frame-rose': 1, 'frame-tumpal': 1, 'frame-line': 1, 'frame-gunungan': 1,
  'frame-gonjong': 1, 'frame-mendung': 1, 'frame-kenanga': 1, 'frame-bentar': 1,
  'frame-wastra': 1, 'frame-hening': 1, 'frame-pelita': 1,
})
