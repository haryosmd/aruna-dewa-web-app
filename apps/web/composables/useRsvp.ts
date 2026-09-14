import type { RsvpEntry, Wish } from '@aruna/contracts/api'

/** Daftar RSVP dan moderasi ucapan, dari sisi pemilik undangan. */
export function useRsvp() {
  const { request } = useApi()

  const listRsvps = (invitationId: string) => request<RsvpEntry[]>(`/invitations/${invitationId}/rsvps`)
  const listWishes = (invitationId: string) => request<Wish[]>(`/invitations/${invitationId}/wishes`)
  const moderateWish = (invitationId: string, wishId: string, approved: boolean) =>
    request<{ approved: boolean }>(`/invitations/${invitationId}/wishes/${wishId}`, { method: 'PATCH', body: { approved } })

  return { listRsvps, listWishes, moderateWish }
}
