import { buangLoop, cakram, daun, daunTegak, filetPoligon, kuncup, offsetInward, poly, putarD, ribbon, sampleCubics, sampleCubicsRata, sepanjangTepi, translateD, ukelBertangkai } from '../geometry.mjs'
import { cecekTepi, isenTepi } from '../isen.mjs'
import { draw, grup, mass, massHollow } from '../emit.mjs'

/**
 * Tata bahasa bersama seluruh kategori ornamen.
 *
 * **Ini yang menjawab keluhan "bingkai tidak cocok dengan ornamennya".** Sebelum rombak ini
 * sebuah tema adalah sebelas SVG yang digambar terpisah lalu diletakkan berdampingan — tidak
 * ada satu pun yang memaksa mereka berbagi apa pun, dan audit menemukan buktinya: ketupat
 * empat titik yang sama muncul di 13 komponen lintas 7 kategori.
 *
 * Sekarang tiap kategori memanggil fungsi yang sama di berkas ini dengan parameter tema yang
 * sama. Pemisah, sudut, motif, simbol, dan segel sebuah tema memakai **unit bentuk** yang
 * sama, keluarga isen yang sama, ketebalan garis yang sama, dan periode `rapport` yang sama
 * dengan bingkainya. Kecocokan dijamin konstruksi, bukan ketelitian penggambar.
 */

/* ── unit bentuk per tema ──────────────────────────────────────────────────── */

const berundak = (sudut, r, langkah = 5) => poly(sampleCubicsRata(filetPoligon(sudut, r), langkah))

/**
 * Unit bentuk khas sebuah tema, berpusat di (0,0), tingginya sekitar `r * 2`.
 *
 * Diturunkan dari `mahkota` — yang khas dari sebuah tema adalah puncak bingkainya, jadi
 * unit kecilnya adalah puncak itu dalam ukuran saku. Inilah yang membuat pemisah tema
 * `gonjong` terbaca satu keluarga dengan bingkai `gonjong`, tanpa satu koordinat pun disalin.
 *
 * Tiap cabang mengembalikan satu `d` absolut. Yang memakainya tinggal menggesernya.
 */
