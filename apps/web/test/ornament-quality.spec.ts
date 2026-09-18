import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// Mesin gerbang adalah modul JS polos di luar app — sengaja, supaya ia bisa dijalankan
// sendiri lewat `pnpm ornament:verify` tanpa memuat Nuxt.
import { bacaTema, buktiLengkung, jalankan, kepingan } from '../../../scripts/ornament-forge/verify.mjs'
import { lonjakan, massaTertimbun, potongDiri, runtuh, subPathJangkar, subPathPolyline } from '../../../scripts/ornament-forge/bentuk.mjs'
import { buangLoop } from '../../../scripts/ornament-forge/geometry.mjs'

/**
 * Gerbang mutu ornamen, dijalankan sebagai ratchet.
 *
 * Pemilik produk menilai ornamennya kaku dan bentuknya tidak jelas. Audit membenarkannya
 * dengan angka: 31% bank tanpa satu pun kurva Bézier, 64% tanpa `data-draw`, dan satu
 * ketupat empat titik yang sama muncul di 13 komponen lintas 7 kategori.
 *
 * Berkas ini mengubah penilaian itu jadi gerbang. Tapi bank sekarang **memang** gagal di
 * hampir semua gerbang, dan menjadikannya merah hari ini berarti suite selalu merah sampai
 * seluruh 132 ornamen digubah ulang — yang berarti ia berhenti menjaga apa pun di antaranya.
 *
 * Jadi yang dijaga adalah **arahnya**: `ornament-quality.baseline.json` mencatat kegagalan
 * yang sudah ada, dan tes gagal kalau
 *   1. muncul kegagalan BARU yang tidak ada di garis dasar, atau
 *   2. ada entri garis dasar yang ternyata sudah lulus tapi masih tercantum.
 *
 * Syarat kedua yang membuat berkas itu tidak pernah berbohong: tiap ornamen yang diperbaiki
 * memaksa garis dasarnya ikut mengecil di commit yang sama.
 */

const web = fileURLToPath(new URL('..', import.meta.url))
const baca = (rel: string) => readFileSync(web + rel, 'utf8')

/** Menelusuri satu direktori dan memilih berkas yang cocok — tanpa menambah dependensi. */
const cari = (dir: string, cocok: (nama: string) => boolean) =>
  readdirSync(web + dir, { recursive: true, encoding: 'utf8' })
    .filter(nama => cocok(nama.replaceAll('\\', '/')))
    .map(nama => `${dir}/${nama.replaceAll('\\', '/')}`)
    .sort()

const baseline = JSON.parse(
  readFileSync(fileURLToPath(new URL('./ornament-quality.baseline.json', import.meta.url)), 'utf8'),
) as {
  perGlyph: Record<string, string[]>
  keunikan: string[]
  kohesi: string[]
}

const hasil = jalankan() as unknown as {
  jumlahGlyph: number
  perGlyph: Record<string, string[]>
  keunikan: { a: string, b: string }[]
  kohesi: { tema: string }[]
}

const pasangan = (v: { a: string, b: string }) => [v.a, v.b].sort().join(' ↔ ')

