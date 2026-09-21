import type { MediaKind } from '@aruna/contracts'
import type {
  CreateInvitationBody,
  InvitationDetail,
  InvitationSummary,
  MediaUploadResult,
  PublishedInvitation,
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
  /** Aktivasi operator: melunasi tanpa Midtrans, dan tiap pemakaiannya tercatat di audit log. */
  const activate = (id: string) => request<{ activated: boolean }>(`/invitations/${id}/activate`, { method: 'POST' })
  const uploadMedia = (id: string, file: FormData, kind?: MediaKind) => request<MediaUploadResult>(`/invitations/${id}/media${kind ? `?jenis=${kind}` : ''}`, { method: 'POST', body: file })
  /** Daftar aset satu jenis (fase 69) — Studio Ornamen menampilkan unggahan sebelumnya. */
  const listMedia = (id: string, kind: MediaKind) => request<MediaUploadResult[]>(`/invitations/${id}/media?jenis=${kind}`)
  /** Menghapus berkasnya, bukan sekadar melepasnya dari dokumen — tanpa ini kuota foto bocor tiap kali pasangan berganti pikiran. */
  const deleteMedia = (id: string, assetId: string) => request<{ deleted: boolean }>(`/invitations/${id}/media/${assetId}`, { method: 'DELETE' })
  /** Template WhatsApp halaman Generator (fase 72.6) — di luar dokumen, jadi tidak menyentuh revisi draft. */
  const updateShareSettings = (id: string, body: ShareSettings) => request<ShareSettings>(`/invitations/${id}/share-settings`, { method: 'PATCH', body })

  return { list, get, create, saveDraft, publish, activate, uploadMedia, listMedia, deleteMedia, updateShareSettings }
}

/**
 * Satu undangan dengan kunci stabil, supaya empat tab dasbor berbagi satu pengambilan.
 * Namanya bukan `useInvitation` — itu sudah dipakai konteks render undangan publik.
 */
export function useInvitationDetail(id: MaybeRefOrGetter<string>) {
  const { get } = useInvitations()
  return useAsyncData(() => `invitation:${toValue(id)}`, () => get(toValue(id)), { watch: [() => toValue(id)] })
}
