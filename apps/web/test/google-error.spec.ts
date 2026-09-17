import { describe, expect, it } from 'vitest'
import { googleFailureCodes } from '../../api/src/identity/google-failure.js'
import { googleErrorMessage } from '../utils/google-error'

describe('kalimat gagalnya login Google', () => {
  it('menerjemahkan setiap kode yang bisa dikirim API', () => {
    // Diimpor langsung dari daftar milik API, bukan disalin: kode baru yang ditambahkan di sana
    // tanpa kalimatnya di sini akan merah di tes ini, bukan menjadi kotak galat kosong di layar.
    for (const code of googleFailureCodes) {
      expect(googleErrorMessage(code), code).toBeTruthy()
    }
  })

  it('mengabaikan apa pun yang tidak ada di daftar', () => {
    // `?error=` datang lewat URL, dan URL bisa ditulis siapa saja.
    for (const hostile of ['', 'SESSION_REPLACED', '<img src=x onerror=alert(1)>', undefined, null, 42]) {
      expect(googleErrorMessage(hostile)).toBeNull()
    }
  })
})
