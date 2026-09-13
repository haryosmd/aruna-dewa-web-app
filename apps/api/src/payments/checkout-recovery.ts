/**
 * Checkout mengklaim `midtransOrderId` sebelum memanggil Midtrans. Kalau panggilan itu
 * gagal di tengah jalan, pesanan tertinggal dengan id provider terklaim tapi tanpa
 * snapUrl — dan percobaan berikutnya tidak boleh asal membuat transaksi baru, karena
 * permintaan pertama mungkin sebenarnya sudah sampai. Modul ini memutuskan mana yang aman.
 */

export type ProviderTransactionStatus = 'missing' | 'known';

export interface CheckoutRecoveryInput {
  providerOrderId: string;
  snapUrl: string | null;
  providerStatus: ProviderTransactionStatus;
}

export type CheckoutRecoveryDecision =
  | { kind: 'reuse'; snapUrl: string }
  | { kind: 'create'; providerOrderId: string }
  | { kind: 'await-status' };

export function decideCheckoutRecovery(input: CheckoutRecoveryInput): CheckoutRecoveryDecision {
  if (input.snapUrl) return { kind: 'reuse', snapUrl: input.snapUrl };
  // Midtrans tidak mengenal order id ini, jadi tidak ada tagihan yang bisa tergandakan.
  if (input.providerStatus === 'missing') return { kind: 'create', providerOrderId: input.providerOrderId };
  return { kind: 'await-status' };
}
