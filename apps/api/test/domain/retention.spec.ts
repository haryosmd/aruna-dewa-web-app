import { describe, expect, it } from 'vitest';
import { retentionCutoffs, retentionDays } from '../../src/maintenance/retention.js';

const now = new Date('2026-09-15T03:00:00.000Z');
const days = (count: number) => count * 24 * 60 * 60 * 1000;

describe('batas retensi', () => {
  it('menghitung mundur dari waktu penyapuan', () => {
    const cutoff = retentionCutoffs(now);
    expect(cutoff.oneTimeToken).toEqual(new Date(now.getTime() - days(retentionDays.oneTimeToken)));
    expect(cutoff.session).toEqual(new Date(now.getTime() - days(30)));
    expect(cutoff.importJobCommitted).toEqual(new Date(now.getTime() - days(90)));
    expect(cutoff.importJobAbandoned).toEqual(new Date(now.getTime() - days(7)));
  });

  it('membuang pratinjau impor yang terlantar jauh lebih cepat daripada yang dipakai', () => {
    // Keduanya menyimpan nama dan nomor telepon tamu; yang tak pernah dikomit tidak pernah
    // jadi apa-apa, jadi tidak ada alasan menahannya selama jejak impor yang sungguhan.
    expect(retentionDays.importJobAbandoned).toBeLessThan(retentionDays.importJobCommitted);
  });
});
