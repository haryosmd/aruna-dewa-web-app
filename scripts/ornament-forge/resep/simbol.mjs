import { translateD, tunasTema, unitTema } from './tata.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'
import { cakram, cincin, daun, poly, ribbon, sampleCubics, sampleCubicsRata, filetPoligon } from '../geometry.mjs'
import { paramUntuk } from './tema.mjs'

/**
 * Simbol — satu figur, bukan pola.
 *
 * **Kategori ini tidak boleh dibangkitkan dari `unitTema` saja, dan itu keputusan sadar.**
 * Tiap simbol punya NAMA di `ornamentBank` — 'Merpati', 'Lotus', 'Lilin' — dan nama itu
 * tampil di pemilih ornamen yang dipakai pasangan. Kalau kesembilannya jadi medalion abstrak
 * khas tema, kesembilan namanya berbohong. Jadi figurnya digambar sendiri-sendiri, dan yang
 * datang dari tema adalah **kartusnya**: plat beraksen, bidang nilai, ketebalan garis, dan
 * pertumbuhan yang mengapitnya.
 *
 * Aturan budaya fase 40 tetap mengikat. `symbol-payung` khususnya: klaim "payung upacara Bali"
 * sudah dihapus karena satu-satunya sumber di repo mengaitkan payung ke janur Jawa, dan ia
 * tidak boleh kembali lewat pintu belakang komentar resep ini.
 */

const kotak = {
  'symbol-rings': [140, 100],
  'symbol-dove': [140, 120],
  'symbol-crescent': [120, 120],
  'symbol-lotus': [140, 100],
  'symbol-fan': [140, 110],
  'symbol-candle': [90, 140],
  'symbol-wadasan': [140, 110],
  'symbol-kupu': [140, 120],
  'symbol-payung': [110, 140],
  'symbol-wastra': [140, 110],
  'symbol-hening': [130, 120],
  'symbol-pelita': [120, 130],
}

/** Kurva tertutup dari rantai kubik, dipakai figur yang digambar tangan. */
const tutup = (chain, per = 14) => poly(sampleCubics(chain, per))

/**
 * Kelopak lotus: perut lebih penuh dan ujung sedikit menekuk.
 *
 * **Bukan `daunTegak`, dan itu sebabnya ditulis sendiri.** Versi pertama memakai `daunTegak`
 * apa adanya — dan `daunTegak` juga yang jadi `unitTema('halus')`, unit tema `aruna-alba`.
 * Gerbang keunikan langsung melaporkan `symbol-lotus` bertabrakan dengan `motif-rule` pada
 * frac 0,86: lotus Sogan ternyata memakai bentuk yang sama persis dengan motif Alba. Primitif
 * bersama adalah nilai bawaan, dan satu bentuk yang muncul di dua tema bukan bahasa visual —
 * itu justru temuan audit yang memulai seluruh rombak ini.
 */
const kelopakLotus = (len, wid) => tutup([
  [[0, 0], [-wid * 1.1, -len * 0.22], [-wid * 0.95, -len * 0.6], [-wid * 0.24, -len]],
  [[-wid * 0.24, -len], [wid * 0.06, -len * 1.06], [wid * 0.3, -len * 0.98], [wid * 0.34, -len * 0.84]],
  [[wid * 0.34, -len * 0.84], [wid * 0.95, -len * 0.56], [wid * 1.05, -len * 0.2], [0, 0]],
], 12)

/** Jari kipas: pita meruncing berujung rata, bukan kelopak. */
const jariKipas = (len, wid) => tutup([
  [[0, 0], [-wid * 0.5, -len * 0.4], [-wid * 0.86, -len * 0.82], [-wid * 0.9, -len]],
  [[-wid * 0.9, -len], [-wid * 0.3, -len * 1.08], [wid * 0.3, -len * 1.08], [wid * 0.9, -len]],
  [[wid * 0.9, -len], [wid * 0.86, -len * 0.82], [wid * 0.5, -len * 0.4], [0, 0]],
], 10)

/**
 * Sembilan figur. Masing-masing mengembalikan `{ badan, detail }`: badan adalah massa
 * utamanya, detail adalah bidang nilai keduanya.
 */