export function unitTema(mahkota, r) {
  /*
   * Kerapatan sampel mengikuti UKURAN unit, bukan tetap.
   *
   * Langkah tetap membuat unit kecil tersampel serapat unit besar: pada r = 4 tiap ruas lurus
   * hanya muat dua titik sementara filetnya tetap dapat jatah penuh, dan rusuk terpanjangnya
   * jadi 9,8× rusuk tengah — gerbang `lonjakan` menangkapnya pada `divider-knot`. Aturan yang
   * sama sudah dipakai `ukel()` sejak fase 39 dan `sampleCubicsRata` sejak fase 44.
   */
  const lk = Math.max(2.5, r * 0.24)
  switch (mahkota) {
    /** Gerbang berbahu lebar: kubah dengan pangkal melebar. */
    case 'gerbang':
      return poly(sampleCubics([
        [[-r * 0.72, r], [-r * 0.78, r * 0.1], [-r * 0.52, -r], [0, -r]],
        [[0, -r], [r * 0.52, -r], [r * 0.78, r * 0.1], [r * 0.72, r]],
        [[r * 0.72, r], [r * 0.3, r * 1.12], [-r * 0.3, r * 1.12], [-r * 0.72, r]],
      ], 12))

    /**
     * Ogee: dua lengkung BERBALIK yang bertemu di puncak lancip.
     *
     * Titik baliknya yang menentukan, dan versi pertama tidak punya: ia keluar sebagai kubah
     * biasa, jadi `seal-tumpal` (Senja) bertabrakan dengan `seal-laurel` (Bloom) yang memang
     * berkubah. Ogee tanpa infleksi bukan ogee — perbaikannya sekaligus memperbaiki bentuknya.
     */
    case 'ogee':
      return poly(sampleCubics([
        [[-r * 0.7, r], [-r * 0.82, r * 0.42], [-r * 0.52, r * 0.28], [-r * 0.4, -r * 0.04]],
        [[-r * 0.4, -r * 0.04], [-r * 0.3, -r * 0.34], [-r * 0.12, -r * 0.66], [0, -r]],
        [[0, -r], [r * 0.12, -r * 0.66], [r * 0.3, -r * 0.34], [r * 0.4, -r * 0.04]],
        [[r * 0.4, -r * 0.04], [r * 0.52, r * 0.28], [r * 0.82, r * 0.42], [r * 0.7, r]],
        [[r * 0.7, r], [r * 0.26, r * 1.12], [-r * 0.26, r * 1.12], [-r * 0.7, r]],
      ], 8))

    /** Art deco: puncak bertingkat, sudutnya difilet supaya terbaca terpahat. */
    case 'deco':
      return berundak([
        [-r * 0.82, r], [-r * 0.82, r * 0.28], [-r * 0.54, r * 0.28], [-r * 0.54, -r * 0.18],
        [-r * 0.26, -r * 0.18], [-r * 0.26, -r * 0.66], [0, -r],
        [r * 0.26, -r * 0.66], [r * 0.26, -r * 0.18], [r * 0.54, -r * 0.18],
        [r * 0.54, r * 0.28], [r * 0.82, r * 0.28], [r * 0.82, r],
      ], r * 0.13, lk)

    /** Paling tertahan: lonjong membulat, tidak pernah bersudut. */
    case 'halus':
      return daunTegak(r * 1.9, r * 0.66) === '' ? '' : translateD(daunTegak(r * 1.9, r * 0.66), 0, r * 0.95)

    /** Kayon/gunungan: puncak runcing, perut menggembung di 72% tinggi. */
    case 'kayon':
      return poly(sampleCubics([
        [[0, -r], [r * 0.32, -r * 0.8], [r * 0.72, -r * 0.28], [r * 0.82, r * 0.24]],
        [[r * 0.82, r * 0.24], [r * 0.9, r * 0.56], [r * 0.6, r * 0.9], [0, r]],
        [[0, r], [-r * 0.6, r * 0.9], [-r * 0.9, r * 0.56], [-r * 0.82, r * 0.24]],
        [[-r * 0.82, r * 0.24], [-r * 0.72, -r * 0.28], [-r * 0.32, -r * 0.8], [0, -r]],
      ], 12))

    /** Mega mendung: lobus awan bersarang, hidup dari LAPISNYA. */
    case 'mendung':
      return poly(sampleCubics([
        [[-r, r * 0.6], [-r * 1.05, -r * 0.1], [-r * 0.6, -r * 0.5], [-r * 0.3, -r * 0.34]],
        [[-r * 0.3, -r * 0.34], [-r * 0.24, -r * 0.86], [r * 0.3, -r * 0.94], [r * 0.44, -r * 0.4]],
        [[r * 0.44, -r * 0.4], [r * 0.86, -r * 0.5], [r * 1.06, r * 0.06], [r, r * 0.6]],
        [[r, r * 0.6], [r * 0.4, r * 0.86], [-r * 0.4, r * 0.86], [-r, r * 0.6]],
      ], 12))

    /** Kenanga: kelopak PITA yang meluruh — bukan kelopak membulat. Sumber fase 40. */
    case 'kenanga':
      return translateD(ribbon(r * 1.9, r * 0.5, 0.4), -r * 0.95, 0)

    /**
     * Gonjong: tanduk kerbau — pangkal lebar, badan menggembung keluar, puncak berdataran
     * kecil. Bukan duri; versi pertama fase 41 meruncing ke satu titik dan terbaca sebagai
     * mahkota duri.
     */
    case 'gonjong':
      return poly(sampleCubics([
        [[-r * 0.8, r], [-r * 0.72, r * 0.3], [-r * 0.5, -r * 0.4], [-r * 0.16, -r]],
        [[-r * 0.16, -r], [-r * 0.06, -r * 1.06], [r * 0.06, -r * 1.06], [r * 0.16, -r]],
        [[r * 0.16, -r], [r * 0.5, -r * 0.4], [r * 0.72, r * 0.3], [r * 0.8, r]],
        [[r * 0.8, r], [r * 0.3, r * 1.1], [-r * 0.3, r * 1.1], [-r * 0.8, r]],
      ], 12))

    /** Pelita: kubah kecil di atas bahu yang melebar — nyala di atas kakinya. */
    case 'pelita':
      return poly(sampleCubics([
        [[-r * 0.86, r], [-r * 0.9, r * 0.3], [-r * 0.54, r * 0.24], [-r * 0.46, -r * 0.1]],
        [[-r * 0.46, -r * 0.1], [-r * 0.38, -r * 0.6], [-r * 0.16, -r], [0, -r]],
        [[0, -r], [r * 0.16, -r], [r * 0.38, -r * 0.6], [r * 0.46, -r * 0.1]],
        [[r * 0.46, -r * 0.1], [r * 0.54, r * 0.24], [r * 0.9, r * 0.3], [r * 0.86, r]],
        [[r * 0.86, r], [r * 0.32, r * 1.1], [-r * 0.32, r * 1.1], [-r * 0.86, r]],
      // Delapan sampel per kubik, bukan dua belas. Lima rantai × 12 membuat `divider-pelita`,
      // `motif-pelita`, dan `seal-pelita` melewati plafon bobot; kerapatan sampel adalah yang
      // memang bisa dipotong tanpa kehilangan bentuk, dan `ogee` yang kelengkungannya sebanding
      // sudah memakai delapan sejak awal.
      ], 8))

    /** Hening: kotak berbahu rendah dengan satu takik di puncaknya — insisi, bukan hiasan. */
    case 'hening':
      return berundak([
        [-r * 0.78, r], [-r * 0.78, -r * 0.52], [-r * 0.16, -r * 0.52], [0, -r],
        [r * 0.16, -r * 0.52], [r * 0.78, -r * 0.52], [r * 0.78, r],
      ], r * 0.18, lk)

    /**
     * Wastra: tumpal yang dipenggal jadi BIDANG, bukan gigi.
     *
     * Pembedanya terhadap `tumpal` adalah dataran puncaknya. Gigi segitiga terbaca sebagai
     * renda tepi; trapesium berdataran lebar terbaca sebagai bidang yang diberi tepi — dan
     * itulah gagasan "motif diabstraksi jadi bidang besar" yang membedakan tema ini.
     */
    case 'wastra':
      return berundak([[-r * 0.94, r], [-r * 0.44, -r], [r * 0.44, -r], [r * 0.94, r]], r * 0.1, lk)

    /** Tumpal: gigi segitiga, puncaknya sedikit membulat supaya tidak terbaca sebagai panah. */
    case 'tumpal':
      return berundak([[-r * 0.86, r], [0, -r], [r * 0.86, r]], r * 0.16, lk)

    /** Bentar: menara terbelah dalam ukuran saku — celahnya tetap tidak boleh diseberangi. */
    case 'bentar': {
      const paruh = (tanda) => berundak([
        [tanda * r * 0.12, -r * 0.82],
        [tanda * r * 0.46, -r * 0.82],
        [tanda * r * 0.46, -r * 0.3],
        [tanda * r * 0.72, -r * 0.3],
        [tanda * r * 0.72, r * 0.3],
        [tanda * r * 0.95, r * 0.3],
        [tanda * r * 0.95, r],
        [tanda * r * 0.12, r],
      ], r * 0.12, lk)
      return paruh(-1) + paruh(1)
    }

    /** Oval dan mawar: lonjong penuh, dipakai bingkai lepas tema. */
    case 'oval':
    case 'rose':
      return cakram(r * 0.92)

    case 'rounded':
    default:
      return berundak([
        [-r * 0.8, -r * 0.62], [r * 0.8, -r * 0.62], [r * 0.8, r * 0.62], [-r * 0.8, r * 0.62],
      ], r * 0.3, lk)
  }
}

