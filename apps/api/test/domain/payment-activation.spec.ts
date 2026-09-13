import { describe, expect, it } from 'vitest';

import { applyVerifiedPaymentEvent } from '../../src/payments/payment-activation.js';

describe('verified payment activation', () => {
  it('activates an order once when Midtrans retries the same settled event', () => {
    const state = {
      order: { id: 'order-1', total: 149000, status: 'PENDING' as 'PENDING' | 'PAID', activatedAt: null as Date | null },
      processedEventIds: new Set<string>(),
      entitlements: [] as string[],
    };

    const event = { id: 'evt-1', orderId: 'order-1', grossAmount: 149000, transactionStatus: 'settlement' as const };
    applyVerifiedPaymentEvent(state, event);
    applyVerifiedPaymentEvent(state, event);

    expect(state.order.status).toBe('PAID');
    expect(state.entitlements).toEqual(['order-1']);
  });

  it('does not activate a settled event when its amount differs from the order snapshot', () => {
    const state = {
      order: { id: 'order-1', total: 149000, status: 'PENDING' as 'PENDING' | 'PAID', activatedAt: null as Date | null },
      processedEventIds: new Set<string>(),
      entitlements: [] as string[],
    };

    expect(() => applyVerifiedPaymentEvent(state, { id: 'evt-1', orderId: 'order-1', grossAmount: 1, transactionStatus: 'settlement' })).toThrow('amount');
    expect(state.entitlements).toEqual([]);
  });
});
