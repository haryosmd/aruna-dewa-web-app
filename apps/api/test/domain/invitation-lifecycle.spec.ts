import { describe, expect, it } from 'vitest';
import { archivedInvitationRetentionDays, archivedPurgeCutoff, revisionsToDropOnArchive } from '../../src/invitations/lifecycle.js';

describe('arsip undangan membuang yang berat, menahan yang perlu', () => {
  const revisions = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];

  it('membuang seluruh revisi kecuali yang sedang aktif', () => {
    expect(revisionsToDropOnArchive(revisions, 'r2')).toEqual(['r1', 'r3']);
  });

  it('undangan yang belum pernah terbit membuang semuanya', () => {
    expect(revisionsToDropOnArchive(revisions, null)).toEqual(['r1', 'r2', 'r3']);
  });

  it('tidak pernah membuang revisi yang ditunjuk `activeRevisionId`', () => {
    // Menghapusnya berarti melanggar kunci asing `Invitation.activeRevisionId` — dan memulihkan
    // undangan itu nanti tidak punya apa pun untuk disajikan.
    for (const aktif of ['r1', 'r2', 'r3']) {
      expect(revisionsToDropOnArchive(revisions, aktif)).not.toContain(aktif);
    }
  });

  it('tidak menuntut apa pun dari undangan tanpa revisi', () => {
    expect(revisionsToDropOnArchive([], 'r9')).toEqual([]);
  });
});

describe('batas pemusnahan arsip', () => {
  const now = new Date('2026-09-22T03:00:00.000Z');

  it('mundur tepat tiga puluh hari dari waktu yang diberikan', () => {
    expect(archivedInvitationRetentionDays).toBe(30);
    expect(archivedPurgeCutoff(now).toISOString()).toBe('2026-08-23T03:00:00.000Z');
  });

  it('arsip yang baru diubah belum lewat batas; yang lama sudah', () => {
    const cutoff = archivedPurgeCutoff(now);
    expect(new Date('2026-09-20T00:00:00.000Z') < cutoff).toBe(false);
    expect(new Date('2026-07-01T00:00:00.000Z') < cutoff).toBe(true);
  });
});