/* ── profil tema: sumber keunikan seluruh kategori ────────────────────────── */

/**
 * Profil sebuah tema dalam koordinat ternormalkan: rantai kubik dari (0,0) ke (1,0) yang
 * menggunung ke y = -1 di tengah.
 *
 * **Berkas ini lahir dari kegagalan yang diukur, bukan dari rencana.** Versi pertama
 * membangun sudut dan pemisah dari persegi panjang dan cakram generik, dan hanya unit
 * tengahnya yang khas tema. Gerbang keunikan langsung melonjak dari 1 jadi **144
 * pelanggaran** — karena sidik jarinya tahan geser DAN tahan skala, jadi persegi panjang
 * selalu cocok dengan persegi panjang dan lingkaran selalu cocok dengan lingkaran, berapa
 * pun ukurannya. Membuat band lebih tebal atau butiran lebih besar per tema tidak akan
 * pernah menolong; yang harus berbeda adalah BENTUKNYA.
 *
 * Itu juga yang menjelaskan kenapa tiga belas bingkai lolos gerbang yang sama sejak fase 41:
 * di sana band, rel, dan isen semuanya diturunkan dari siluet mahkota, jadi semuanya ikut
 * berbeda begitu mahkotanya berbeda. Kategori lain sekarang memakai cara yang sama, dan
 * fungsi inilah sumbernya.
 */
