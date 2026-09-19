import argon2 from 'argon2';
import { PrismaClient } from '@aruna/database';
import { createDefaultDocument } from '@aruna/contracts';
import { isProduction } from '../common/env.js';

/**
 * Akun demo untuk mode demo lokal (fase 63). Dipanggil lewat `pnpm demo:local`.
 *
 * Prisma saja, sengaja. `/auth/register` mengirim email verifikasi dan menghapus akun bila SMTP
 * gagal; dan skrip ini **tidak login**, karena satu sesi per akun berarti login dari sini akan
 * mengusir sesi browser yang sedang dipakai pemiliknya. Kredensialnya tetap dan hanya-lokal —
 * nilai yang sama dibaca `apps/web/utils/demo-login.ts`.
 */
const email = 'demo@aruna.local';
const password = 'arunademo123';
const loopback = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

if (isProduction()) throw new Error('Akun demo hanya untuk mesin lokal; NODE_ENV=production ditolak.');
const databaseHost = (() => { try { return new URL(process.env.DATABASE_URL ?? '').hostname; } catch { return ''; } })();
if (!loopback.has(databaseHost)) throw new Error(`DATABASE_URL menunjuk ${databaseHost || '(kosong)'}, bukan loopback. Akun demo tidak ditulis ke basis data jauh.`);

const prisma = new PrismaClient();
try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Demo Lokal', passwordHash, role: 'OPERATOR', emailVerifiedAt: now },
    update: { passwordHash, role: 'OPERATOR', emailVerifiedAt: now },
    select: { id: true, email: true },
  });
  await prisma.auditEvent.create({ data: { actorId: user.id, action: 'OPERATOR_GRANTED_CLI', targetType: 'User', targetId: user.id, metadata: { roleCode: 'r_7c91', demo: true } } });

  // Satu undangan contoh supaya dasbor tidak kosong saat pertama dibuka. Kolomnya sama dengan
  // `InvitationsService.create`; undangan berikutnya dibuat lewat `/order`, yang untuk operator
  // langsung aktif tanpa Midtrans.
  const owned = await prisma.invitationMember.count({ where: { userId: user.id } });
  let seeded = '';
  if (owned === 0) {
    const slug = `demo-aruna-dewa-${Math.random().toString(36).slice(2, 6)}`;
    const document = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
    const date = '2027-06-12';
    const events = document.sections.find((section) => section.type === 'events');
    if (events && Array.isArray(events.data.events)) {
      events.data.events = (events.data.events as Record<string, unknown>[]).map((event) => ({ ...event, date, venue: 'Pendopo Aruna', address: 'Yogyakarta' }));
    }
    const countdown = document.sections.find((section) => section.type === 'countdown');
    if (countdown) countdown.data.date = date;
    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({ data: { slug, title: 'Demo Aruna & Dewa', partner1: 'Aruna', partner2: 'Dewa', eventDate: new Date(date), venue: 'Pendopo Aruna', address: 'Yogyakarta', draftDocument: JSON.parse(JSON.stringify(document)), createdById: user.id } });
      await tx.invitationMember.create({ data: { invitationId: created.id, userId: user.id, role: 'OWNER' } });
      return created;
    });
    seeded = ` Undangan contoh: /dashboard/${invitation.id} (slug ${invitation.slug}).`;
  }
  process.stdout.write(`${user.email} siap sebagai r_7c91 (kata sandi: ${password}).${seeded}\nNyalakan web dengan NUXT_DEV_DEMO=1 (launch.json: web-demo), lalu buka /dashboard.\n`);
} finally {
  await prisma.$disconnect();
}
