import { PrismaClient } from '@aruna/database';

const identifier = process.argv[2];
if (!identifier) throw new Error('Gunakan: pnpm --filter @aruna/api operator <email-atau-user-id>');

const prisma = new PrismaClient();
try {
  // Email jauh lebih mudah diingat daripada UUID, jadi keduanya diterima.
  const where = identifier.includes('@') ? { email: identifier.toLowerCase() } : { id: identifier };
  const existing = await prisma.user.findUnique({ where, select: { id: true } });
  if (!existing) throw new Error(`Akun ${identifier} belum terdaftar. Daftarkan dulu lewat /register, baru jalankan perintah ini.`);

  const user = await prisma.user.update({ where: { id: existing.id }, data: { role: 'OPERATOR' }, select: { id: true, email: true } });
  await prisma.auditEvent.create({ data: { actorId: user.id, action: 'OPERATOR_GRANTED_CLI', targetType: 'User', targetId: user.id, metadata: { roleCode: 'r_7c91' } } });
  process.stdout.write(`${user.email} sekarang memiliki role r_7c91\n`);
} finally {
  await prisma.$disconnect();
}
