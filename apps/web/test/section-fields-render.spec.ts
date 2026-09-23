import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { sectionFields, storyVariants, structures, unrenderedFieldKeys } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

/*
 * Penjaga fase 79 — dan alasan keberadaannya bisa ditunjuk dengan tanggal.
 *
 * Sampai fase ini `story`, `rundown`, `dresscode`, dan `video` punya sembilan kolom teks yang
 * muncul di form, tersimpan ke `draftDocument`, lolos validasi, ikut terbit — lalu dibaca dari
 * sistem `copy` global alih-alih `section.data`, jadi menyuntingnya tidak mengubah apa pun di
 * layar. Kolom kesepuluh (`wishes.loadingLabel`) menyusul dengan cara yang sama persis, dan
 * tidak seorang pun menemukannya sampai penjaga ini ditulis.
 *
 * Tak satu pun gerbang yang ada bisa menangkapnya: compiler tidak tahu apa yang dibaca sebuah
 * `<template>`, skema hanya memvalidasi bentuk, dan e2e memeriksa yang dirender — bukan yang
 * SEHARUSNYA dirender tapi tidak. Yang bisa menangkapnya hanya pembacaan teks sumber, dan itu
 * yang dilakukan berkas ini — pola yang sama dengan `renderer-coverage.spec.ts`,
 * `invitation-breakpoints.spec.ts`, dan `ornament-slots.spec.ts`: suite akar tidak punya plugin
 * Vue maupun alias `~/`, jadi komponennya dibaca sebagai teks, bukan diimpor.
 */

const dir = (jalur: string) => fileURLToPath(new URL(jalur, import.meta.url))
const baca = (jalur: string) => readFileSync(dir(jalur), 'utf8')
const tanpaKomentar = (sumber: string) =>
  sumber.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '')

const renderer = tanpaKomentar(baca('../components/invitation/Renderer.vue'))

/** `identifier → jalur relatif` dari baris impor statis `import X from './…vue'`. */
const impor = new Map<string, string>(
  [...renderer.matchAll(/import\s+(\w+)\s+from\s+'(\.[^']+\.vue)'/g)].map(cocok => [cocok[1]!, cocok[2]!]),
)

/** Kunci → identifier komponen dari sebuah literal peta `const <nama>: Record<…> = { … }`. */
function peta(nama: string): Map<string, string> {
  const awal = renderer.indexOf(`const ${nama}: Record<`)
  expect(awal, `literal peta ${nama} tidak ditemukan — regexnya yang basi, bukan kodenya`).toBeGreaterThan(-1)
  const buka = renderer.indexOf('{', awal)
  const badan = renderer.slice(buka + 1, renderer.indexOf('\n}', buka))
  return new Map([...badan.matchAll(/^\s*'?([a-z-]+)'?\s*:\s*(\w+)/gm)].map(c => [c[1]!, c[2]!]))
}

const elegance = peta('eleganceComponents')

/**
 * Seluruh teks sumber yang ikut merender sebuah tipe: berkas komponennya, ditambah berkas yang
 * ditariknya lewat `import.meta.glob('./x/*.vue')` dan lewat impor relatif `./x/Y.vue`.
 *
 * Tanpa itu bagian `story` akan terbaca tidak merender kolomnya sama sekali sejak fase 79 —
 * `Story.vue` hanya pintu, dan isinya tinggal di lima berkas varian di `sections/story/`.
 */
function sumberTipe(identifier: string): string {
  const jalur = impor.get(identifier)
  if (!jalur) return ''
  const dasar = `../components/invitation/${jalur.replace(/^\.\//, '')}`
  let teks = baca(dasar)

  const folder = dasar.replace(/\/[^/]+\.vue$/, '')
  for (const cocok of teks.matchAll(/import\.meta\.glob<[^>]*>\('\.\/([^']+)\/\*\.vue'\)/g)) {
    const anak = `${folder}/${cocok[1]!}`
    for (const nama of readdirSync(dir(anak)).filter(n => n.endsWith('.vue'))) teks += baca(`${anak}/${nama}`)
  }
  for (const cocok of teks.matchAll(/from\s+'\.\/([^']+\.vue)'/g)) {
    try { teks += baca(`${folder}/${cocok[1]!}`) } catch { /* impor ke luar folder: bukan urusan di sini */ }
  }
  /*
   * Dan util yang diimpornya. Sebuah kolom boleh dibaca lewat penyempit alih-alih langsung dari
   * template — `story.variant` lewat `storyVariantEfektif`, `dresscode.attire` lewat `toAttire` —
   * dan itu justru bentuk yang lebih baik, bukan yang lebih buruk. Yang dijaga berkas ini adalah
   * kolom yang tidak dibaca DI MANA PUN.
   */
  for (const cocok of teks.matchAll(/from\s+'~\/utils\/([\w-]+)'/g)) {
    try { teks += baca(`../utils/${cocok[1]!}.ts`) } catch { /* util tanpa berkas .ts: abaikan */ }
  }
  /*
   * Kunci sistem copy dibuang SEBELUM dicocokkan, dan ini bukan kerapian.
   *
   * Kunci-kunci itu bertitik — `t('dresscode.note')`, `t('story.closing')` — jadi pencocokan
   * akses properti di bawah akan melihat `.note` dan `.closing` di dalamnya dan menyatakan
   * kolomnya hidup. Itu persis kebalikan dari kebenaran: membaca kunci copy alih-alih
   * `section.data` ADALAH cacat yang fase 79 tambal. Penjaga yang membiarkannya lolos akan
   * hijau di hadapan bug yang melahirkannya.
   */
  return teks.replace(/\bt\('[^']*'\)/g, '')
}

