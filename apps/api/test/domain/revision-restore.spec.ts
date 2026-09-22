import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createLegacyDocument, type InvitationDocument } from '@aruna/contracts';
import { InvitationsService } from '../../src/invitations/invitations.service.js';

/*
 * Riwayat versi (fase 75). Substratnya sudah ada sejak lama — `publish()` menulis satu
 * `PublishedRevision` per revisi dan tidak pernah menghapusnya — jadi yang diuji di sini bukan
 * penyimpanannya melainkan **pintunya**, dan satu keputusan yang mudah salah:
 *
 *   Memulihkan ditulis lewat `saveDraft` yang sama, bukan `update` langsung ke `draftDocument`.
 *
 * Itu yang menjaga pemulihan tetap melewati gerbang desain dan penjaga konflik revisi. Pintu
 * kedua yang menulis dokumen tanpa keduanya adalah cara menyimpan sesuatu yang API-nya sendiri
 * akan tolak di tempat lain — dan tesnya di bawah memang menuntut keduanya terbukti berlaku.
 */

type Fixture = {
  packageId?: string | null;
  draftDocument?: unknown;
  draftRevision?: number;
  entitlements?: string[];
  revisions?: { revision: number; document: unknown }[];
  activeRevisionId?: string | null;
  role?: 'OWNER' | 'EDITOR' | 'VIEWER';
};

/** Prisma dan MembershipService seperlunya: kedua metode yang diuji menyentuh permukaan yang sempit. */
function layanan(fixture: Fixture = {}) {
  const revisions = (fixture.revisions ?? []).map((row, i) => ({ id: `rev-${row.revision}`, invitationId: 'inv-1', revision: row.revision, document: row.document, createdAt: new Date(2026, 8, 20 + i) }));
  const state: { draftDocument: unknown; draftRevision: number } = { draftDocument: fixture.draftDocument ?? createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom'), draftRevision: fixture.draftRevision ?? 5 };
  const audit: Record<string, unknown>[] = [];

  const prisma = {
    invitation: {
      findUnique: async ({ select }: { select?: Record<string, boolean | object> }) => {
        if (select && 'activeRevisionId' in select) return { activeRevisionId: fixture.activeRevisionId ?? null } as never;
        return { draftDocument: state.draftDocument, draftRevision: state.draftRevision, entitlements: (fixture.entitlements ?? []).map((featureId) => ({ featureId })) } as never;
      },
      updateMany: async ({ where, data }: { where: { draftRevision?: number }; data: { draftDocument: unknown } }) => {
        if (where.draftRevision !== state.draftRevision) return { count: 0 };
        state.draftDocument = data.draftDocument;
        state.draftRevision += 1;
        return { count: 1 };
      },
    },
    publishedRevision: {
      findMany: async () => [...revisions].sort((a, b) => b.revision - a.revision),
      findFirst: async ({ where }: { where: { revision: number } }) => revisions.find((row) => row.revision === where.revision) ?? null,
    },
    auditEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { audit.push(data); return data; } },
  };

  const memberships = {
    requireInvitationRole: async (_user: unknown, _id: string, minimum: 'VIEWER' | 'EDITOR' | 'OWNER' = 'VIEWER') => {
      const rank = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
      if (rank[fixture.role ?? 'OWNER'] < rank[minimum]) throw new ForbiddenException('Bukan anggota dengan peran yang cukup');
    },
  };

  return { service: new InvitationsService(prisma as never, memberships as never), state, audit };
}

