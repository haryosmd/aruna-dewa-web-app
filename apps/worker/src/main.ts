import { PgBoss } from 'pg-boss';
import { PrismaClient } from '@aruna/database';
import { reconcileOrder } from './reconcile.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL wajib diisi untuk worker.');
const boss = new PgBoss({ connectionString });
const prisma = new PrismaClient();
boss.on('error', (error: Error) => console.error('Queue error:', error.message));
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
async function poll(): Promise<void> {
  if (polling || !process.env.MIDTRANS_SERVER_KEY) return;
  polling = true;
  try {
    const pending = await prisma.order.findMany({ where: { status: 'PENDING', midtransOrderId: { not: null } }, select: { id: true }, take: 100, orderBy: { updatedAt: 'asc' } });
    for (const order of pending) await boss.send('payment-reconcile', { orderId: order.id }, { singletonKey: order.id, retryLimit: 3, retryDelay: 30, retryBackoff: true });
  } catch (error) { console.error('Payment polling failed:', error instanceof Error ? error.message : 'unknown'); }
  finally { polling = false; }
}
await poll();
const timer = setInterval(() => void poll(), 60000);
console.info(process.env.MIDTRANS_SERVER_KEY ? 'Worker siap; rekonsiliasi setiap 60 detik.' : 'Worker siap; rekonsiliasi menunggu MIDTRANS_SERVER_KEY.');
const shutdown = async (): Promise<void> => {
  clearInterval(timer);
  await boss.stop({ graceful: true });
  await prisma.$disconnect();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
