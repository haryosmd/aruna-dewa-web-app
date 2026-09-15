/**
 * Aturan kapan musik latar berbunyi, dipisah dari elemen yang membunyikannya.
 *
 * Pemutarnya punya lima pemicu yang saling menimpa: gerbang, tombol disk, tamu yang pergi
 * menonton siaran, tab yang tersembunyi, dan tab yang kembali terlihat. Ditulis sebagai `if`
 * yang berserak di dalam komponen, tidak satu pun bisa diuji tanpa browser — padahal justru
 * yang paling halus di antaranya yang paling perlu dijaga.
 *
 * Berkas ini murni: tidak menyentuh DOM, `sessionStorage`, maupun `window`. `MusicPlayer.vue`
 * yang menerjemahkan hasilnya jadi `play()`/`pause()` dan yang menuliskan `refused` ke
 * penyimpanan sesi.
 */
export type MusicEvent = 'gate' | 'toggle' | 'leave' | 'hide' | 'show'

export interface MusicState {
  playing: boolean
  /**
   * Tamu menekan jeda **sendiri**. Hanya `toggle` yang boleh mengubah ini — jeda yang kita
   * lakukan atas nama tamu (tab tersembunyi, siaran dibuka) bukan jawaban tamu atas apa pun.
   */
  refused: boolean
  /** Dijeda karena tabnya tersembunyi, bukan karena diminta. Satu-satunya alasan sah untuk lanjut sendiri. */
  pausedByHide: boolean
}

export const silentMusic = (refused = false): MusicState => ({ playing: false, refused, pausedByHide: false })

export function nextMusicState(state: MusicState, event: MusicEvent): MusicState {
  switch (event) {
    /** Gerbang memberi izin autoplay, tapi tidak memberi izin mengabaikan tamu yang sudah menolak. */
    case 'gate':
      return state.refused || state.playing ? state : { ...state, playing: true, pausedByHide: false }

    case 'toggle':
      return state.playing
        ? { playing: false, refused: true, pausedByHide: false }
        : { playing: true, refused: false, pausedByHide: false }

    /*
     * Tamu menekan "Buka siaran". Musik berhenti, dan sengaja **tidak** ditandai untuk
     * dilanjutkan: ia kembali ke tab undangan bukan untuk meminta musiknya balik — siaran
     * akadnya masih berjalan di tab sebelah. Musik baru hidup lagi kalau tombolnya ditekan.
     */
    case 'leave':
      return state.playing ? { ...state, playing: false, pausedByHide: false } : state

    case 'hide':
      return state.playing ? { ...state, playing: false, pausedByHide: true } : state

    /*
     * `refused` diperiksa di sini, dan inilah satu baris yang membedakan kita dari referensi:
     * pemutar yang melanjutkan musik begitu tab kembali terlihat, tanpa memeriksa apa pun,
     * membatalkan sendiri jeda yang ditekan tamu di ruang rapat.
     */
    case 'show':
      return state.pausedByHide && !state.refused
        ? { ...state, playing: true, pausedByHide: false }
        : { ...state, pausedByHide: false }
  }
}