const figur = {
  /** Dua cincin bertaut — dan keduanya WAJIB `evenodd`, atau ia jadi dua cakram padat. */
  'symbol-rings': (w, h) => ({
    badan: massHollow(translateD(cincin(30, 8), w * 0.36, h / 2) + translateD(cincin(30, 8), w * 0.64, h / 2)),
    detail: mass(translateD(unitTema2(w, h, 6), w / 2, h * 0.16), 0.45),
  }),

  /** Merpati: badan bertubuh tetes, satu sayap terangkat, ekor melebar. */
  'symbol-dove': (w, h) => ({
    badan: mass(tutup([
      [[w * 0.2, h * 0.62], [w * 0.22, h * 0.34], [w * 0.46, h * 0.24], [w * 0.62, h * 0.32]],
      [[w * 0.62, h * 0.32], [w * 0.72, h * 0.37], [w * 0.78, h * 0.3], [w * 0.86, h * 0.33]],
      [[w * 0.86, h * 0.33], [w * 0.8, h * 0.4], [w * 0.8, h * 0.44], [w * 0.74, h * 0.48]],
      [[w * 0.74, h * 0.48], [w * 0.7, h * 0.66], [w * 0.5, h * 0.78], [w * 0.3, h * 0.76]],
      [[w * 0.3, h * 0.76], [w * 0.2, h * 0.75], [w * 0.16, h * 0.7], [w * 0.2, h * 0.62]],
    ])) + mass(tutup([
      // Ekor.
      [[w * 0.26, h * 0.7], [w * 0.16, h * 0.78], [w * 0.08, h * 0.84], [w * 0.04, h * 0.9]],
      [[w * 0.04, h * 0.9], [w * 0.16, h * 0.88], [w * 0.26, h * 0.84], [w * 0.32, h * 0.78]],
    ])),
    detail: mass(translateD(daun(38, 11, 0.3), w * 0.38, h * 0.5), 0.45),
  }),

  /** Bulan sabit: cakram besar dilubangi cakram yang bergeser. */
  'symbol-crescent': (w, h) => ({
    badan: massHollow(translateD(cakram(44), w / 2, h / 2) + translateD(cakram(36), w * 0.62, h * 0.42)),
    detail: mass(translateD(unitTema2(w, h, 6), w * 0.24, h * 0.24), 0.45)
      + mass(translateD(unitTema2(w, h, 4), w * 0.78, h * 0.76), 0.45),
  }),

  /** Lotus: kelopak tengah tegak diapit kelopak yang makin merebah. */
  'symbol-lotus': (w, h) => ({
    badan: [0, -1, 1, -2, 2].map((k) => mass(
      translateD(kelopakLotus(46 - Math.abs(k) * 9, 13 - Math.abs(k) * 1.6), w / 2 + k * 15, h * 0.82),
      Math.abs(k) === 2 ? 0.45 : 1,
    )).join(''),
    detail: mass(poly([[w * 0.2, h * 0.82], [w * 0.8, h * 0.82], [w * 0.72, h * 0.9], [w * 0.28, h * 0.9]]), 0.45),
  }),

  /** Kipas: jari-jari yang memancar dari satu pangkal. */
  'symbol-fan': (w, h) => {
    const jari = []
    for (let i = 0; i < 7; i += 1) {
      const a = Math.PI + (Math.PI * (i + 0.5)) / 7
      jari.push(mass(translateD(jariKipas(52, 7.5), w / 2 + Math.cos(a) * 3, h * 0.86), i % 2 ? 0.45 : 1)
        .replace('d="', `transform="rotate(${((a + Math.PI / 2) * 180) / Math.PI} ${w / 2} ${h * 0.86})" d="`))
    }
    return {
      badan: jari.join(''),
      detail: mass(translateD(unitTema2(w, h, 10), w / 2, h * 0.84), 0.45),
    }
  },

  /** Lilin: batang tegak, lidah api, dan genangan di kakinya. */
  'symbol-candle': (w, h) => ({
    badan: mass(poly(sampleCubicsRata(filetPoligon([
      [w * 0.34, h * 0.36], [w * 0.66, h * 0.36], [w * 0.66, h * 0.86], [w * 0.34, h * 0.86],
    ], 5), 6)))
      + mass(tutup([
        [[w / 2, h * 0.12], [w * 0.62, h * 0.2], [w * 0.64, h * 0.28], [w / 2, h * 0.34]],
        [[w / 2, h * 0.34], [w * 0.36, h * 0.28], [w * 0.38, h * 0.2], [w / 2, h * 0.12]],
      ])),
    detail: mass(poly([[w * 0.2, h * 0.86], [w * 0.8, h * 0.86], [w * 0.86, h * 0.94], [w * 0.14, h * 0.94]]), 0.45),
  }),

  /** Karang dan awan: gugus lobus bertumpuk. */
  'symbol-wadasan': (w, h) => ({
    badan: mass(tutup([
      [[w * 0.06, h * 0.72], [w * 0.04, h * 0.42], [w * 0.22, h * 0.34], [w * 0.32, h * 0.44]],
      [[w * 0.32, h * 0.44], [w * 0.36, h * 0.2], [w * 0.64, h * 0.16], [w * 0.7, h * 0.4]],
      [[w * 0.7, h * 0.4], [w * 0.84, h * 0.3], [w * 0.98, h * 0.46], [w * 0.94, h * 0.72]],
      [[w * 0.94, h * 0.72], [w * 0.66, h * 0.82], [w * 0.34, h * 0.82], [w * 0.06, h * 0.72]],
    ])),
    detail: [0.28, 0.5, 0.72].map((t, i) => mass(
      translateD(unitTema2(w, h, 8 - i * 1.6), w * t, h * (0.6 + i * 0.04)), 0.45,
    )).join(''),
  }),

  /** Kupu-kupu: dua pasang sayap dan tubuh ramping. */
  'symbol-kupu': (w, h) => ({
    badan: [-1, 1].map(s => mass(tutup([
      [[w / 2, h * 0.5], [w / 2 + s * w * 0.12, h * 0.2], [w / 2 + s * w * 0.44, h * 0.16], [w / 2 + s * w * 0.46, h * 0.4]],
      [[w / 2 + s * w * 0.46, h * 0.4], [w / 2 + s * w * 0.48, h * 0.54], [w / 2 + s * w * 0.3, h * 0.54], [w / 2, h * 0.5]],
    ]))).join('') + [-1, 1].map(s => mass(tutup([
      [[w / 2, h * 0.52], [w / 2 + s * w * 0.24, h * 0.56], [w / 2 + s * w * 0.36, h * 0.72], [w / 2 + s * w * 0.22, h * 0.84]],
      [[w / 2 + s * w * 0.22, h * 0.84], [w / 2 + s * w * 0.1, h * 0.8], [w / 2 + s * w * 0.04, h * 0.66], [w / 2, h * 0.52]],
    ]), 0.45)).join(''),
    detail: mass(translateD(ribbon(h * 0.52, 5, 0.04), w / 2, h * 0.24)
      .replace('d="', `transform="rotate(90 ${w / 2} ${h * 0.24})" d="`), 0.7),
  }),

  /**
   * Payung pagut.
   *
   * Tidak ada klaim upacara di sini. Komentar lama mengaku payung upacara Bali; satu-satunya
   * sumber di repo (`melati/CULTURE.md`) justru mengaitkan payung ke janur Jawa, dan klaim
   * tanpa sumber dihapus di fase 40, bukan diwariskan.
   */
  /**
   * Anyaman: tiga lajur tegak yang disilang tiga lajur datar.
   *
   * Dipilih karena ia menyatakan KAIN tanpa mengklaim satu tradisi pun — tenunan polos ada di
   * mana-mana, dan tema ini memang dinamai gayanya, bukan sukunya. Lajur tegak jadi badan dan
   * lajur datar jadi detail, jadi silangnya terbaca sebagai atas-bawah lewat dua lapis warna
   * yang memang sudah ada, bukan lewat garis tambahan yang akan hilang di ukuran kartu.
   */
  /**
   * Anyaman: lajur yang SALING MELEWATI, bukan kotak beranyam.
   *
   * Versi pertama menyusun tiga lajur tegak dan tiga lajur datar yang semuanya berhenti rapi
   * di dalam kartus. Di lembar kontak ia keluar sebagai **tas jinjing**: bidang persegi dengan
   * cincin kartus di atasnya terbaca sebagai badan tas beserta tali jinjingnya. Kedua belas
   * gerbang meloloskannya — kepadatan, kelengkungan, bobot, keunikan, dan keempat gerbang
   * geometris tidak satu pun bisa melihat sebuah tas.
   *
   * Yang menghapus bacaan itu adalah ujung yang MELEWATI persilangan dengan panjang yang
   * berbeda-beda: siluetnya berhenti tertutup, jadi tidak ada lagi badan yang bisa dibaca
   * sebagai wadah. Dipilih karena ia menyatakan kain tanpa mengklaim satu tradisi pun — tema
   * ini dinamai gayanya, bukan sukunya.
   */
  /**
   * Anyaman: lajur yang menembus tepi kotaknya.
   *
   * Dua percobaan sebelumnya keluar sebagai **tas jinjing**, dan pelakunya bukan anyamannya
   * melainkan KARTUSNYA. Kartus tiap simbol berbentuk unit tema, dan unit tema di sini adalah
   * trapesium berdataran — sebuah wadah. Apa pun yang berhenti di dalam wadah akan terbaca
   * sebagai isi wadah, dan cincin kartus di atasnya jadi tali jinjingnya. Kedua belas gerbang
   * meloloskan keduanya; yang melihatnya mata.
   *
   * Yang menghapus bacaan itu adalah lajur yang berjalan dari tepi ke tepi: kartus berhenti
   * jadi wadah dan berubah jadi jendela ke atas anyaman yang meneruskan dirinya keluar bingkai.
   * Dipilih karena ia menyatakan kain tanpa mengklaim satu tradisi pun — tema ini dinamai
   * gayanya, bukan sukunya.
   */
  /**
   * Simpul: dua sengkelit terikat satu pita.
   *
   * Tiga percobaan anyaman gagal berturut-turut, dan sebabnya struktural, bukan detail.
   * Kartus tiap simbol berbentuk unit temanya; milik wastra adalah trapesium berdataran —
   * bersudut, dan terbaca sebagai wadah. Figur bersudut di dalam kartus bersudut saling
   * meniadakan: yang keluar pertama tas jinjing, lalu tas jinjing lagi, lalu kisi di atas
   * trapesium yang hancur di ukuran kartu. Delapan simbol lain tidak mengalami ini karena
   * kartus mereka melengkung, jadi figur bersudutnya justru beradu.
   *
   * Yang menjawabnya: figur yang MELENGKUNG, supaya ia beradu dengan kartusnya alih-alih
   * meleburinya. Simpul juga menyatakan hal yang benar untuk undangan pernikahan tanpa
   * mengklaim satu tradisi pun — tema ini dinamai gayanya, bukan sukunya.
   */
  'symbol-wastra': (w, h) => {
    /*
     * Sengkelit yang MERUNCING ke pangkalnya, bukan bulat penuh. Versi bulat keluar sebagai
     * dua balon yang menelan kartusnya; kain terlipat menyempit di tempat ia diikat.
     */
    /*
     * Tepi bawahnya CEKUNG, dan itu satu-satunya yang memisahkan kain terlipat dari balon.
     * Tiga percobaan sebelumnya memakai tepi cembung di kedua sisi; hasilnya dua lobus bulat
     * yang menelan kartusnya, berapa pun ukurannya diperkecil.
     */
    const sengkelit = (tanda) => tutup([
      [[w * 0.5, h * 0.42], [w * (0.5 - tanda * 0.1), h * 0.2], [w * (0.5 - tanda * 0.26), h * 0.18], [w * (0.5 - tanda * 0.33), h * 0.3]],
      [[w * (0.5 - tanda * 0.33), h * 0.3], [w * (0.5 - tanda * 0.38), h * 0.4], [w * (0.5 - tanda * 0.34), h * 0.52], [w * (0.5 - tanda * 0.26), h * 0.56]],
      // Cekungnya ditahan di 0,50: pada 0,44 ia mengait balik dan menyilang busur luarnya —
      // `potong-diri` menangkapnya, dan itu memang kail, bukan lipatan.
      [[w * (0.5 - tanda * 0.26), h * 0.56], [w * (0.5 - tanda * 0.19), h * 0.5], [w * (0.5 - tanda * 0.11), h * 0.5], [w * 0.5, h * 0.52]],
      [[w * 0.5, h * 0.52], [w * (0.5 - tanda * 0.05), h * 0.5], [w * (0.5 - tanda * 0.05), h * 0.45], [w * 0.5, h * 0.42]],
    ], 16)
    const ekor = (tanda) => tutup([
      [[w * 0.5, h * 0.54], [w * (0.5 - tanda * 0.05), h * 0.7], [w * (0.5 - tanda * 0.13), h * 0.8], [w * (0.5 - tanda * 0.24), h * 0.9]],
      [[w * (0.5 - tanda * 0.24), h * 0.9], [w * (0.5 - tanda * 0.24), h * 0.78], [w * (0.5 - tanda * 0.16), h * 0.72], [w * 0.5, h * 0.6]],
    ], 12)
    return {
      badan: mass(sengkelit(1)) + mass(sengkelit(-1)),
      // Pita pengikat di tengah, dan dua ekor yang meluruh — yang membuatnya simpul, bukan pita.
      detail: mass(ekor(1)) + mass(ekor(-1))
        + mass(translateD(unitTema2(w, h, 9), w * 0.5, h * 0.5), 0.9),
    }
  },

  /**
   * Dua sabit yang saling menghadap, nyaris bertemu.
   *
   * Melengkung dengan sengaja: kartus hening berbentuk kotak bertakik, dan pelajaran dari
   * `symbol-wastra` adalah figur bersudut di dalam kartus bersudut saling meniadakan. Lengkung
   * di dalam kotak justru beradu.
   *
   * Yang dinyatakan: dua hal yang mendekat dan belum menutup — dan celahnya yang membuatnya
   * bukan sepasang cincin. Paling sedikit tinta di antara sembilan simbol lain, sesuai
   * wataknya, tanpa jatuh jadi kosong.
   */
  'symbol-hening': (w, h) => {
    /*
     * Dua sabit yang SALING MENEMBUS, membentuk lensa di tengahnya.
     *
     * Versi pertama menaruh keduanya berdampingan dengan celah, dan hasilnya terbaca sebagai
     * **kacamata**: dua lingkaran sebesar itu, sejajar, berjarak tetap, tidak punya bacaan
     * lain. Ditumpangkan, yang terbaca adalah irisannya — dua hal yang benar-benar bertemu,
     * bukan dua hal yang berdiri bersebelahan.
     *
     * Melengkung dengan sengaja: kartus hening berbentuk kotak bertakik, dan pelajaran dari
     * `symbol-wastra` adalah figur bersudut di dalam kartus bersudut saling meniadakan.
     */
    const sabit = (tanda) => massHollow(
      translateD(cakram(34), w * (0.5 - tanda * 0.11), h * 0.5)
      + translateD(cakram(27), w * (0.5 - tanda * 0.2), h * 0.5),
    )
    return {
      badan: sabit(1) + sabit(-1),
      detail: mass(translateD(unitTema2(w, h, 6), w * 0.5, h * 0.5), 0.75),
    }
  },

  /**
   * Nyala bersudut di atas kaki pelita.
   *
   * BERSUDUT dengan sengaja, dan itu kebalikan dari `symbol-wastra` dan `symbol-hening`.
   * Aturannya bukan "figur harus melengkung" melainkan "figur harus beradu dengan kartusnya":
   * kartus pelita berbentuk kubah, jadi yang beradu di sini justru sudut. Dua tema sebelumnya
   * berkartus bersudut, dan di sana lengkung yang menjawab.
   *
   * Nyala digambar sebagai layang-layang lancip, bukan tetesan bergelombang: pada bidang gelap
   * tepi bergelombang kehilangan ketajamannya lebih dulu daripada tepi lurus.
   */
  'symbol-pelita': (w, h) => {
    const nyala = poly([
      [w * 0.5, h * 0.08], [w * 0.68, h * 0.36], [w * 0.5, h * 0.62], [w * 0.32, h * 0.36],
    ])
    const inti = poly([
      [w * 0.5, h * 0.24], [w * 0.58, h * 0.38], [w * 0.5, h * 0.52], [w * 0.42, h * 0.38],
    ])
    const kaki = poly([
      [w * 0.36, h * 0.66], [w * 0.64, h * 0.66], [w * 0.58, h * 0.86], [w * 0.42, h * 0.86],
    ])
    const alas = poly([
      [w * 0.3, h * 0.86], [w * 0.7, h * 0.86], [w * 0.7, h * 0.93], [w * 0.3, h * 0.93],
    ])
    return {
      badan: mass(nyala) + mass(kaki) + mass(alas),
      detail: mass(inti, 0.85),
    }
  },

  'symbol-payung': (w, h) => ({
    badan: mass(tutup([
      [[w * 0.06, h * 0.46], [w * 0.1, h * 0.16], [w * 0.9, h * 0.16], [w * 0.94, h * 0.46]],
      [[w * 0.94, h * 0.46], [w * 0.8, h * 0.38], [w * 0.68, h * 0.5], [w * 0.56, h * 0.42]],
      [[w * 0.56, h * 0.42], [w * 0.44, h * 0.5], [w * 0.32, h * 0.38], [w * 0.2, h * 0.46]],
      [[w * 0.2, h * 0.46], [w * 0.14, h * 0.48], [w * 0.1, h * 0.48], [w * 0.06, h * 0.46]],
    ])),
    detail: mass(poly([[w * 0.47, h * 0.3], [w * 0.53, h * 0.3], [w * 0.53, h * 0.92], [w * 0.47, h * 0.92]]), 0.45)
      + mass(translateD(unitTema2(w, h, 6), w / 2, h * 0.14), 0.45),
  }),
}

