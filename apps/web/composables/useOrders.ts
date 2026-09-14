import type { CheckoutResult, CreateOrderBody, Order } from '@aruna/contracts/api'

/** Pesanan dan checkout. Operator melunasi tanpa Midtrans, jadi `checkout` bisa membalas `paid`. */
export function useOrders() {
  const { request } = useApi()

  const list = (invitationId: string) => request<Order[]>(`/invitations/${invitationId}/orders`)
  const create = (invitationId: string, body: CreateOrderBody) => request<{ id: string }>(`/invitations/${invitationId}/orders`, { method: 'POST', body })
  const checkout = (orderId: string) => request<CheckoutResult>(`/orders/${orderId}/checkout`, { method: 'POST' })

  return { list, create, checkout }
}
