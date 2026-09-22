import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { headlessSectionTypes, structureIds, structures } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

/*
 * Penjaga fase 74.4: `Renderer` tidak boleh bisa membuang sebuah bagian diam-diam.
 *
 * `rendered` menyaring `.filter(Boolean)` atas `peta[section.type]`. Sampai fase ini kedua
 * petanya bertipe `Record<string, Component>`, jadi satu tipe baru di `v2SectionTypes` lolos
 * compiler, lolos skema, lolos form yang digenerate, lolos simpan, lolos terbit — lalu TIDAK
 * MERENDER APA PUN untuk tamu. Tanpa gejala, tanpa peringatan, tanpa fallback.
 *
 * Tipe petanya kini `Record<Exclude<…>, Component>`, jadi compiler menuntut entri yang hilang.
 * Berkas ini menjaga arah sebaliknya — entri yatim, tipe yang dihapus dari peta, dan berkas
 * `elegance/*.vue` yang tidak pernah dipakai — plus memastikan pengecualiannya dibaca dari
 * KONTRAK, bukan diketik ulang di sini.
 *
 * Membaca teks sumber, bukan mengimpor: suite akar tidak punya plugin Vue maupun alias `~/`.
 * Pola yang sama dengan `invitation-breakpoints.spec.ts` dan `ornament-slots.spec.ts`.
 */
const renderer = readFileSync(new URL('../components/invitation/Renderer.vue', import.meta.url), 'utf8')
const tanpaKomentar = renderer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Kunci sebuah literal peta, dibaca dari `const <nama>: Record<…> = { … }` sampai `}` pertama di kolom 0. */
function kunciPeta(nama: string): string[] {
  const awal = tanpaKomentar.indexOf(`const ${nama}: Record<`)
  expect(awal, `literal peta ${nama} tidak ditemukan — regexnya yang basi, bukan kodenya`).toBeGreaterThan(-1)
  const buka = tanpaKomentar.indexOf('{', awal)
  const tutup = tanpaKomentar.indexOf('\n}', buka)
  const badan = tanpaKomentar.slice(buka + 1, tutup)
  return [...badan.matchAll(/^\s*'?([a-z-]+)'?\s*:/gm)].map(cocok => cocok[1]!)
}

/*
 * Sejak fase 74.10 keduanya dibaca dari REGISTRY, bukan dari daftar tipe langsung: `Renderer`
 * memilih keluarganya dari `structure.family`, jadi yang harus cocok adalah bagian milik
 * strukturnya — bukan "semua tipe v2" yang kebetulan hari ini sama.
 */
const peta: Record<string, string[]> = {
  elegance: kunciPeta('eleganceComponents'),
  warisan: kunciPeta('legacyComponents'),
}
const seharusnya = Object.fromEntries(structureIds.map(id => {
  const struktur = structures[id]
  return [struktur.family, struktur.sectionTypes.filter(type => !struktur.headless.has(type))]
})) as Record<string, readonly string[]>

describe('kelengkapan peta komponen renderer', () => {
  it('parsernya benar-benar menemukan sesuatu — kalau tidak, seluruh berkas ini hijau palsu', () => {
    expect(peta.elegance!.length).toBeGreaterThanOrEqual(11)
    expect(peta.warisan!.length).toBeGreaterThanOrEqual(11)
  })

  it('tiap keluarga yang dipakai registry punya petanya di Renderer', () => {
    const keluarga = [...new Set(structureIds.map(id => structures[id].family))].sort()
    expect(Object.keys(peta).sort()).toEqual(keluarga)
  })

  it.each(['elegance', 'warisan'] as const)('%s: tiap tipe non-headless punya komponennya', keluarga => {
    const hilang = seharusnya[keluarga]!.filter(type => !peta[keluarga]!.includes(type))
    expect(hilang, `tipe tanpa komponen akan dibuang diam-diam oleh Renderer: ${hilang.join(', ')}`).toEqual([])
  })

  it.each(['elegance', 'warisan'] as const)('%s: tidak ada entri yatim di peta', keluarga => {
    const yatim = peta[keluarga]!.filter(type => !seharusnya[keluarga]!.includes(type))
    expect(yatim, `entri yang tipenya sudah tidak ada: ${yatim.join(', ')}`).toEqual([])
  })

  it('Renderer memilih keluarganya dari struktur, bukan dari schemaVersion', () => {
    // Kalau baris ini kembali ke `schemaVersion`, template struktural kedua akan merender
    // dengan komponen yang salah tanpa satu pun tes lain berbunyi.
    expect(tanpaKomentar).toContain('componentFamilies[structure.value.family]')
    expect(tanpaKomentar).toContain('structureById(documentStructureId(props.document))')
  })

  it('pengecualiannya dibaca dari kontrak, dan isinya memang dua itu', () => {
    // Kalau daftar ini pindah/berubah, yang berbunyi adalah baris ini — bukan sebuah bagian
    // yang menghilang dari undangan pelanggan.
    expect([...headlessSectionTypes].sort()).toEqual(['music', 'opening-envelope'])
    for (const type of headlessSectionTypes) {
      expect(peta.elegance, `${type} headless tapi ada di peta elegance`).not.toContain(type)
      expect(peta.warisan, `${type} headless tapi ada di peta warisan`).not.toContain(type)
    }
  })

  it('tiap berkas elegance/*.vue benar-benar dipakai', () => {
    const dir = fileURLToPath(new URL('../components/invitation/elegance/', import.meta.url))
    const berkas = readdirSync(dir).filter(nama => nama.endsWith('.vue')).map(nama => nama.replace('.vue', ''))
    expect(berkas.length).toBeGreaterThanOrEqual(12)
    /*
     * Dua bentuk pemakaian, dan keduanya sah:
     *   - impor relatif `./elegance/Hero.vue` — sebelas komponen di dalam peta, sengaja
     *     diimpor eksplisit supaya tidak ikut bundel tamu lewat auto-import;
     *   - nama auto-import `<InvitationEleganceOpeningEnvelope>` — gerbang amplop, yang
     *     dirender di luar peta karena ia berdiri di depan halaman, bukan di dalam daftar.
     * Yang dijaga: tidak ada berkas di folder itu yang tidak dipakai sama sekali.
     */
    const dipakai = berkas.filter(nama =>
      tanpaKomentar.includes(`./elegance/${nama}.vue`) || tanpaKomentar.includes(`InvitationElegance${nama}`))
    expect(dipakai.sort()).toEqual(berkas.sort())
  })
})
