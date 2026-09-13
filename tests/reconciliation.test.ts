import { describe, expect, it, vi } from 'vitest'
import { reconcileOrder } from '../apps/worker/src/reconcile'

describe('payment reconciliation', () => {
  it('relays only a signed matching provider response to API', async () => {
    const status = { order_id: 'order-1', signature_key: 'signed', transaction_status: 'settlement', gross_amount: '149000.00', status_code: '200' }
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(status))).mockResolvedValueOnce(new Response('{}'))
    await reconcileOrder('order-1', { serverKey: 'local-test', apiOrigin: 'http://127.0.0.1:3001', production: false }, request)
    expect(request.mock.calls[0]?.[0]).toBe('https://api.sandbox.midtrans.com/v2/order-1/status')
    expect(request.mock.calls[1]?.[0]).toBe('http://127.0.0.1:3001/v1/payments/midtrans/webhook')
    expect(JSON.parse(request.mock.calls[1]?.[1].body)).toEqual(status)
  })
  it('does not relay mismatched or unsigned provider data', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ order_id: 'different' })))
    await expect(reconcileOrder('order-1', { serverKey: 'local-test', apiOrigin: 'http://127.0.0.1:3001', production: false }, request)).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(1)
  })
})
