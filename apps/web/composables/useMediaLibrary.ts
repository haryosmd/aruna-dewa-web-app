/**
 * Satu modal "Pustaka Saya" untuk seluruh editor (fase 72.8).
 *
 * Kartu foto ada di belasan kolom (hero, mempelai, quote, penutup, latar tiap bagian, galeri),
 * dan tiap kolom yang memasang dialognya sendiri berarti belasan daftar aset yang diminta ke API
 * berulang-ulang. Halaman editor memasang **satu** `DashboardMediaLibrary` dan kolom mana pun
 * membukanya lewat `pilih()`, yang resolve dengan URL yang dipilih pasangan — atau `null` bila
 * ditutup.
 */
export interface MediaLibraryRequest {
  /** Pilih beberapa sekaligus (galeri). */
  multiple?: boolean
  /** Sisa kuota untuk `multiple`. */
  remaining?: number
  /** Judul konteks di header dialog, mis. "Foto komponen · Hero". */
  judul?: string
  kind?: 'image' | 'audio'
}

interface MediaLibraryState {
  open: boolean
  request: MediaLibraryRequest
}

export function useMediaLibrary() {
  const state = useState<MediaLibraryState>('aruna:media-library', () => ({ open: false, request: {} }))
  const pending = useState<((hasil: string[] | null) => void) | null>('aruna:media-library:resolve', () => null)

  function pilih(request: MediaLibraryRequest = {}): Promise<string[] | null> {
    pending.value?.(null)
    return new Promise((resolve) => {
      pending.value = resolve
      state.value = { open: true, request }
    })
  }

  function selesai(hasil: string[] | null) {
    const resolve = pending.value
    pending.value = null
    state.value = { ...state.value, open: false }
    resolve?.(hasil)
  }

  return { state, pilih, selesai }
}
