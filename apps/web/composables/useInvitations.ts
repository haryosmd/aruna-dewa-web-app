import type {
  CreateInvitationBody,
  InvitationDetail,
  InvitationSummary,
  MediaUploadResult,
  PublishedInvitation,
  SaveDraftBody,
  SavedDraft,
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
  const uploadMedia = (id: string, file: FormData) => request<MediaUploadResult>(`/invitations/${id}/media`, { method: 'POST', body: file })

  return { list, get, create, saveDraft, publish, activate, uploadMedia }
}

/**
 * Satu undangan dengan kunci stabil, supaya empat tab dasbor berbagi satu pengambilan.
 * Namanya bukan `useInvitation` — itu sudah dipakai konteks render undangan publik.
 */
export function useInvitationDetail(id: MaybeRefOrGetter<string>) {
  const { get } = useInvitations()
  return useAsyncData(() => `invitation:${toValue(id)}`, () => get(toValue(id)), { watch: [() => toValue(id)] })
}
