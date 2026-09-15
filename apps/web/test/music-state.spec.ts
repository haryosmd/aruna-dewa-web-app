import { describe, expect, it } from 'vitest'
import { nextMusicState, silentMusic, type MusicEvent, type MusicState } from '../utils/music-state'

/** Rantai pemicu dibaca sebagai cerita satu tamu, bukan sebagai pemanggilan berlapis. */
function after(...events: MusicEvent[]): MusicState {
  return events.reduce(nextMusicState, silentMusic())
}

describe('aturan musik latar', () => {
  it('memutar musik saat gerbang dibuka', () => {
    expect(after('gate').playing).toBe(true)
  })

  it('tidak memaksa musik pada tamu yang sudah menolak', () => {
    // Penolakan bertahan selama sesi; memuat ulang halaman mengembalikan `refused` dari sessionStorage.
    expect(nextMusicState(silentMusic(true), 'gate').playing).toBe(false)
  })

  it('menandai penolakan saat tombol jeda ditekan, dan mencabutnya saat diputar lagi', () => {
    expect(after('gate', 'toggle')).toMatchObject({ playing: false, refused: true })
    expect(after('gate', 'toggle', 'toggle')).toMatchObject({ playing: true, refused: false })
  })

  it('menjeda saat tab tersembunyi dan melanjutkan saat kembali terlihat', () => {
    expect(after('gate', 'hide')).toMatchObject({ playing: false, pausedByHide: true })
    expect(after('gate', 'hide', 'show').playing).toBe(true)
  })

  /*
   * Bug yang sudah ada di referensi, ditulis sebagai tes supaya tidak pernah jadi bug kita:
   * pemutar mereka melanjutkan musik begitu tab terlihat lagi tanpa memeriksa apa pun, jadi
   * jeda yang ditekan tamu di ruang rapat batal sendiri setelah ia pindah tab dan kembali.
   */
  it('tidak menghidupkan musik lagi untuk tamu yang menjeda sendiri lalu pindah tab', () => {
    expect(after('gate', 'toggle', 'hide', 'show').playing).toBe(false)
  })

  it('menjeda musik saat tamu membuka siaran, dan tidak menyalakannya lagi saat ia kembali', () => {
    expect(after('gate', 'leave').playing).toBe(false)
    // Siarannya masih berjalan di tab sebelah; kembali ke undangan bukan permintaan musik.
    expect(after('gate', 'leave', 'hide', 'show').playing).toBe(false)
  })

  it('membiarkan tamu menyalakan musiknya lagi setelah siaran ditutup', () => {
    expect(after('gate', 'leave', 'toggle')).toMatchObject({ playing: true, refused: false })
  })

  it('tidak berubah saat tab tersembunyi selagi musik memang sudah diam', () => {
    expect(after('hide', 'show').playing).toBe(false)
  })
})
