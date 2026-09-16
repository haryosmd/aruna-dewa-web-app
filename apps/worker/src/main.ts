import { createServer } from 'node:http';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '@aruna/database';
import { reconcileOrder } from './reconcile.js';
import { DEFAULT_HEALTH_PORT, POLL_INTERVAL_MS, workerHealth } from './health.js';

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? DEFAULT_HEALTH_PORT);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL wajib diisi untuk worker.');
const boss = new PgBoss({ connectionString });
const prisma = new PrismaClient();
/**
 * Sebelum ini, satu-satunya reaksi terhadap galat antrean adalah mencetaknya. Kalau koneksi
 * pg-boss putus permanen, proses TETAP HIDUP: tidak ada yang keluar, jadi `restart: unless-stopped`
 * tidak pernah memutar ulang, dan antrean menumpuk tanpa satu pun gejala. Galatnya disimpan di
 * sini supaya health check punya sesuatu untuk dilaporkan.
 */
let lastQueueError: string | undefined;
boss.on('error', (error: Error) => {
  lastQueueError = error.message;
  console.error('Queue error:', error.message);
});
await boss.start();
await boss.createQueue('payment-reconcile');
await boss.work<{ orderId: string }>('payment-reconcile', async (jobs) => {
  for (const job of jobs) {
    const order = await prisma.order.findUnique({ where: { id: job.data.orderId }, select: { status: true, midtransOrderId: true } });
    if (!order?.midtransOrderId || order.status !== 'PENDING') continue;
    await reconcileOrder(order.midtransOrderId, { serverKey: process.env.MIDTRANS_SERVER_KEY ?? '', apiOrigin: process.env.API_ORIGIN ?? 'http://127.0.0.1:3001', production: process.env.MIDTRANS_IS_PRODUCTION === 'true' });
  }
});
let polling = false;
let lastPollAt: number | undefined;
async function poll(): Promise<void> {
  if (polling || !process.env.MIDTRANS_SERVER_KEY) return;
  polling = true;
  try {
    const pending = await prisma.order.findMany({ where: { status: 'PENDING', midtransOrderId: { not: null } }, select: { id: true }, take: 100, orderBy: { updatedAt: 'asc' } });
    for (const order of pending) await boss.send('payment-reconcile', { orderId: order.id }, { singletonKey: order.id, retryLimit: 3, retryDelay: 30, retryBackoff: true });
    // Dicatat hanya pada putaran yang benar-benar selesai. Polling yang gagal tiap menit akan
    // membuat nilainya membasi, dan itu justru yang harus terlihat.
    lastPollAt = Date.now();
    lastQueueError = undefined;
  } catch (error) { console.error('Payment polling failed:', error instanceof Error ? error.message : 'unknown'); }
  finally { polling = false; }
}
await poll();
const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
console.info(process.env.MIDTRANS_SERVER_KEY ? 'Worker siap; rekonsiliasi setiap 60 detik.' : 'Worker siap; rekonsiliasi menunggu MIDTRANS_SERVER_KEY.');
/**
 * Satu-satunya sinyal kesehatan worker. Ia tidak menyajikan trafik apa pun — hanya menjawab
 * pertanyaan yang sebelumnya tidak bisa ditanyakan siapa pun: apakah proses ini masih benar-benar
 * bekerja, atau sekadar masih berjalan?
 *
 * Tidak diterbitkan ke luar (`expose`, bukan `ports`), jadi hanya healthcheck compose dan
 * container tetangga yang bisa menghubunginya.
 */
const health = createServer((request, response) => {
  void (async () => {
    let database = true;
    try {
      // Yang membedakan "proses hidup" dari "proses masih bisa bekerja". Kehilangan koneksi
      // database adalah bentuk persis dari worker yang hidup tapi mati.
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = false;
    }
    const report = workerHealth({
      database,
      reconciling: Boolean(process.env.MIDTRANS_SERVER_KEY),
      lastPollAt,
      lastQueueError,
      now: Date.now(),
    });
    response.writeHead(report.ok ? 200 : 503, { 'content-type': 'application/json' });
    response.end(JSON.stringify(report));
  })();
});
health.listen(HEALTH_PORT, '0.0.0.0');

const shutdown = async (): Promise<void> => {
  clearInterval(timer);
  health.close();
  await boss.stop({ graceful: true });
  await prisma.$disconnect();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
