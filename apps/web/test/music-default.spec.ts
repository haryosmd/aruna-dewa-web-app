import { defaultMusic } from '@aruna/contracts'
import { describe, expect, it } from 'vitest'

import { musicLibrary } from '../utils/music-library'

/*
 * Lagu bawaan undangan baru ditulis dua kali, dan itu disengaja: `packages/contracts` tidak boleh
 * bergantung pada `apps/web`, jadi `defaultMusic` di kontrak tidak bisa membaca pustaka ini.
 *
 * Yang tidak boleh terjadi adalah duplikasi yang diam-diam menyimpang. Merapikan pustaka —
 * mengganti berkas, membetulkan ejaan judul, mengganti trek unggulan — tidak memberi satu pun
 * isyarat bahwa ada nilai kembar di paket lain, dan akibatnya baru terlihat sebagai undangan baru
 * yang pemutarnya menunjuk berkas 404.
 */
describe('lagu bawaan undangan baru (fase 77)', () => {
  const trek = musicLibrary.find(t => t.url === defaultMusic.url)

  it('menunjuk trek yang benar-benar ada di pustaka', () => {
    expect(trek, `defaultMusic.url "${defaultMusic.url}" tidak ada di musicLibrary`).toBeDefined()
  })

  it('judulnya sama persis dengan pustaka', () => {
    expect(defaultMusic.title).toBe(trek?.title)
  })

  it('memakai trek yang memang ditandai unggulan untuk pernikahan', () => {
    // Bawaan yang bukan unggulan berarti tiap undangan baru berangkat dengan pilihan kelas dua.
    expect(trek?.unggulan).toBe(true)
    expect(trek?.kategori).toBe('Pernikahan')
  })
})