export function profilTema(mahkota) {
  switch (mahkota) {
    case 'gerbang':
      return [[[0, 0], [0, -0.72], [0.24, -1], [0.5, -1]], [[0.5, -1], [0.76, -1], [1, -0.72], [1, 0]]]
    case 'ogee':
      return [
        [[0, 0], [0.06, -0.42], [0.3, -0.4], [0.42, -0.72]],
        [[0.42, -0.72], [0.47, -0.92], [0.49, -1], [0.5, -1]],
        [[0.5, -1], [0.51, -1], [0.53, -0.92], [0.58, -0.72]],
        [[0.58, -0.72], [0.7, -0.4], [0.94, -0.42], [1, 0]],
      ]
    case 'deco':
      return [
        [[0, 0], [0, -0.2], [0.08, -0.26], [0.18, -0.3]],
        [[0.18, -0.3], [0.26, -0.33], [0.3, -0.52], [0.36, -0.68]],
        [[0.36, -0.68], [0.42, -0.86], [0.45, -1], [0.5, -1]],
        [[0.5, -1], [0.55, -1], [0.58, -0.86], [0.64, -0.68]],
        [[0.64, -0.68], [0.7, -0.52], [0.74, -0.33], [0.82, -0.3]],
        [[0.82, -0.3], [0.92, -0.26], [1, -0.2], [1, 0]],
      ]
    case 'halus':
      return [[[0, 0], [0.04, -0.62], [0.22, -0.82], [0.5, -0.82]], [[0.5, -0.82], [0.78, -0.82], [0.96, -0.62], [1, 0]]]
    case 'kayon':
      return [
        [[0, 0], [0.04, -0.34], [0.16, -0.66], [0.32, -0.84]],
        [[0.32, -0.84], [0.4, -0.93], [0.46, -1], [0.5, -1]],
        [[0.5, -1], [0.54, -1], [0.6, -0.93], [0.68, -0.84]],
        [[0.68, -0.84], [0.84, -0.66], [0.96, -0.34], [1, 0]],
      ]
    case 'mendung':
      return [
        [[0, 0], [0, -0.34], [0.1, -0.5], [0.24, -0.48]],
        [[0.24, -0.48], [0.28, -0.8], [0.52, -0.92], [0.62, -0.7]],
        [[0.62, -0.7], [0.78, -0.86], [0.98, -0.6], [1, 0]],
      ]
    case 'kenanga':
      return [
        [[0, 0], [0.04, -0.5], [0.16, -0.36], [0.26, -0.66]],
        [[0.26, -0.66], [0.34, -0.9], [0.42, -0.62], [0.5, -1]],
        [[0.5, -1], [0.58, -0.62], [0.66, -0.9], [0.74, -0.66]],
        [[0.74, -0.66], [0.84, -0.36], [0.96, -0.5], [1, 0]],
      ]
    case 'gonjong':
      return [
        [[0, 0], [0.06, -0.3], [0.2, -0.62], [0.38, -0.92]],
        [[0.38, -0.92], [0.44, -1.02], [0.56, -1.02], [0.62, -0.92]],
        [[0.62, -0.92], [0.8, -0.62], [0.94, -0.3], [1, 0]],
      ]
    case 'pelita':
      // Bahu yang MELEBAR dulu, baru menanjak — bukan undakan yang menyempit seperti deco.
      return [
        [[0, 0], [0.01, -0.32], [0.06, -0.44], [0.17, -0.46]],
        [[0.17, -0.46], [0.26, -0.48], [0.28, -0.62], [0.36, -0.66]],
        [[0.36, -0.66], [0.42, -0.7], [0.45, -0.9], [0.5, -1]],
        [[0.5, -1], [0.55, -0.9], [0.58, -0.7], [0.64, -0.66]],
        [[0.64, -0.66], [0.72, -0.62], [0.74, -0.48], [0.83, -0.46]],
        [[0.83, -0.46], [0.94, -0.44], [0.99, -0.32], [1, 0]],
      ]
    case 'hening':
      /*
       * Garis datar dengan satu takik — tapi takiknya DANGKAL, dan itu wajib.
       *
       * Versi pertama menaruh puncak takik di −1 supaya insisinya setegas mungkin pada bingkai.
       * Profil ini juga dijejerkan `jejerProfil` di sepanjang tepi diagonal sudut: lima
       * ulangan dari takik setinggi penuh keluar sebagai **deretan duri**, dan tema bernama
       * hening yang sudutnya berduri adalah kegagalan yang tidak satu pun gerbang bisa lihat.
       *
       * Mahkota bingkai punya definisinya sendiri di `bingkai.mjs`, jadi takik tegas di sana
       * tidak ikut didangkalkan oleh kompromi ini.
       */
      return [
        [[0, 0], [0, -0.3], [0.03, -0.44], [0.12, -0.46]],
        [[0.12, -0.46], [0.26, -0.48], [0.36, -0.5], [0.44, -0.52]],
        [[0.44, -0.52], [0.47, -0.54], [0.48, -0.66], [0.5, -0.66]],
        [[0.5, -0.66], [0.52, -0.66], [0.53, -0.54], [0.56, -0.52]],
        [[0.56, -0.52], [0.64, -0.5], [0.74, -0.48], [0.88, -0.46]],
        [[0.88, -0.46], [0.97, -0.44], [1, -0.3], [1, 0]],
      ]
    case 'wastra':
      /*
       * Dataran lebar di puncak, tapi bahunya TIDAK nol.
       *
       * Versi pertama menaruh bahu di −0,12 supaya dataran terbaca setegas mungkin. Profil ini
       * bukan hanya dipakai bingkai: `jejerProfil` menjejerkannya di sepanjang tepi diagonal
       * sudut, dan bahu yang nyaris nol membuat tiap ulangan jatuh tegak lurus ke tetangganya.
       * `corner-wastra` keluar sebagai tangga compang-camping — dan lolos kedua belas gerbang,
       * karena tidak satu pun dari mereka mengukur apakah sebuah bentuk terbaca sebagai sudut.
       *
       * Mahkota bingkai punya definisinya sendiri di `bingkai.mjs`, jadi dataran tegasnya di
       * sana tidak ikut dilunakkan oleh kompromi ini.
       */
      return [
        [[0, 0], [0.01, -0.2], [0.03, -0.3], [0.09, -0.33]],
        [[0.09, -0.33], [0.15, -0.5], [0.2, -0.68], [0.26, -0.84]],
        [[0.26, -0.84], [0.28, -0.94], [0.31, -1], [0.36, -1]],
        [[0.36, -1], [0.45, -1], [0.55, -1], [0.64, -1]],
        [[0.64, -1], [0.69, -1], [0.72, -0.94], [0.74, -0.84]],
        [[0.74, -0.84], [0.8, -0.68], [0.85, -0.5], [0.91, -0.33]],
        [[0.91, -0.33], [0.97, -0.3], [0.99, -0.2], [1, 0]],
      ]
    case 'tumpal':
      return [
        [[0, 0], [0.14, -0.28], [0.34, -0.7], [0.44, -0.92]],
        [[0.44, -0.92], [0.47, -0.99], [0.53, -0.99], [0.56, -0.92]],
        [[0.56, -0.92], [0.66, -0.7], [0.86, -0.28], [1, 0]],
      ]
    case 'bentar':
      // Terbelah: dua undakan cermin dengan lembah di tengah yang tidak pernah tertutup.
      return [
        [[0, 0], [0.02, -0.4], [0.1, -0.56], [0.2, -0.58]],
        [[0.2, -0.58], [0.3, -0.6], [0.34, -0.86], [0.42, -0.9]],
        [[0.42, -0.9], [0.46, -0.92], [0.46, -0.3], [0.5, -0.24]],
        [[0.5, -0.24], [0.54, -0.3], [0.54, -0.92], [0.58, -0.9]],
        [[0.58, -0.9], [0.66, -0.86], [0.7, -0.6], [0.8, -0.58]],
        [[0.8, -0.58], [0.9, -0.56], [0.98, -0.4], [1, 0]],
      ]
    case 'oval':
    case 'rose':
      return [[[0, 0], [0.1, -0.9], [0.9, -0.9], [1, 0]]]
    case 'rounded':
    default:
      return [
        [[0, 0], [0.02, -0.5], [0.1, -0.64], [0.24, -0.66]],
        [[0.24, -0.66], [0.5, -0.68], [0.5, -0.68], [0.76, -0.66]],
        [[0.76, -0.66], [0.9, -0.64], [0.98, -0.5], [1, 0]],
      ]
  }
}

