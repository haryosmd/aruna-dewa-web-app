import { describe, expect, it } from 'vitest'
import { nextMusicState, silentMusic, type MusicEvent, type MusicState } from '../utils/music-state'

/** Rantai pemicu dibaca sebagai cerita satu tamu, bukan sebagai pemanggilan berlapis. */
function after(...events: MusicEvent[]): MusicState {
  return events.reduce(nextMusicState, silentMusic())
}

describe('aturan musik latar', () => {
  /*
   * Fase 78. Tes ini dulu berbunyi "memutar musik saat gerbang dibuka" dan menjaga persis
   * kebalikannya. Pemicu `gate` dicabut seluruhnya: membuka amplop bukan permintaan musik,
   * dan satu-satunya yang boleh menyalakannya sekarang adalah tombolnya.
   */
  it('tidak berbunyi sampai ada yang menekan tombolnya', () => {
    expect(silentMusic().playing).toBe(false)
    expect(after('hide', 'show').playing).toBe(false)
    expect(after('leave').playing).toBe(false)
  })

  it('menyala saat tombol ditekan, dan mencabut penolakan sebelumnya', () => {
    expect(after('toggle')).toMatchObject({ playing: true, refused: false })
  })

  it('menandai penolakan saat tombol jeda ditekan, dan mencabutnya saat diputar lagi', () => {
    expect(after('toggle', 'toggle')).toMatchObject({ playing: false, refused: true })
    expect(after('toggle', 'toggle', 'toggle')).toMatchObject({ playing: true, refused: false })
  })

  it('menghormati penolakan yang dibawa dari sesi sebelumnya', () => {
    // Penolakan bertahan selama sesi; memuat ulang halaman mengembalikan `refused` dari sessionStorage.
    expect(nextMusicState(silentMusic(true), 'hide').playing).toBe(false)
    expect(nextMusicState(silentMusic(true), 'show').playing).toBe(false)
  })

  it('menjeda saat tab tersembunyi dan melanjutkan saat kembali terlihat', () => {
    expect(after('toggle', 'hide')).toMatchObject({ playing: false, pausedByHide: true })
    expect(after('toggle', 'hide', 'show').playing).toBe(true)
  })

  /*
   * Bug yang sudah ada di referensi, ditulis sebagai tes supaya tidak pernah jadi bug kita:
   * pemutar mereka melanjutkan musik begitu tab terlihat lagi tanpa memeriksa apa pun, jadi
   * jeda yang ditekan tamu di ruang rapat batal sendiri setelah ia pindah tab dan kembali.
   */
  it('tidak menghidupkan musik lagi untuk tamu yang menjeda sendiri lalu pindah tab', () => {
    expect(after('toggle', 'toggle', 'hide', 'show').playing).toBe(false)
  })

  it('menjeda musik saat tamu membuka siaran, dan tidak menyalakannya lagi saat ia kembali', () => {
    expect(after('toggle', 'leave').playing).toBe(false)
    // Siarannya masih berjalan di tab sebelah; kembali ke undangan bukan permintaan musik.
    expect(after('toggle', 'leave', 'hide', 'show').playing).toBe(false)
  })

  it('membiarkan tamu menyalakan musiknya lagi setelah siaran ditutup', () => {
    expect(after('toggle', 'leave', 'toggle')).toMatchObject({ playing: true, refused: false })
  })

  it('tidak berubah saat tab tersembunyi selagi musik memang sudah diam', () => {
    expect(after('hide', 'show').playing).toBe(false)
  })
})
