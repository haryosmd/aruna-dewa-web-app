/**
 * Aturan aktivasi pembayaran, dipisahkan dari Prisma supaya bisa diuji sebagai
 * fungsi murni dan dipakai ulang oleh webhook Midtrans maupun bypass operator.
 */

export type PaymentStatus = 'PENDING' | 'SETTLED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

/** Berapa lama entitlement berlaku setelah sebuah pesanan aktif. */
export const ENTITLEMENT_DURATION_MONTHS = 12;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Terjemahan status transaksi Midtrans ke status pembayaran internal. */
export function paymentStatusFor(transactionStatus: string, fraudStatus?: string): PaymentStatus {
  if (transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')) return 'SETTLED';
  if (transactionStatus === 'capture' && fraudStatus === 'challenge') return 'PENDING';
  if (transactionStatus === 'pending') return 'PENDING';
  if (transactionStatus === 'expire') return 'EXPIRED';
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') return 'REFUNDED';
  return 'FAILED';
}

/**
 * Sebuah pesanan hanya boleh diaktifkan sekali. `activatedAt` adalah kunci
 * idempotensinya, jadi pengiriman ulang webhook tidak menggandakan entitlement.
 */
export function shouldActivate(status: PaymentStatus, activatedAt: Date | null): boolean {
  return status === 'SETTLED' && !activatedAt;
}

export interface EntitlementGrant {
  invitationId: string;
  orderId: string;
  featureId: string;
  activeUntil: Date;
}

/** Baris entitlement untuk setiap fitur yang tercakup dalam snapshot harga pesanan. */
export function entitlementGrants(input: { invitationId: string; orderId: string; features: string[]; now?: Date }): EntitlementGrant[] {
  const activeUntil = addMonths(input.now ?? new Date(), ENTITLEMENT_DURATION_MONTHS);
  return [...new Set(input.features)].map((featureId) => ({ invitationId: input.invitationId, orderId: input.orderId, featureId, activeUntil }));
}

/** Fitur yang dibayar, dibaca dari snapshot harga yang dikunci saat pesanan dibuat. */
export function featuresFromSnapshot(priceSnapshot: unknown): string[] {
  const snapshot = priceSnapshot as { features?: unknown } | null;
  if (!snapshot || !Array.isArray(snapshot.features)) return [];
  return snapshot.features.filter((feature): feature is string => typeof feature === 'string');
}

export interface PaymentActivationState {
  order: { id: string; total: number; status: 'PENDING' | 'PAID'; activatedAt: Date | null };
  processedEventIds: Set<string>;
  entitlements: string[];
}

export interface VerifiedPaymentEvent {
  id: string;
  orderId: string;
  grossAmount: number;
  transactionStatus: string;
  fraudStatus?: string;
}

/**
 * Model in-memory dari alur webhook, dipakai tes domain untuk mengunci aturan
 * idempotensi dan pencocokan nominal tanpa menyentuh database.
 */
export function applyVerifiedPaymentEvent(state: PaymentActivationState, event: VerifiedPaymentEvent): void {
  if (state.processedEventIds.has(event.id)) return;
  if (event.orderId !== state.order.id) throw new Error('order tidak cocok');
  if (event.grossAmount !== state.order.total) throw new Error('amount tidak cocok dengan order');

  state.processedEventIds.add(event.id);
  if (!shouldActivate(paymentStatusFor(event.transactionStatus, event.fraudStatus), state.order.activatedAt)) return;

  state.order.status = 'PAID';
  state.order.activatedAt = new Date();
  state.entitlements.push(state.order.id);
}
