import type {
  CreateGuestBody,
  Guest,
  GuestListQuery,
  GuestPage,
  ImportCommitResult,
  ImportPreviewResult,
  ImportPreviewBody,
  GoogleSheetsPreviewBody,
  UpdateGuestBody,
} from '@aruna/contracts/api'

/** Daftar tamu, penyuntingan, penanda kirim WhatsApp, dan ketiga jalur impor. */
export function useGuests() {
  const { request } = useApi()

  const list = (invitationId: string, query: GuestListQuery = {}) =>
    request<GuestPage>(`/invitations/${invitationId}/guests`, { query: { q: query.q || undefined, page: query.page, pageSize: query.pageSize, status: query.status && query.status !== 'semua' ? query.status : undefined, category: query.category || undefined } })

  /** Fase 72.6: dipanggil tepat saat "Kirim WA" membuka tab wa.me; idempoten di API. */
  const markSent = (invitationId: string, guestId: string) =>
    request<Guest & { justMarked: boolean }>(`/invitations/${invitationId}/guests/${guestId}/sent`, { method: 'POST' })

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

  /**
   * Pratinjau dari Google Sheets (fase 75). Endpoint-nya sudah ada sejak fase awal; yang baru
   * cuma pemanggilnya. Token akses hanya dilewatkan, tidak pernah disimpan di kedua sisi.
   */
  const previewGoogleSheet = (invitationId: string, body: GoogleSheetsPreviewBody) =>
    request<ImportPreviewResult>(`/invitations/${invitationId}/imports/google-sheets-preview`, { method: 'POST', body })

  const commitImport = (invitationId: string, jobId: string, idempotencyKey: string) =>
    request<ImportCommitResult>(`/invitations/${invitationId}/imports/${jobId}/commit`, { method: 'POST', body: { idempotencyKey } })

  return { list, create, update, remove, markSent, previewText, previewFile, previewGoogleSheet, commitImport }
}