/**
 * Menjejer profil tema `n` kali di sepanjang ruas `a → b`, menggunung ke sisi `normal`.
 *
 * Inilah yang memberi sudut, pemisah, motif, dan segel tepi bergelombang khas temanya —
 * dan karena tepinya berbeda, band, rel, dan isen yang diturunkan darinya ikut berbeda.
 * Keunikan lintas tema jadi akibat konstruksi, bukan sesuatu yang harus dijaga terpisah.
 */
export function jejerProfil(a, b, n, amplitudo, mahkota) {
  const chain = profilTema(mahkota)
  const dx = (b[0] - a[0]) / n
  const dy = (b[1] - a[1]) / n
  const panjang = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  // Normal kiri terhadap arah jalan; tanda `amplitudo` yang memilih sisinya.
  const nx = -(b[1] - a[1]) / panjang
  const ny = (b[0] - a[0]) / panjang
  const out = []
  for (let i = 0; i < n; i += 1) {
    const ox = a[0] + dx * i
    const oy = a[1] + dy * i
    for (const seg of chain) {
      out.push(seg.map(([u, v]) => [
        ox + dx * u + nx * v * amplitudo,
        oy + dy * u + ny * v * amplitudo,
      ]))
    }
  }
  return out
}

/* ── band berukir: tiga lapis yang sama untuk semua kategori ──────────────── */

