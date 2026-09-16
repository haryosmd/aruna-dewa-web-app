import { describe, expect, it } from 'vitest';
import { STALE_AFTER_MS, workerHealth } from '../src/health.js';

const now = Date.UTC(2026, 8, 16, 12, 0, 0);
const sehat = { database: true, reconciling: true, lastPollAt: now - 1000, lastQueueError: undefined, now };

describe('kesehatan worker', () => {
  it('sehat saat database tersambung dan polling baru saja selesai', () => {
    expect(workerHealth(sehat)).toMatchObject({ ok: true, status: 'ready' });
  });

  it('degraded saat database tidak bisa dihubungi', () => {
    // Inilah bentuk hidup-tapi-mati: prosesnya tidak keluar, jadi restart: unless-stopped
    // tidak pernah menolong, dan tanpa endpoint ini tidak ada satu pun gejala.
    expect(workerHealth({ ...sehat, database: false })).toMatchObject({ ok: false, status: 'degraded' });
  });

  it('degraded saat polling sudah basi lebih dari tiga interval', () => {
    expect(workerHealth({ ...sehat, lastPollAt: now - STALE_AFTER_MS - 1 }).ok).toBe(false);
    // Tepat di ambang masih dianggap sehat: satu putaran lambat bukan kematian.
    expect(workerHealth({ ...sehat, lastPollAt: now - STALE_AFTER_MS }).ok).toBe(true);
  });

  it('sehat tanpa MIDTRANS_SERVER_KEY walau belum pernah polling sekali pun', () => {
    // Operator menandai lunas manual; rekonsiliasi yang diam adalah keadaan yang disengaja.
    // Kalau ini dibuat merah, worker merah sejak hari pertama — dan alarm yang selalu menyala
    // adalah alarm yang dimatikan orang.
    expect(workerHealth({ ...sehat, reconciling: false, lastPollAt: undefined }).ok).toBe(true);
  });

  it('degraded saat rekonsiliasi menyala tapi belum pernah ada polling yang selesai', () => {
    expect(workerHealth({ ...sehat, lastPollAt: undefined }).ok).toBe(false);
  });

  it('melaporkan galat antrean terakhir supaya tidak hanya berakhir di log', () => {
    expect(workerHealth({ ...sehat, lastQueueError: 'connection terminated' }).lastQueueError).toBe('connection terminated');
  });
});
