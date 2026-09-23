import type { MediaKind } from '@aruna/contracts'
import type {
  CreateInvitationBody,
  InvitationDetail,
  InvitationSummary,
  MediaUploadResult,
  PublishedInvitation,
  RestoreRevisionBody,
  RevisionSummary,
  SaveDraftBody,
  SavedDraft,
  ShareSettings,
} from '@aruna/contracts/api'

/**
 * Jalur undangan, satu tempat.
 *
 * `/invitations/:id` sebelumnya diambil di **lima** berkas — `dashboard/[id]/index`,
 * `guests`, `rsvps`, `orders`, dan `editor` — masing-masing dengan `request<Invitation>()`
 * sendiri dan tanpa kunci cache bersama, jadi berpindah tab dasbor selalu mengambil ulang
 * undangan yang sama. `useInvitation()` di bawah memberi kunci itu; halaman berhenti
 * mengenal string path sama sekali.
 */
export function useInvitations() {
  const { request } = useApi()

  const list = () => request<InvitationSummary[]>('/invitations')
  const get = (id: string) => request<InvitationDetail>(`/invitations/${id}`)
  const create = (body: CreateInvitationBody) => request<{ id: string }>('/invitations', { method: 'POST', body })
  const saveDraft = (id: string, body: SaveDraftBody) => request<SavedDraft>(`/invitations/${id}/draft`, { method: 'PUT', body })
  const publish = (id: string) => request<PublishedInvitation>(`/invitations/${id}/publish`, { method: 'POST' })
  /** Riwayat terbit (fase 75). Tanpa dokumennya — itu baru diambil saat satu revisi dipulihkan. */
  const listRevisions = (id: string) => request<RevisionSummary[]>(`/invitations/${id}/revisions`)
  /** Memulihkan ke DRAFT, bukan ke yang dilihat tamu; `draftRevision` menjaga konflik antar-tab. */
  const restoreRevision = (id: string, body: RestoreRevisionBody) => request<SavedDraft>(`/invitations/${id}/revisions/restore`, { method: 'POST', body })
  /** Aktivasi operator: melunasi tanpa Midtrans, dan tiap pemakaiannya tercatat di audit log. */
  const activate = (id: string) => request<{ activated: boolean }>(`/invitations/${id}/activate`, { method: 'POST' })
  const uploadMedia = (id: string, file: FormData, kind?: MediaKind) => request<MediaUploadResult>(`/invitations/${id}/media${kind ? `?jenis=${kind}` : ''}`, { method: 'POST', body: file })
  /** Daftar aset satu jenis (fase 69) — Studio Ornamen menampilkan unggahan sebelumnya. */
  const listMedia = (id: string, kind: MediaKind) => request<MediaUploadResult[]>(`/invitations/${id}/media?jenis=${kind}`)
  /** Menghapus berkasnya, bukan sekadar melepasnya dari dokumen — tanpa ini kuota foto bocor tiap kali pasangan berganti pikiran. */
  const deleteMedia = (id: string, assetId: string) => request<{ deleted: boolean }>(`/invitations/${id}/media/${assetId}`, { method: 'DELETE' })
  /*
   * Siklus hidup (fase 78). Tiga hal yang sering dikira satu:
   *
   *   `unpublish` — keluar dari daftar publik, **suntingannya tetap ada**. Sekali klik untuk kembali.
   *   `archive`   — keluar dari daftar pasangan juga; revisi terbit dan foto tak terpakai dibuang,
   *                 dan setelah 30 hari penyapu retensi memusnahkannya.
   *   `remove`    — musnah sekarang, permanen. Operator saja.
   */
  const unpublish = (id: string) => request<{ status: string }>(`/invitations/${id}/unpublish`, { method: 'POST' })
  const archive = (id: string) => request<{ status: string }>(`/invitations/${id}/archive`, { method: 'POST' })
  const restore = (id: string) => request<{ status: string }>(`/invitations/${id}/restore`, { method: 'POST' })
  const remove = (id: string) => request<{ deleted: boolean }>(`/invitations/${id}`, { method: 'DELETE' })
  /** Template WhatsApp halaman Generator (fase 72.6) — di luar dokumen, jadi tidak menyentuh revisi draft. */
  const updateShareSettings = (id: string, body: ShareSettings) => request<ShareSettings>(`/invitations/${id}/share-settings`, { method: 'PATCH', body })

  return { list, get, create, saveDraft, publish, activate, uploadMedia, listMedia, deleteMedia, updateShareSettings, listRevisions, restoreRevision, unpublish, archive, restore, remove }
}

/**
 * Satu undangan dengan kunci stabil, supaya empat tab dasbor berbagi satu pengambilan.
 * Namanya bukan `useInvitation` — itu sudah dipakai konteks render undangan publik.
 */
export function useInvitationDetail(id: MaybeRefOrGetter<string>) {
  const { get } = useInvitations()
  return useAsyncData(() => `invitation:${toValue(id)}`, () => get(toValue(id)), { watch: [() => toValue(id)] })
}