/**
 * Rongga isen di dalam sebuah band, mengikuti keluarga isen temanya.
 *
 * Mengembalikan daftar `d` untuk **dilubangi**, bukan markup untuk ditimpakan. Aturannya
 * tercatat sejak pack melati dan tetap dilanggar sekali di fase 41: *massa berwarna sama di
 * atas massa tidak pernah terlihat.*
 */
export function rongga(luar, p, { band, jumlah }) {
  if (p.isen === 'ukel') return isenTepi(luar, { band, jumlah: Math.round(jumlah * 0.7), skala: p.isenSkala * 2.1 })
  return cecekTepi(luar, { band, jumlah, skala: p.isenSkala * 2.2, rapport: p.rapport })
}

/**
 * Tiga lapis baku sebuah band berukir, dan urutannya yang membuat warnanya berarti.
 *
 * Plat beraksen di bawah; band bertinta di atasnya, diperkecil `bibir` supaya platnya menyembul
 * sebagai tepi; rongga isen menembus band sehingga aksennya terbaca lewat tiap ukiran. Itu
 * persis cara ornamen emas rujukan bekerja — emasnya memikul luas sebagai tepi, dan ukirannya
 * datang belakangan.
 */
export function bandBerukir(luar, dalam, p, { band, jumlah, bibir = 0.18 }) {
  const tepi = offsetInward(luar, band * bibir)
  const lubang = rongga(luar, p, { band, jumlah })
  /*
   * Rel didesimasi tiap titik ketiga: pada band selebar ini bedanya tidak terlihat, dan
   * bytenya sepertiga. Aturan yang sama dipakai `rakit()` pada bingkai.
   *
   * `buangLoop` dijalankan SETELAH desimasi, bukan hanya di dalam `offsetInward`. Membuang dua
   * dari tiap tiga titik pada tepi bergelombang bisa membuat poligon yang tadinya bersih jadi
   * memotong dirinya sendiri — gerbang `potong-diri` menangkapnya pada `divider-knot`, dan
   * penyebabnya memang desimasinya, bukan offsetnya.
   */
  const rel = buangLoop(offsetInward(luar, band * 0.72).filter((_, i) => i % 3 === 0))
  return [
    grup(massHollow(poly(luar) + poly(dalam)), 1, 'accent'),
    grup(massHollow(poly(tepi) + poly(dalam) + lubang.join('')), 1, 'body'),
    grup(draw(poly(rel), p.stroke, 0.5)),
  ]
}

