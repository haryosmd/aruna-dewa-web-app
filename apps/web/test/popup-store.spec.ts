import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePopupStore } from '../stores/popup'

const tanya = { title: 'Tinggalkan halaman?', actions: [{ id: 'pergi', label: 'Tinggalkan' }, { id: 'kembali', label: 'Kembali' }], dismissId: 'kembali' }

describe('antrean popup', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('menampilkan popup yang diminta dan menjawab dengan id tombolnya', async () => {
    const popup = usePopupStore()
    const jawaban = popup.ask(tanya)

    expect(popup.current?.request.title).toBe('Tinggalkan halaman?')
    popup.answer(popup.current!.key, 'pergi')

    await expect(jawaban).resolves.toBe('pergi')
    expect(popup.current).toBeNull()
  })

  it('memakai dismissId saat ditutup lewat Escape, overlay, atau tombol silang', async () => {
    const popup = usePopupStore()
    const jawaban = popup.ask(tanya)
    popup.dismiss(popup.current!.key)
    await expect(jawaban).resolves.toBe('kembali')
  })

  it('jatuh ke "dismiss" kalau pemanggil tidak menentukan dismissId', async () => {
    const popup = usePopupStore()
    const jawaban = popup.ask({ title: 'Halo', actions: [{ id: 'ok', label: 'Oke' }] })
    popup.dismiss(popup.current!.key)
    await expect(jawaban).resolves.toBe('dismiss')
  })

  /*
   * Ini alasan `key` ada. Escape ditangani dua kali — oleh `DialogContent` reka-ui dan oleh
   * `onKeyStroke` di `AtomicPopup` — dan tanpa penjaga identitas, satu penekanan akan
   * membuang popup berikutnya di antrean sekalian, tanpa pernah menampilkannya.
   */
  it('mengabaikan jawaban kedua untuk key yang sama', async () => {
    const popup = usePopupStore()
    const pertama = popup.ask(tanya)
    const kedua = popup.ask({ title: 'Reset draft?', actions: [{ id: 'reset', label: 'Reset' }] })

    const key = popup.current!.key
    popup.dismiss(key)
    popup.dismiss(key)

    await expect(pertama).resolves.toBe('kembali')
    expect(popup.current?.request.title).toBe('Reset draft?')

    popup.answer(popup.current!.key, 'reset')
    await expect(kedua).resolves.toBe('reset')
  })

  it('menahan permintaan kedua di antrean, bukan menimpa yang sedang tampil', async () => {
    const popup = usePopupStore()
    const pertama = popup.ask(tanya)
    popup.ask({ title: 'Kedua', actions: [{ id: 'ok', label: 'Oke' }] })

    expect(popup.current?.request.title).toBe('Tinggalkan halaman?')
    expect(popup.entries).toHaveLength(2)

    popup.answer(popup.current!.key, 'pergi')
    await expect(pertama).resolves.toBe('pergi')
    expect(popup.current?.request.title).toBe('Kedua')
  })

  it('tidak terbuka saat antreannya kosong', () => {
    const popup = usePopupStore()
    expect(popup.open).toBe(false)
    popup.ask(tanya)
    expect(popup.open).toBe(true)
  })
})
