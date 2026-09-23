import type { BackofficeInvitationPage } from '@aruna/contracts/api'

/**
 * Jalur backoffice, satu tempat (fase 78).
 *
 * Mengikuti aturan fase 14: `useApi().request` hanya dipanggil dari dalam composable, dan
 * halaman tidak pernah mengeja satu pun string path. Yang ada di sini cuma **pembacaan** —
 * seluruh aksinya (jadikan draf, arsip, pulihkan, hapus) memakai endpoint undangan yang sama
 * dengan dasbor pasangan, lewat `useInvitations()`, supaya tidak ada jalur tulis kedua yang
 * bisa melenceng dari yang pertama.
 */
export function useBackoffice() {
  const { request } = useApi()

  const invitations = (params: { q?: string; status?: string; page?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.q?.trim()) query.set('q', params.q.trim())
    if (params.status && params.status !== 'semua') query.set('status', params.status)
    if (params.page && params.page > 1) query.set('page', String(params.page))
    const suffix = query.toString()
    return request<BackofficeInvitationPage>(`/bo/invitations${suffix ? `?${suffix}` : ''}`)
  }

  return { invitations }
}