/* ── sulur khas tema ───────────────────────────────────────────────────────── */

/**
 * Sulur bertangkai dengan bentuk yang khas temanya.
 *
 * **Sulur adalah tempat kedua keunikan bocor.** Setelah siluet diturunkan dari `profilTema`,
 * gerbang keunikan masih melaporkan 36 pelanggaran, dan path yang cocok ternyata `ukel`
 * dengan parameter yang sama persis di tiap tema — cocok pada 1,000. Sidik jari tahan skala,
 * jadi memperbesar sulur satu tema tidak menolong; yang harus berbeda adalah **jumlah
 * putaran** dan **kelangsingannya**.
 *
 * Keduanya diturunkan dari `rapport` dan `isenSkala`, yang tidak pernah sama pada dua tema.
 * Sebagai akibatnya `steps` di dalam `ukel()` — yang mengikuti panjang busur — ikut berbeda,
 * jadi cacah titiknya pun berbeda dan sidiknya tidak mungkin sebanding.
 */
export function sulurTema(p, { len, r0, dir = 1, tilt = 0 }) {
  return ukelBertangkai({
    len,
    r0,
    turns: 0.68 + p.isenSkala * 0.42 + p.rapport * 0.013,
    decay: 0.36 + p.isenSkala * 0.16,
    w0: r0 * (0.28 + p.isenSkala * 0.22),
    dir,
    tilt,
  })
}

/**
 * Pertumbuhan khas tema — dan bentuknya dipilih oleh **keluarga isen**, bukan oleh angka.
 *
 * Menyetel putaran sulur per tema lewat rumus ternyata tidak cukup: dua tema yang `rapport`-nya
 * sama menghasilkan `steps` yang sama di dalam `ukel()` (keduanya terjepit ke batas bawah 10),
 * jadi cacah titiknya sama dan sidiknya tetap sebanding. Menggeser angkanya lebih jauh hanya
 * memindahkan tabrakan ke pasangan tema lain — diuji, dan `senja` bertemu `sogan` pada selisih
 * 0,001.
 *
 * Jadi yang membedakan dibuat **struktural**: tema ber-`ukel` menumbuhkan sulur melingkar,
 * tema ber-`cecek` menumbuhkan tangkai bermanik, tema ber-`sawut` menumbuhkan pelepah berpita.
 * Tiga bentuk yang berbeda jenisnya, bukan tiga ukuran dari satu bentuk — dan itu sekaligus
 * lebih benar: pertumbuhan sebuah tema memang seharusnya seirama dengan isennya.
 */
