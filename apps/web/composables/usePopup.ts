import type { PopupRequest } from '~/stores/popup'

/**
 * Satu-satunya permukaan yang dipakai halaman.
 *
 * Store-nya tetap di belakang layar supaya pemanggil tidak pernah perlu tahu ada antrean,
 * ada `key`, atau ada komponen yang merendernya. Yang perlu diketahui halaman cuma satu:
 * `await`-nya menghasilkan `id` aksi yang dipilih.
 *
 * ```ts
 * const { confirm } = usePopup()
 * const jawaban = await confirm({
 *   title: 'Tinggalkan halaman?',
 *   actions: [{ id: 'simpan', label: 'Simpan perubahan' }, { id: 'pergi', label: 'Tinggalkan', tone: 'outline' }],
 *   dismissId: 'batal',
 * })
 * ```
 */
export function usePopup() {
  const store = usePopupStore()

  /** Bertanya. Resolve dengan `id` aksi yang ditekan, atau `dismissId` saat Escape/overlay/tutup. */
  const confirm = (request: PopupRequest): Promise<string> => store.ask(request)

  /** Memberi tahu, bukan bertanya: satu tombol, dan Escape berarti hal yang sama. */
  const alert = (request: Omit<PopupRequest, 'actions' | 'dismissId'>, label = 'Mengerti'): Promise<string> =>
    store.ask({ ...request, actions: [{ id: 'ok', label }], dismissId: 'ok' })

  return { confirm, alert }
}
