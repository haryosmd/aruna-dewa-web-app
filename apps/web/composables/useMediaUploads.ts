import type { MediaKind } from '@aruna/contracts'

/**
 * Antrean unggah media untuk editor.
 *
 * Tiga hal yang membuatnya layak jadi composable, bukan disalin ke tiap panel:
 *
 * 1. **Berurutan, bukan serentak.** Sepuluh foto yang naik bersamaan di jaringan seluler saling
 *    memperebutkan pita dan semuanya selesai belakangan. Satu per satu, tiap foto muncul di
 *    daftar begitu selesai — pasangan melihat kemajuan, bukan spinner yang menggantung.
 * 2. **Kegagalan satu berkas tidak menjatuhkan sisanya.** Yang gagal dilaporkan per baris.
 * 3. **Normalisasi foto** (perkecil + WebP) selalu terjadi sebelum berkasnya naik.
 */
export function useMediaUploads(invitationId: MaybeRefOrGetter<string>) {
  const { uploadMedia, deleteMedia } = useInvitations()

  const pending = ref(false)
  const failures = ref<string[]>([])
  const done = ref(0)
  const total = ref(0)

  async function upload(files: File[], kind: MediaKind = 'image'): Promise<string[]> {
    if (!files.length) return []
    pending.value = true
    failures.value = []
    done.value = 0
    total.value = files.length

    const urls: string[] = []
    for (const file of files) {
      try {
        const prepared = kind === 'image' ? await normalizePhoto(file) : file
        const body = new FormData()
        body.append('file', prepared, prepared.name)
        const result = await uploadMedia(toValue(invitationId), body)
        urls.push(result.publicUrl)
      } catch (cause) {
        failures.value.push(`${file.name} — ${apiErrorMessage(cause)}`)
      } finally {
        done.value += 1
      }
    }

    pending.value = false
    return urls
  }

  /**
   * Melepas aset yang sudah tidak dipakai. Best-effort dengan sengaja: berkas yatim di storage
   * jauh lebih murah daripada penyuntingan yang terhenti karena penghapusan gagal, dan server
   * tetap menolak menghapus aset yang masih dipakai versi terbit.
   */
  async function release(url: string): Promise<void> {
    const assetId = mediaAssetIdFromUrl(url)
    if (!assetId) return
    try { await deleteMedia(toValue(invitationId), assetId) }
    catch { /* Dokumen sudah tidak menunjuknya; sisanya urusan retensi. */ }
  }

  return { pending, failures, done, total, upload, release }
}
