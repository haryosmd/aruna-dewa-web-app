import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class MidtransService {
  async createSnapTransaction(input: { orderId: string; grossAmount: number; customer: { email: string; name: string } }): Promise<string> {
    const serverKey = this.serverKey();
    const baseUrl = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/snap/v1/transactions`, { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount }, customer_details: { email: input.customer.email, first_name: input.customer.name } }) });
    } catch { throw new ServiceUnavailableException('Midtrans sandbox tidak dapat dihubungi. Periksa koneksi dan konfigurasi server key.'); }
    if (!response.ok) throw new BadRequestException(`Midtrans menolak checkout (${response.status}). Periksa package, nominal, dan server key sandbox.`);
    const data = await response.json() as { redirect_url?: string };
    if (!data.redirect_url) throw new BadRequestException('Respons Midtrans tidak memiliki redirect URL');
    return data.redirect_url;
  }

  /**
   * Menanyakan apakah Midtrans sudah mengenal sebuah order id. Dipakai untuk memulihkan
   * checkout yang tersangkut tanpa berisiko membuat tagihan kedua.
   */
  async transactionStatus(providerOrderId: string): Promise<'missing' | 'known'> {
    const serverKey = this.serverKey();
    const baseUrl = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v2/${encodeURIComponent(providerOrderId)}/status`, { headers: { authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`, accept: 'application/json' } });
    } catch { throw new ServiceUnavailableException('Midtrans tidak dapat dihubungi untuk memeriksa status pesanan.'); }
    // 404 adalah satu-satunya jawaban yang membuktikan tidak ada transaksi; sisanya diperlakukan
    // sebagai "mungkin ada" supaya tidak pernah menagih dua kali.
    if (response.status === 404) return 'missing';
    return 'known';
  }

  verifySignature(notification: { order_id: string; status_code: string; gross_amount: string; signature_key: string }): boolean {
    const expected = createHash('sha512').update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${this.serverKey()}`).digest('hex');
    return expected === notification.signature_key;
  }

  private serverKey(): string {
    const key = process.env.MIDTRANS_SERVER_KEY;
    if (!key) throw new ServiceUnavailableException('MIDTRANS_SERVER_KEY belum dikonfigurasi; checkout dan webhook tidak dapat diverifikasi.');
    return key;
  }
}