const user = { sub: 'user-1', role: 'USER' } as never;
const v2 = (ubah: (doc: InvitationDocument) => void = () => {}) => { const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom', { date: '2027-06-12' }); ubah(doc); return doc; };

describe('listRevisions', () => {
  it('urut dari yang terbaru, menandai yang sedang tayang, dan TIDAK membawa dokumennya', async () => {
    const { service } = layanan({ revisions: [{ revision: 1, document: v2() }, { revision: 2, document: v2() }, { revision: 3, document: v2() }], activeRevisionId: 'rev-2' });
    const daftar = await service.listRevisions(user, 'inv-1');
    expect(daftar.map((row) => row.revision)).toEqual([3, 2, 1]);
    expect(daftar.filter((row) => row.isActive).map((row) => row.revision)).toEqual([2]);
    // 50 dokumen penuh dalam satu jawaban adalah muatan tanpa pembaca.
    expect(daftar.every((row) => !('document' in row))).toBe(true);
  });

  it('undangan yang belum pernah terbit punya riwayat kosong, bukan galat', async () => {
    const { service } = layanan({ revisions: [] });
    await expect(service.listRevisions(user, 'inv-1')).resolves.toEqual([]);
  });

  it('VIEWER boleh membacanya — daftarnya tidak memuat satu pun isi undangan', async () => {
    const { service } = layanan({ role: 'VIEWER', revisions: [{ revision: 1, document: v2() }] });
    await expect(service.listRevisions(user, 'inv-1')).resolves.toHaveLength(1);
  });
});

describe('restoreRevision', () => {
  it('menulis isi revisi itu ke draft dan menaikkan revisi draft', async () => {
    const lama = v2((doc) => { doc.sections.find((s) => s.type === 'hero')!.data.title = 'Judul lama'; });
    const { service, state } = layanan({ revisions: [{ revision: 2, document: lama }], draftRevision: 5 });
    const hasil = await service.restoreRevision(user, 'inv-1', 2, 5);
    expect(hasil.revision).toBe(6);
    expect((state.draftDocument as InvitationDocument).sections.find((s) => s.type === 'hero')!.data.title).toBe('Judul lama');
  });

  it('mencatat audit dengan nomor revisinya', async () => {
    const { service, audit } = layanan({ revisions: [{ revision: 2, document: v2() }] });
    await service.restoreRevision(user, 'inv-1', 2, 5);
    expect(audit[0]).toMatchObject({ action: 'INVITATION_REVISION_RESTORED', targetType: 'PublishedRevision', metadata: { revision: 2 } });
  });

  it('revisi yang tidak ada jadi 404', async () => {
    const { service } = layanan({ revisions: [{ revision: 2, document: v2() }] });
    await expect(service.restoreRevision(user, 'inv-1', 9, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  /*
   * Penjaga konflik revisi harus ikut berlaku — inilah yang membuat "ditulis lewat saveDraft"
   * bukan sekadar kerapian. Memulihkan versi lama sambil tab lain sedang menyunting adalah cara
   * paling tenang untuk menghapus pekerjaan orang.
   */
  it('tunduk pada penjaga konflik revisi, sama seperti PUT /draft', async () => {
    const { service } = layanan({ revisions: [{ revision: 2, document: v2() }], draftRevision: 7 });
    await expect(service.restoreRevision(user, 'inv-1', 2, 5)).rejects.toBeInstanceOf(ConflictException);
  });

  /*
   * Dan gerbang desain. Pasangan tanpa add-on `design` tetap boleh memulihkan revisi yang
   * desainnya sama — itu revisi mereka sendiri — tapi tidak boleh memakai jalur pulih untuk
   * menyelundupkan warna yang tidak bisa mereka ubah lewat pintu depan.
   */
  it('memulihkan revisi berdesain sama tetap boleh tanpa add-on desain', async () => {
    const { service } = layanan({ entitlements: [], draftDocument: v2((doc) => { doc.sections.find((s) => s.type === 'hero')!.data.title = 'Baru'; }), revisions: [{ revision: 2, document: v2() }] });
    await expect(service.restoreRevision(user, 'inv-1', 2, 5)).resolves.toMatchObject({ revision: 6 });
  });

  it('tapi revisi berdesain BERBEDA ditolak tanpa add-on desain, dan lolos dengan add-on', async () => {
    const berwarna = v2((doc) => { doc.tokens.primary = '#123456'; });
    const tanpa = layanan({ entitlements: [], revisions: [{ revision: 2, document: berwarna }] });
    await expect(tanpa.service.restoreRevision(user, 'inv-1', 2, 5)).rejects.toBeInstanceOf(BadRequestException);

    const dengan = layanan({ entitlements: ['design'], revisions: [{ revision: 2, document: berwarna }] });
    await expect(dengan.service.restoreRevision(user, 'inv-1', 2, 5)).resolves.toMatchObject({ revision: 6 });
  });

  /*
   * Revisi lama boleh `schemaVersion: 1`, dan ia ditulis ke draft APA ADANYA — tidak dimigrasi
   * di server. Aturan sejak fase 72: yang memigrasi editor di klien, supaya server tidak pernah
   * menulis ulang dokumen yang belum disentuh pasangan.
   */
  it('revisi v1 dipulihkan sebagai v1, bukan diam-diam dimigrasi server', async () => {
    const v1 = createLegacyDocument('Sekar', 'Jagad');
    const { service, state } = layanan({ entitlements: ['design'], draftDocument: v1, revisions: [{ revision: 1, document: v1 }] });
    await service.restoreRevision(user, 'inv-1', 1, 5);
    expect((state.draftDocument as InvitationDocument).schemaVersion).toBe(1);
  });

  it('VIEWER tidak boleh memulihkan apa pun', async () => {
    const { service } = layanan({ role: 'VIEWER', revisions: [{ revision: 2, document: v2() }] });
    await expect(service.restoreRevision(user, 'inv-1', 2, 5)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revisi yang formatnya sudah tidak dikenali ditolak, bukan ditulis ke draft', async () => {
    const { service, state } = layanan({ revisions: [{ revision: 2, document: { schemaVersion: 2, bukan: 'dokumen' } }] });
    await expect(service.restoreRevision(user, 'inv-1', 2, 5)).rejects.toBeInstanceOf(BadRequestException);
    expect(state.draftRevision).toBe(5);
  });
});
