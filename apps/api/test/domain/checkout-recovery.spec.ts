import { describe, expect, it } from 'vitest';
import { decideCheckoutRecovery } from '../../src/payments/checkout-recovery.js';

describe('checkout recovery', () => {
  it('retries the same provider order ID only after Midtrans confirms no transaction exists', () => {
    expect(decideCheckoutRecovery({ providerOrderId: 'aruna-1', snapUrl: null, providerStatus: 'missing' })).toEqual({ kind: 'create', providerOrderId: 'aruna-1' });
  });

  it('does not create a second charge when an earlier request may have reached Midtrans', () => {
    expect(decideCheckoutRecovery({ providerOrderId: 'aruna-1', snapUrl: null, providerStatus: 'known' })).toEqual({ kind: 'await-status' });
  });
});
