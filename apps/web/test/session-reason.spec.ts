import { describe, expect, it } from 'vitest'

import { sessionEndedMessage, sessionEndedReason } from '../utils/session-reason'

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
