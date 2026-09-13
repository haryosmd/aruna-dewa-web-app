export async function reconcileOrder(orderId: string, config: { serverKey: string; apiOrigin: string; production: boolean }, request: typeof fetch = fetch): Promise<void> {
  if (!config.serverKey) throw new Error('MIDTRANS_SERVER_KEY wajib diisi.');
  const provider = config.production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  const response = await request(`${provider}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString('base64')}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Status provider gagal (${response.status}).`);
  const status = await response.json() as Record<string, unknown>;
  if (status.order_id !== orderId || typeof status.signature_key !== 'string' || !status.signature_key) throw new Error('Respons provider tidak cocok atau tidak ditandatangani.');
  const relayed = await request(`${config.apiOrigin.replace(/\/$/, '')}/v1/payments/midtrans/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(status), signal: AbortSignal.timeout(15000),
  });
  if (!relayed.ok) throw new Error(`Validasi rekonsiliasi API gagal (${relayed.status}).`);
}
