import type {
  CreateGuestBody,
  Guest,
  GuestPage,
  ImportCommitResult,
  ImportPreviewResult,
  ImportPreviewBody,
  UpdateGuestBody,
} from '@aruna/contracts/api'

/** Daftar tamu, penyuntingan, dan ketiga jalur impor. */
export function useGuests() {
  const { request } = useApi()

  const list = (invitationId: string, query: { q?: string; page?: number } = {}) =>
    request<GuestPage>(`/invitations/${invitationId}/guests`, { query: { q: query.q || undefined, page: query.page } })

  const create = (invitationId: string, body: CreateGuestBody) =>
    request<Guest>(`/invitations/${invitationId}/guests`, { method: 'POST', body })

  const update = (invitationId: string, guestId: string, body: UpdateGuestBody) =>
    request<Guest>(`/invitations/${invitationId}/guests/${guestId}`, { method: 'PUT', body })

  const remove = (invitationId: string, guestId: string) =>
    request<void>(`/invitations/${invitationId}/guests/${guestId}`, { method: 'DELETE' })

  const previewText = (invitationId: string, body: ImportPreviewBody) =>
    request<ImportPreviewResult>(`/invitations/${invitationId}/imports/preview`, { method: 'POST', body })

  /** Unggahan berkas: `FormData`, jadi `content-type` sengaja dibiarkan diisi browser. */
  const previewFile = (invitationId: string, file: FormData) =>
    request<ImportPreviewResult>(`/invitations/${invitationId}/imports/file-preview`, { method: 'POST', body: file })

  const commitImport = (invitationId: string, jobId: string, idempotencyKey: string) =>
    request<ImportCommitResult>(`/invitations/${invitationId}/imports/${jobId}/commit`, { method: 'POST', body: { idempotencyKey } })

  return { list, create, update, remove, previewText, previewFile, commitImport }
}
