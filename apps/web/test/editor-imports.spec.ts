import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Batas bundel: tabel metrik dan mesin lencana milik dasbor, bukan milik tamu.
 *
 * `ornament-metrics.ts` ~24 KB dan hanya berguna untuk menjawab "seberapa cocok keping ini dengan
 * tema" — pertanyaan yang hanya ada di Studio Ornamen. Tamu tidak pernah memilih apa pun; ia
 * hanya melihat hasilnya. Satu `import` tak sengaja di jalur render sudah cukup untuk
 * mengirimkannya ke tiap ponsel yang membuka undangan, dan tidak ada satu pun galat yang muncul
 * karena akibatnya hanya berat.
 *
 * Gerbang teks-sumber, meniru `motion-rules.spec.ts`: ia memeriksa apa yang ditulis, bukan apa
 * yang dijalankan, karena inilah satu-satunya cara memeriksanya tanpa membangun bundel.
 */

const web = fileURLToPath(new URL('..', import.meta.url))

/** Berkas yang benar-benar ikut ke halaman tamu `/i/[slug]`. */
const jalurTamu = ['components/invitation', 'components/ornament', 'pages/i', 'composables', 'utils/theme.ts', 'utils/ornament-palette.ts', 'utils/motion-play.ts', 'utils/motion-score.ts']

const terlarang = ['ornament-metrics', 'ornament-fit', 'ornament-search']

function berkas(target: string): string[] {
  const penuh = join(web, target)
  if (statSync(penuh).isFile()) return [penuh]
  return readdirSync(penuh, { recursive: true, encoding: 'utf8' })
    .map(nama => join(penuh, nama))
    .filter(p => /\.(ts|vue)$/.test(p) && statSync(p).isFile())
}

const semua = jalurTamu.flatMap(berkas)

describe('jalur render tamu tetap ringan', () => {
  it('menemukan berkasnya, bukan daftar kosong', () => {
    // Glob yang rusak akan membuat tes di bawah hijau tanpa memeriksa apa pun.
    expect(semua.length).toBeGreaterThan(30)
  })

  it.each(terlarang)('tidak ada yang mengimpor `%s`', (modul) => {
    const pelanggar = semua.filter(p => new RegExp(`from ['"][^'"]*${modul}['"]`).test(readFileSync(p, 'utf8')))
    expect(pelanggar.map(p => p.slice(web.length)), `${modul} bocor ke bundel tamu`).toEqual([])
  })

  it('membiarkan kosakata slot lewat, karena renderer memang memakainya', () => {
    // `ornament-slots.ts` BOLEH: `Renderer.vue` memanggil `terapkanOverrides()` untuk
    // menggabungkan penukaran, dan berkas itu sendiri tidak mengimpor tabel metrik.
    const slots = readFileSync(join(web, 'utils/ornament-slots.ts'), 'utf8')
    for (const modul of terlarang) expect(slots, modul).not.toContain(modul)
  })
})
