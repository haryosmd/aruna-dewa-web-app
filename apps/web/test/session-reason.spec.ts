import { describe, expect, it } from 'vitest'

import { sessionEndLabel, sessionEndedMessage, sessionEndedReason, sessionNotStoredMessage } from '../utils/session-reason'

describe('alasan berakhirnya sesi', () => {
  it('membedakan tertendang perangkat lain dari sekadar kedaluwarsa', () => {
    expect(sessionEndedMessage('SESSION_REPLACED')).toContain('perangkat lain')
    expect(sessionEndedMessage('SESSION_EXPIRED')).not.toContain('perangkat lain')
  })

  it('menolak kode yang tidak dikenal alih-alih menampilkannya apa adanya', () => {
    // Nilainya datang dari query string, jadi ia masukan pengunjung — bukan kabar dari API.
    for (const hostile of ['<script>', 'SESSION_', '', null, undefined, 42, {}]) {
      expect(sessionEndedReason(hostile)).toBeNull()
      expect(sessionEndedMessage(hostile)).toBeNull()
    }
  })

  it('memulangkan kode yang dikenal apa adanya supaya aman ditulis ke URL', () => {
    for (const code of ['SESSION_REPLACED', 'SESSION_REUSE', 'SESSION_EXPIRED', 'SESSION_INVALID']) {
      expect(sessionEndedReason(code)).toBe(code)
      expect(sessionEndedMessage(code)).toBeTruthy()
    }
  })
})

describe('label sebab berakhirnya sesi lama', () => {
  it('menamai kelima sebab yang bisa ditulis basis data', () => {
    expect(sessionEndLabel('LOGOUT')).toBe('Keluar sendiri')
    expect(sessionEndLabel('REPLACED')).toContain('perangkat lain')
    expect(sessionEndLabel('REUSE_DETECTED')).toContain('keamanan')
    expect(sessionEndLabel('PASSWORD_RESET')).toContain('Kata sandi')
    expect(sessionEndLabel('ACCOUNT_RECLAIMED')).toContain('didaftarkan ulang')
  })

  /**
   * Enum di basis data boleh bertambah tanpa web ikut dirilis. Yang tidak boleh terjadi adalah
   * baris riwayat yang kosong atau bertuliskan `REVOKED_BY_ADMIN` kepada pasangan pengantin.
   */
  it('tetap memberi kalimat untuk sebab yang belum dikenalnya', () => {
    for (const unknown of ['SESUATU_YANG_BARU', '', null, undefined, 7, {}]) {
      expect(sessionEndLabel(unknown)).toBe('Berakhir')
    }
  })
})

describe('login berhasil tapi sesinya tidak terbaca', () => {
  it('menyebut cookie hanya saat browsernya memang memblokir cookie', () => {
    expect(sessionNotStoredMessage(null, false)).toContain('memblokir cookie')
    expect(sessionNotStoredMessage(null, true)).not.toContain('cookie')
    expect(sessionNotStoredMessage('SESSION_REPLACED', true)).not.toContain('cookie')
  })

  it('menunjuk sesi lama saat penyegaran menjawab dengan kode akhir sesi', () => {
    // Inilah bentuk kegagalan yang dilaporkan dari produksi: browser memegang cookie sesi
    // warisan, API menolaknya, dan halaman ini dulu menuduh cookie diblokir. Muat ulang sekali
    // sudah cukup sekarang — middleware di API mengusir cookie itu pada permintaan pertama.
    for (const code of ['SESSION_REPLACED', 'SESSION_REUSE', 'SESSION_EXPIRED', 'SESSION_INVALID']) {
      expect(sessionNotStoredMessage(code, true)).toContain('Muat ulang')
    }
  })

  it('tidak menuduh apa pun saat sebabnya memang tidak diketahui', () => {
    // `/auth/me` yang gagal dihubungi berakhir di cabang yang sama, tanpa kode apa pun.
    const kalimat = sessionNotStoredMessage(undefined, true)
    expect(kalimat).toContain('Coba lagi')
    expect(kalimat).not.toContain('Muat ulang')
  })

  it('mendahulukan cookie yang diblokir daripada kode sesi', () => {
    expect(sessionNotStoredMessage('SESSION_REPLACED', false)).toContain('memblokir cookie')
  })
})
