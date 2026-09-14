import type { GuestLookup, PublicInvitation, PublicRsvpBody, PublicWishBody, Wish } from '@aruna/contracts/api'

/**
 * Jalur publik undangan: yang dibuka tamu, bukan pemiliknya.
 *
 * Satu `$fetch` mentah dulu lolos dari `useApi` di sini — dan itu bug, bukan ketidakrapian.
 * Ia melewati `apiBaseForPage()` (yang mencocokkan ejaan host loopback supaya cookie sesi
 * tidak hilang), melewati penerusan cookie saat render server, dan melewati jalur
 * 401 → refresh → ulang. Semuanya sekarang lewat satu pintu.
 */
export function usePublicInvitation() {
  const { request } = useApi()

  const invitation = (slug: string) => request<PublicInvitation>(`/public/${slug}`)

  /** Tamu tanpa token tetap dijawab `{ personal: false }`; tokennya query, bukan body. */
  const guest = (slug: string, token: string) => request<GuestLookup>(`/public/${slug}/guest`, { query: { g: token } })

  const wishes = (slug: string) => request<Wish[]>(`/public/${slug}/wishes`)
  const createWish = (slug: string, body: PublicWishBody) => request<Wish>(`/public/${slug}/wishes`, { method: 'POST', body })
  const rsvp = (slug: string, body: PublicRsvpBody) => request<{ attendance: string; count: number; message: string | null }>(`/public/${slug}/rsvp`, { method: 'POST', body })
  const markOpened = (slug: string, token: string) => request<{ opened: boolean }>(`/public/${slug}/opened`, { method: 'POST', body: { token } })

  return { invitation, guest, wishes, createWish, rsvp, markOpened }
}