/**
 * Sebuah kolom terhitung dibaca kalau namanya muncul sebagai string terkutip (`text(section,
 * 'kicker')`, `field="title"`) ATAU sebagai akses properti (`data.hasSecondAccount`).
 *
 * Bentuk kedua wajib ada di sini: dua kolom yang benar-benar dirender hari ini — `hasSecondAccount`
 * di Hadiah dan `variant` di Cerita — dibaca persis begitu, dan penjaga yang menuduh keduanya
 * mati adalah penjaga yang akan dimatikan orang, bukan diikuti.
 */
/*
 * **Batas yang diketahui, dan sengaja tidak ditutup.** Pencocokan teks tidak tahu MILIK SIAPA
 * sebuah nama. Dijalankan terhadap kode sebelum fase 79, penjaga ini menangkap sembilan dari
 * sepuluh kolom mati — `rundown.title` lolos, karena baris rundown membaca `item.title` milik
 * barisnya sendiri dan namanya kebetulan sama dengan kolom bagiannya.
 *
 * Menutupnya butuh parser Vue sungguhan yang tahu ekspresi mana berjangkar ke `section.data`.
 * Sembilan dari sepuluh, tanpa dependensi dan dalam lima milidetik, adalah pertukaran yang
 * diambil sadar — tapi jangan membacanya sebagai jaminan.
 */
const dibaca = (sumber: string, key: string) =>
  sumber.includes(`'${key}'`) || sumber.includes(`"${key}"`) || new RegExp(`\\.${key}\\b`).test(sumber)

describe('parser', () => {
  it('benar-benar menemukan sesuatu — kalau tidak, seluruh berkas ini hijau palsu', () => {
    expect(elegance.size).toBeGreaterThanOrEqual(15)
    expect(impor.size).toBeGreaterThanOrEqual(15)
    for (const identifier of elegance.values()) {
      expect(impor.has(identifier), `${identifier} ada di peta tapi tidak diimpor`).toBe(true)
    }
    // Pintu cerita memang memuat variannya lewat glob; kalau baris itu hilang, tes #2 jadi bohong.
    expect(sumberTipe(elegance.get('story')!)).toContain('iv-story-rail')
  })
})

describe('tiap kolom yang bisa diisi pasangan benar-benar dirender', () => {
  it.each([...elegance.keys()])('%s', tipe => {
    const sumber = sumberTipe(elegance.get(tipe)!)
    const hilang = (sectionFields[tipe as keyof typeof sectionFields] ?? [])
      .map(field => field.key)
      .filter(key => !unrenderedFieldKeys.has(key))
      .filter(key => !dibaca(sumber, key))
    expect(
      hilang,
      `kolom ini punya form, tersimpan, dan ikut terbit — lalu tidak pernah muncul di layar: ${hilang.join(', ')}`,
    ).toEqual([])
  })

  it('daftar pengecualiannya kosong, dan tetap harus kosong', () => {
    // Menambah sesuatu ke sini adalah keputusan yang harus dibela di kontrak, bukan cara
    // mematikan tes merah. Baris ini yang memaksa pembelaan itu terjadi.
    expect([...unrenderedFieldKeys]).toEqual([])
  })
})

describe('tiap bagian Elegance ikut latar, gerak, dan penggulir bagian', () => {
  /*
   * Sengaja hanya keluarga `elegance`. Tiga belas komponen di peta `warisan` memang tidak punya
   * ketiganya dan tidak boleh dipaksa punya — dokumen v1 tidak pernah menulis `background`
   * maupun `motion` per bagian.
   */
  const berbadan = [...elegance.keys()].filter(tipe => !structures.elegance.headless.has(tipe as never))

  it.each(berbadan)('%s', tipe => {
    const sumber = sumberTipe(elegance.get(tipe)!)
    const hilang = ['sectionDomId(', 'latarBagian(', 'gerakBagian(']
      .filter(panggilan => !sumber.includes(panggilan))
    expect(
      hilang,
      `panel Latar dan Gerak di editor tidak akan berefek pada bagian ini: ${hilang.join(', ')}`,
    ).toEqual([])
  })
})

describe('varian cerita', () => {
  const folder = '../components/invitation/sections/story'
  const berkas = readdirSync(dir(folder)).filter(nama => nama.endsWith('.vue')).map(nama => nama.replace('.vue', ''))
  const pintu = baca('../components/invitation/sections/Story.vue')

  it('tiap varian di kontrak punya berkasnya, dan tidak ada berkas yatim', () => {
    // Dua arah. Menambah varian ke kontrak tanpa komponennya akan jadi bagian yang kosong di
    // undangan pelanggan; berkas yang tidak pernah dipetakan adalah kode mati yang ikut dibundel.
    const dipetakan = [...pintu.matchAll(/'([a-z-]+)':\s*'(\w+)'/g)]
    const peta = new Map(dipetakan.map(c => [c[1]!, c[2]!]))
    expect([...peta.keys()].sort()).toEqual([...storyVariants].sort())
    expect([...peta.values()].sort()).toEqual(berkas.sort())
  })

  it('tiap varian mewarisi opsi motion renderer, bukan mengukur jendela', () => {
    // Tanpa ini varian baru akan memicu ScrollTrigger pada posisi yang salah di panggung editor,
    // dan tombol Statis tidak akan mematikannya — cacat lama yang fase 79 tutup.
    for (const nama of berkas) {
      const sumber = baca(`${folder}/${nama}.vue`)
      if (!sumber.includes('useArunaMotion(')) continue
      expect(sumber, `${nama}.vue memanggil useArunaMotion telanjang`).toContain('motionOptions')
    }
  })
})