/**
 * Unit tema dalam ukuran detail.
 *
 * Detail yang memakai cakram polos membuat dua simbol bertema berbeda tetap bertabrakan —
 * sidik jari tahan skala, jadi lingkaran selalu cocok dengan lingkaran. Detail kecil pun harus
 * membawa bentuk temanya.
 */
let temaKini = null
const unitTema2 = (_w, _h, r) => unitTema(temaKini.mahkota, r)

export function simbol(id) {
  const p = paramUntuk(id)
  temaKini = p
  const [w, h] = kotak[id]
  const f = figur[id](w, h)

  /*
   * Kartus: plat beraksen berbentuk unit tema di belakang figur, dan dua pertumbuhan yang
   * mengapitnya. Inilah yang membuat sembilan simbol yang digambar sendiri-sendiri tetap
   * terbaca sebagai milik temanya masing-masing.
   */
  /*
   * Kartus adalah **cincin**, bukan bidang penuh.
   *
   * Versi pertama menaruh unit tema sebagai plat masif di belakang figur, dan di lembar kontak
   * `symbol-candle` keluar sebagai lilin yang berdiri di atas kerucut emas raksasa: platnya
   * memikul lebih banyak luas daripada figurnya sendiri, jadi yang terbaca temanya, bukan
   * simbolnya. Gerbang tidak bisa melihat itu — kepadatan, kurva, bobot, dan keunikannya
   * semuanya lolos. Cincin membingkai figur alih-alih menelannya.
   */
  const rKartus = Math.min(w, h) * 0.46
  const plat = massHollow(
    translateD(unitTema(p.mahkota, rKartus), w / 2, h * 0.52)
    + translateD(unitTema(p.mahkota, rKartus * 0.87), w / 2, h * 0.52),
  )
  const apit = [-1, 1].map(s => mass(translateD(
    tunasTema(p, { len: 17, r0: 7.5, dir: s, tilt: s > 0 ? -0.5 : Math.PI + 0.5 }),
    w / 2 + s * w * 0.42, h * 0.78,
  ), 0.6)).join('')

  const rel = poly([[w * 0.16, h * 0.95], [w * 0.84, h * 0.95]], false)

  return {
    file: fileDari(id),
    viewBox: `0 0 ${w} ${h}`,
    bagian: [
      grup(plat, 0.85, 'accent'),
      grup(f.badan, 1, 'body'),
      grup(f.detail + apit, 1, 'glow'),
      grup(draw(rel, p.stroke, 0.5)),
    ],
  }
}

const fileDari = (id) => ({
  'symbol-rings': 'SymbolRings',
  'symbol-dove': 'SymbolDove',
  'symbol-crescent': 'SymbolCrescent',
  'symbol-lotus': 'SymbolLotus',
  'symbol-fan': 'SymbolFan',
  'symbol-candle': 'SymbolCandle',
  'symbol-wadasan': 'SymbolWadasan',
  'symbol-kupu': 'SymbolKupu',
  'symbol-payung': 'SymbolPayung',
  'symbol-wastra': 'SymbolWastra',
  'symbol-hening': 'SymbolHening',
  'symbol-pelita': 'SymbolPelita',
}[id])

export const idSimbol = Object.keys(kotak)