export function tunasTema(p, { len, r0, dir = 1, tilt = 0 }) {
  const ux = Math.cos(tilt)
  const uy = Math.sin(tilt)
  // Normal terhadap tangkai; `dir` memilih sisi mana yang digemukkan.
  const nx = -uy * dir
  const ny = ux * dir

  /*
   * **Kuncup unit tema di pangkal, untuk KETIGA keluarga.**
   *
   * Versi pertama hanya memberikannya pada cabang `ukel`, dan gerbang keunikan menemukan
   * sisanya: `symbol-candle` (gonjong) bertemu `symbol-payung` (bentar) karena cabang `cecek`
   * menghasilkan tangkai dan tiga manik yang sama persis di tiap tema, dan `symbol-rings`
   * (alba) bertemu `symbol-kupu` (kenanga) pada cabang `sawut`. Keluarga isen membedakan
   * JENIS pertumbuhannya, tapi di dalam satu keluarga ia masih nilai bawaan — dan nilai bawaan
   * yang muncul di banyak tempat persis yang dicari audit yang memulai rombak ini.
   */
  /*
   * Kuncup diletakkan JELAS di belakang pangkal, bukan menempel padanya.
   *
   * Pada jarak 0,2·r0 ia tenggelam di dalam batangnya sendiri — gerbang `massa-tertimbun`
   * menangkapnya di sembilan segel, dan gerbang itu benar: massa sewarna di dalam massa
   * sewarna tidak menambah apa pun yang terlihat. Pada 0,8·r0 ia keluar dari batang dan
   * terbaca sebagai pangkal yang sesungguhnya.
   */
  const kuncup = translateD(unitTema(p.mahkota, r0 * 0.44), -ux * r0 * 0.82, -uy * r0 * 0.82)

  if (p.isen === 'ukel') return sulurTema(p, { len, r0, dir, tilt }) + kuncup

  if (p.isen === 'cecek') {
    // Tangkai meruncing, lalu tiga manik yang mengecil — cukia songket dalam ukuran saku.
    const tangkai = poly([
      [0, 0],
      [ux * len + nx * r0 * 0.22, uy * len + ny * r0 * 0.22],
      [ux * len * 1.06, uy * len * 1.06],
      [ux * len - nx * r0 * 0.1, uy * len - ny * r0 * 0.1],
    ])
    const manik = [0.52, 0.78, 1.02].map((t, i) => translateD(
      cakram(r0 * (0.4 - i * 0.1)),
      ux * len * t + nx * r0 * (0.5 + i * 0.16),
      uy * len * t + ny * r0 * (0.5 + i * 0.16),
    )).join('')
    return tangkai + manik + kuncup
  }

  /*
   * `sawut`: pelepah berpita yang meluruh, sejalan dengan garis rambutnya.
   *
   * Pelepah dan kelopak ujungnya DIPUTAR mengikuti `tilt`, dan sebelumnya tidak. `ribbon()`
   * memancar mendatar dari titik asal, jadi selama cabang ini hanya dipakai pada tunas yang
   * arahnya kebetulan mendatar, tidak ada yang terlihat salah — dan itulah keadaan sembilan
   * belas glyph sawut yang sudah ada. Begitu keping ladang memintanya memancar ke samping,
   * pelepahnya menunjuk arah yang keliru dan kuncupnya — yang diletakkan di belakang pangkal
   * sepanjang sumbu tunas — jatuh di dalam pelepahnya sendiri.
   */
  return putarD(ribbon(len * 1.1, r0 * 0.5, 0.3 + p.isenSkala * 0.3), tilt)
    + translateD(putarD(daunTegak(r0 * 1.2, r0 * 0.34), tilt + Math.PI / 2), ux * len, uy * len)
    + kuncup
}

/* ── deret berirama ────────────────────────────────────────────────────────── */

/**
 * Menempatkan unit di sepanjang sebuah garis dengan irama `rapport`.
 *
 * Aturan iramanya sama dengan `cecekTepi`: tiap unit ke-`rapport` jadi jangkar yang besar,
 * tengah kelompok dapat unit madya, sisanya kecil. Satu aturan irama untuk seluruh bank, jadi
 * pemisah, motif, dan band bingkai satu tema berdenyut pada ketukan yang sama.
 */
export function deret(jumlah, rapport, pasang) {
  const r = Math.max(2, Math.round(rapport))
  const out = []
  for (let i = 0; i < jumlah; i += 1) {
    const dalam = i % r
    const madya = r >= 4 && dalam === Math.floor(r / 2)
    const skala = dalam === 0 ? 1 : madya ? 0.68 : 0.46
    const bagian = pasang({ i, skala, jangkar: dalam === 0, madya })
    if (bagian) out.push(bagian)
  }
  return out.join('')
}

export { cakram, cecekTepi, daun, draw, grup, isenTepi, kuncup, mass, massHollow, offsetInward, poly, sampleCubics, sepanjangTepi, translateD, ukelBertangkai }