describe('metrik kelengkungan', () => {
  /*
   * Metrik ini load-bearing, dan versi pertamanya SALAH dengan cara yang mahal: ia
   * menghitung huruf `C`/`S`/`Q`. `bingkai-kayon.svg` — ornamen paling kaya di seluruh
   * repo — punya nol huruf kurva dan 3.341 perintah garis, karena ia poligon hasil sampling
   * rantai kubik. Gerbang yang menghitung huruf akan menghukumnya sebagai primitif dan
   * memblokir seluruh keluaran mesin geometri, yang memakai teknik yang sama.
   *
   * Karena itu metriknya diuji pada bentuk yang sudah diketahui jawabannya, bukan hanya
   * dijalankan pada bank dan dipercaya karena angkanya terlihat masuk akal.
   */
  const bersudut: [string, string][] = [
    ['kotak', 'M14 14 H286 V406 H14 Z'],
    ['ketupat empat titik', 'M120 10 L130 20 L120 30 L110 20 Z'],
    ['segitiga tumpal', 'M40 394 L58 362 L76 394 Z'],
    ['kotak berongga evenodd', 'M14 14 H286 V406 H14 Z M28 28 V392 H272 V28 Z'],
  ]

  it.each(bersudut)('menolak %s', (_nama, d) => {
    expect(buktiLengkung(d)).toBe(0)
  })

  it('menolak poligon bergerigi meski titiknya banyak', () => {
    // Tanpa penjaga belokan, apa pun yang bertitik banyak akan lolos — termasuk gigi gergaji.
    const gerigi = Array.from({ length: 40 }, (_, i) => `${i ? 'L' : 'M'}${i * 10} ${i % 2 ? 0 : 40}`).join('') + 'Z'
    expect(buktiLengkung(gerigi)).toBe(0)
  })

  it('menerima poligon tersampel dari rantai kubik', () => {
    // Siluet kayon: 130 titik, belokan kecil. Inilah bentuk yang metrik lama tolak.
    const kayon = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * Math.PI * 2
      return `${i ? 'L' : 'M'}${(150 + Math.cos(a) * 140).toFixed(1)} ${(210 + Math.sin(a) * 200).toFixed(1)}`
    }).join('') + 'Z'
    expect(buktiLengkung(kayon)).toBeGreaterThanOrEqual(8)
  })

  it('menilai tiap sub-path sendiri', () => {
    // Dua lingkaran tersampel dalam satu `d`. Dibaca sebagai satu deret titik, lompatan
    // antar sub-path merusak rata-rata belokannya — dan itulah yang sempat membuat
    // `ukelBertangkai`, primitif terpenting di kosakata ini, dinilai nol.
    const lingkaran = (cx: number) => Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2
      return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * 40).toFixed(1)} ${(Math.sin(a) * 40).toFixed(1)}`
    }).join('') + 'Z'
    expect(buktiLengkung(lingkaran(0) + lingkaran(400))).toBeGreaterThanOrEqual(8)
  })
})

describe('gerbang geometris — yang bisa melihat', () => {
  /*
   * Fase 41 meninggalkan satu kalimat yang jadi spesifikasi berkas ini: *"delapan gerbang
   * meloloskan tujuh bingkai yang jelas rusak di layar. Gerbang mengukur kepadatan,
   * kelengkungan, bobot, keunikan — tidak satu pun bisa melihat poligon yang memotong dirinya
   * sendiri."*
   *
   * Tiap gerbang di bawah diuji pada bentuk yang SUDAH DIKETAHUI jawabannya, bukan sekadar
   * dijalankan pada bank lalu dipercaya karena angkanya terlihat masuk akal. Disiplin itu
   * bukan kehati-hatian berlebih: metrik kelengkungan fase 39 dan metrik kepadatan fase 41
   * keduanya salah, dan keduanya "terlihat masuk akal" saat dijalankan pada bank.
   */

  describe('potong-diri', () => {
    const kotak = [[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][]
    const pita = [[0, 0], [10, 10], [10, 0], [0, 10]] as [number, number][]

    it('menerima poligon sederhana', () => {
      expect(potongDiri(kotak)).toBeNull()
    })

    it('menolak pita yang menyilang', () => {
      expect(potongDiri(pita)).not.toBeNull()
    })

    it('tidak tertipu sentuhan di ujung rusuk', () => {
      // Dua rusuk berbagi titik ujung adalah hal biasa pada poligon tertutup, bukan cacat.
      // Tanpa uji perpotongan SEJATI, tiap poligon akan dilaporkan memotong dirinya sendiri.
      const jam = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return [Math.cos(a) * 50, Math.sin(a) * 50] as [number, number]
      })
      expect(potongDiri(jam)).toBeNull()
    })

    it('menemukan simpul di tengah siluet panjang', () => {
      // Bentuk nyata yang merusak tujuh bingkai fase 41: satu titik melompat melewati
      // tetangganya di lembah cekung, dan poligonnya menyeberangi rusuknya sendiri.
      const pts = Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2
        return [Math.cos(a) * 60, Math.sin(a) * 60] as [number, number]
      })
      pts[10] = [-80, 0]
      expect(potongDiri(pts)).not.toBeNull()
    })
  })

  describe('buangLoop', () => {
    it('menghapus simpul dan mengembalikan poligon yang bersih', () => {
      // Inilah perbaikan yang ditemukan gerbang, bukan yang direncanakan: sepuluh dari tiga
      // belas bingkai yang fase 41 nyatakan selesai ternyata masih memotong dirinya sendiri,
      // dan semuanya keluaran `offsetInward`.
      const pts = Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2
        return [Math.cos(a) * 60, Math.sin(a) * 60] as [number, number]
      })
      pts[10] = [-80, 0]
      expect(potongDiri(pts)).not.toBeNull()
      expect(potongDiri(buangLoop(pts))).toBeNull()
    })

    it('tidak menyentuh poligon yang sudah bersih', () => {
      const bulat = Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2
        return [Math.cos(a) * 40, Math.sin(a) * 40] as [number, number]
      })
      expect(buangLoop(bulat)).toEqual(bulat)
    })
  })

  describe('lonjakan', () => {
    it('menilai sampel merata sebagai 1', () => {
      const bulat = Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2
        return [Math.cos(a) * 40, Math.sin(a) * 40] as [number, number]
      })
      expect(lonjakan(bulat)).toBeLessThan(1.1)
    })

    it('menangkap kaki raksasa yang ditinggalkan penggeser rusak', () => {
      // Bug `translateD` fase 41: `cakram()` seluruhnya perintah `C`, jadi hanya titik awalnya
      // yang ikut pindah dan titik kontrolnya tertinggal — di layar tiap titik cecek jadi
      // sapuan raksasa dari pojok. Jejaknya satu rusuk yang jauh lebih panjang dari sisanya.
      const cakramKecil = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return [Math.cos(a) * 6, Math.sin(a) * 6] as [number, number]
      })
      expect(lonjakan([[220, 300], ...cakramKecil])).toBeGreaterThan(20)
    })
  })

  describe('runtuh', () => {
    it('menolak sub-path dua titik', () => {
      expect(runtuh([[10, 10], [80, 10], [10, 10]])).toBe(true)
    })

    it('menolak sliver berbidang nyaris nol', () => {
      expect(runtuh([[0, 0], [100, 0.4], [100, 0], [0, 0.4]])).toBe(true)
    })

    it('menerima bidang sungguhan', () => {
      expect(runtuh([[0, 0], [100, 0], [100, 60], [0, 60]])).toBe(false)
    })

    it('tidak dipakai pada sub-path berkurva — itu kesalahan yang sama dua kali', () => {
      /*
       * Versi pertama gerbang ini memeriksa SEMUA sub-path lewat titik jangkarnya, dan
       * langsung menuduh 72 glyph. Sebabnya: daun sah seperti di bawah hanya punya dua
       * jangkar, karena badannya hidup di titik kontrol. Itu kesalahan sekeluarga dengan
       * metrik huruf kurva fase 39 — mengukur bentuk lewat cara penulisannya.
       */
      expect(subPathPolyline('M132 20 C122 12 110 8 96 8 C102 18 114 24 132 20 Z')).toEqual([])
      expect(subPathJangkar('M132 20 C122 12 110 8 96 8 C102 18 114 24 132 20 Z')).toHaveLength(1)
    })
  })

  describe('massa tertimbun', () => {
    const kotak = (x0: number, y0: number, w: number, h: number) =>
      ({ x0, y0, x1: x0 + w, y1: y0 + h })
    /** Poligon persegi sungguhan, supaya uji titik-dalam-poligon punya bahan. */
    const persegi = (x0: number, y0: number, w: number, h: number) =>
      [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]] as [number, number][]

    it('menolak massa sewarna yang ditumpuk di atas massa sewarna', () => {
      // Bug pertama fase 41, dan yang paling memalukan: delapan belas keping isen ada di
      // berkas, di koordinat yang benar, dan tidak satu pun terlihat.
      expect(massaTertimbun([
        { grup: 1, opacity: '1', evenodd: false, luas: 10000, kotak: kotak(0, 0, 100, 100), titik: persegi(0, 0, 100, 100) },
        { grup: 1, opacity: '1', evenodd: false, luas: 100, kotak: kotak(20, 20, 10, 10), titik: persegi(20, 20, 10, 10) },
      ])).not.toBeNull()
    })

    it('menerima ukiran tembus — rongga di dalam satu path evenodd', () => {
      // Isen yang dikerjakan dengan BENAR hidup sebagai sub-path di dalam satu `<path>`
      // ber-`fill-rule="evenodd"`. Gerbang yang tidak membedakan keduanya akan menghukum
      // persis pekerjaan yang ia ada untuk mendorongnya.
      expect(massaTertimbun([
        { grup: 1, opacity: '1', evenodd: true, luas: 10000, kotak: kotak(0, 0, 100, 100), titik: persegi(0, 0, 100, 100) },
        { grup: 1, opacity: '1', evenodd: true, luas: 100, kotak: kotak(20, 20, 10, 10), titik: persegi(20, 20, 10, 10) },
      ])).toBeNull()
    })

    it('menerima manik yang duduk di SAMPING tangkai, bukan di dalamnya', () => {
      /*
       * Versi pertama gerbang ini memutuskan lewat kotak pembatas saja, dan langsung menuduh
       * empat ornamen: manik di samping tangkai punya kotak yang masih berada di dalam kotak
       * tangkainya, padahal ia jelas terlihat. Kotak dipakai sebagai saringan; yang memutuskan
       * uji titik-dalam-poligon.
       */
      const tangkai: [number, number][] = [[0, 0], [4, 0], [4, 100], [0, 100]]
      expect(massaTertimbun([
        { grup: 1, opacity: '1', evenodd: false, luas: 400, kotak: kotak(0, 0, 4, 100), titik: tangkai },
        // Manik di x 10–18: kotaknya TIDAK di dalam kotak tangkai, jadi saringan sudah cukup.
        { grup: 1, opacity: '1', evenodd: false, luas: 64, kotak: kotak(10, 40, 8, 8), titik: persegi(10, 40, 8, 8) },
      ])).toBeNull()

      // Dan kasus yang benar-benar menipu: kotak kecil DI DALAM kotak besar, tapi pusatnya di
      // luar bidangnya, karena bidang besarnya berbentuk C.
      const hurufC: [number, number][] = [
        [0, 0], [100, 0], [100, 20], [20, 20], [20, 80], [100, 80], [100, 100], [0, 100],
      ]
      expect(massaTertimbun([
        { grup: 1, opacity: '1', evenodd: false, luas: 5600, kotak: kotak(0, 0, 100, 100), titik: hurufC },
        { grup: 1, opacity: '1', evenodd: false, luas: 100, kotak: kotak(50, 45, 10, 10), titik: persegi(50, 45, 10, 10) },
      ])).toBeNull()
    })

    it('menerima massa di bidang nilai yang berbeda', () => {
      expect(massaTertimbun([
        { grup: 1, opacity: '1', evenodd: false, luas: 10000, kotak: kotak(0, 0, 100, 100), titik: persegi(0, 0, 100, 100) },
        { grup: 1, opacity: '0.45', evenodd: false, luas: 100, kotak: kotak(20, 20, 10, 10), titik: persegi(20, 20, 10, 10) },
      ])).toBeNull()
    })
  })

  it('membaca opacity grup, bukan hanya opacity path', () => {
    // `massa-tertimbun` membandingkan bidang nilai, dan bidang nilai sebuah path bisa datang
    // dari `<g opacity>`-nya. Membacanya sebagai 1 akan menyamakan dua lapis yang sebenarnya
    // berbeda, lalu melaporkan cacat yang tidak ada.
    const svg = '<svg><g opacity="0.45"><path data-mass="" d="M0 0L10 0L10 10Z" /></g></svg>'
    expect(kepingan(svg)[0]?.opacity).toBe('0.45')
  })
})

describe('klaim budaya wajib bersumber', () => {
  /*
   * Skill `aruna-ornament-builder` melarang mengarang makna budaya, dan larangan itu sudah
   * dilanggar sekali: `motif-kawung` mengaku "motif batik tertua", `motif-tumpal` mengaku
   * "dasar dari hampir semua tepi kain Nusantara", dan `symbol-payung` mengaku payung upacara
   * Bali — padahal satu-satunya sumber di repo mengaitkan payung ke janur Jawa.
   *
   * Semuanya lahir sebagai satu baris JSDoc yang terdengar wajar. Jadi yang dijaga di sini
   * bukan niat, melainkan bentuk kalimatnya: komentar yang membuat klaim makna, asal-usul,
   * atau superlatif WAJIB membawa penanda sumber di komentar yang sama.
   */
  const ornamen = cari('components/ornament', n => n.endsWith('.vue'))

  /** Kata yang menandai sebuah kalimat sedang mengklaim, bukan sedang menggambarkan bentuk. */
  const polaKlaim = [
    /\bter(tua|besar|pertama)\b/i,
    /\bhampir semua\b/i,
    /\bmelambangkan\b/i,
    /\blambang\b/i,
    /\bbermakna\b/i,
    /\bdipercaya\b/i,
    /\bsakral\b/i,
    /\bupacara\b/i,
    /\britual\b/i,
  ]

  /** Penanda sumber: tanggal periksa, rujukan CULTURE, atau pernyataan tak-bersumber. */
  const adaSumber = (teks: string) =>
    /diperiksa 20\d\d/.test(teks)
    || /CULTURE-BANK\.md/.test(teks)
    || /CULTURE\.md/.test(teks)
    || /tidak bersumber|tanpa sumber|dihapus 20\d\d|dilepas 20\d\d/i.test(teks)

  it('menemukan komponen ornamen yang dijaga', () => {
    expect(ornamen.length).toBeGreaterThanOrEqual(130)
  })

  it.each(ornamen)('%s tidak mengklaim makna budaya tanpa sumber', (rel) => {
    const komentar = (baca(rel).match(/\/\*[\s\S]*?\*\/|\/\/.*/g) ?? []).join('\n')
    const mengklaim = polaKlaim.filter(p => p.test(komentar)).map(String)
    if (!mengklaim.length) return
    // Komentar boleh mengklaim — asal membawa rujukannya di komentar yang sama.
    expect({ berkas: rel, mengklaim, bersumber: adaSumber(komentar) }).toMatchObject({ bersumber: true })
  })
})

describe('gerbang mutu ornamen', () => {
  it('membaca seluruh bank, termasuk 45 keping layer', () => {
    // 45 keping `layer` didaftarkan lewat helper, bukan objek literal. Kalau pembacanya
    // kembali hanya menangkap 87, sepertiga bank akan lolos gerbang tanpa pernah diukur.
    expect(hasil.jumlahGlyph).toBeGreaterThanOrEqual(132)
  })

  it('gerbang keunikan masih mengukur 54 slot, bukan melaporkan bersih karena kosong', () => {
    /*
     * `gerbangKeunikan` membangun kepemilikan dari `bacaTema()` lalu melewati glyph tanpa
     * pemilik diam-diam (`if (!ta || !tb) continue`). Jadi "0 pelanggaran" punya dua arti yang
     * tidak bisa dibedakan dari angkanya: bersih, atau tidak mengukur apa-apa.
     *
     * Fase 48 mempensiunkan delapan tema, dan tanpa penjaga ini cakupannya akan diam-diam
     * turun 54 → 6 sementara laporannya tetap hijau. Set ornamen tema pensiun karena itu
     * tetap tinggal di `theme.ts` dalam bentuk yang sama, supaya pembaca yang sama
     * menemukannya.
     */
    const tema = bacaTema()
    const slot = Object.values(tema).reduce((jumlah, set) => jumlah + Object.keys(set).length, 0)
    expect(slot).toBe(Object.keys(tema).length * 6)
    expect(slot).toBeGreaterThanOrEqual(54)
  })

  it('tidak ada glyph yang gagal gerbang baru', () => {
    const baru: Record<string, string[]> = {}
    for (const [id, gerbang] of Object.entries(hasil.perGlyph)) {
      const dikenal = baseline.perGlyph[id] ?? []
      const tambahan = gerbang.filter(g => !dikenal.includes(g))
      if (tambahan.length) baru[id] = tambahan
    }
    expect(baru).toEqual({})
  })

  it('garis dasar tidak menyimpan kegagalan yang sudah lulus', () => {
    const usang: Record<string, string[]> = {}
    for (const [id, gerbang] of Object.entries(baseline.perGlyph)) {
      const sekarang = hasil.perGlyph[id] ?? []
      const lulus = gerbang.filter(g => !sekarang.includes(g))
      if (lulus.length) usang[id] = lulus
    }
    // Hapus entri ini dari `ornament-quality.baseline.json` — ornamennya sudah diperbaiki.
    expect(usang).toEqual({})
  })

  it('tidak ada pelanggaran keunikan baru antar tema', () => {
    // DESIGN.md:295 — frame/divider/corner/motif/symbol/seal tidak pernah berulang antar
    // tema. Empat pelanggaran sudah tayang hari ini; yang dijaga adalah tidak bertambah.
    const sekarang = hasil.keunikan.map(pasangan)
    expect(sekarang.filter(p => !baseline.keunikan.includes(p))).toEqual([])
  })

  it('garis dasar keunikan tidak menyimpan pasangan yang sudah bersih', () => {
    const sekarang = hasil.keunikan.map(pasangan)
    expect(baseline.keunikan.filter(p => !sekarang.includes(p))).toEqual([])
  })

  it('tidak ada tema yang kehilangan kohesinya', () => {
    const sekarang = hasil.kohesi.map(k => k.tema)
    expect(sekarang.filter(t => !baseline.kohesi.includes(t))).toEqual([])
  })
})
