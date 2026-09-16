/**
 * Keputusan "worker ini masih benar-benar bekerja atau sekadar masih berjalan", dipisah dari
 * server HTTP-nya supaya bisa diuji tanpa database dan tanpa soket.
 *
 * Yang dijaga di sini adalah satu-satunya bentuk kegagalan worker yang tidak punya gejala:
 * `boss.on('error')` mencetak galat lalu membiarkan proses hidup, sehingga
 * `restart: unless-stopped` tidak pernah memutar ulang dan antreannya menumpuk dalam diam.
 */

/** Jarak antar-polling di `main.ts`. Satu sumber, supaya ambang basi tidak bisa menyimpang darinya. */
export const POLL_INTERVAL_MS = 60_000;

/**
 * Port bawaan server kesehatan. Diekspor supaya `compose.prod.yaml` bisa dijaga terhadapnya:
 * healthcheck yang menembak port yang salah akan menandai worker `unhealthy` selamanya, dan
 * alarm yang selalu menyala adalah alarm yang dimatikan orang.
 */
export const DEFAULT_HEALTH_PORT = 3002;

/**
 * Tiga kali interval, bukan satu: satu putaran yang kebetulan lambat bukan alasan menyatakan
 * worker mati, tapi tiga yang terlewat berturut-turut selalu berarti sesuatu.
 */
export const STALE_AFTER_MS = POLL_INTERVAL_MS * 3;

export interface WorkerHealthInput {
  /** Hasil `SELECT 1`. Kehilangan database adalah bentuk persis dari hidup-tapi-mati. */
  database: boolean;
  /** `MIDTRANS_SERVER_KEY` terisi. Kalau tidak, rekonsiliasi memang tidak berjalan. */
  reconciling: boolean;
  lastPollAt: number | undefined;
  lastQueueError: string | undefined;
  now: number;
}

export interface WorkerHealthReport {
  ok: boolean;
  status: 'ready' | 'degraded';
  database: boolean;
  reconciling: boolean;
  lastPollAt: string | null;
  lastQueueError: string | null;
}

export function workerHealth(input: WorkerHealthInput): WorkerHealthReport {
  // Tanpa MIDTRANS_SERVER_KEY, `poll()` keluar lebih awal dan `lastPollAt` memang tidak pernah
  // terisi. Itu keadaan sehat selama operator menandai lunas manual — menjadikannya kegagalan
  // berarti worker akan merah terus-menerus sejak hari pertama, dan alarm yang selalu menyala
  // adalah alarm yang dimatikan orang.
  const stale = input.reconciling && (input.lastPollAt === undefined || input.now - input.lastPollAt > STALE_AFTER_MS);
  const ok = input.database && !stale;
  return {
    ok,
    status: ok ? 'ready' : 'degraded',
    database: input.database,
    reconciling: input.reconciling,
    lastPollAt: input.lastPollAt === undefined ? null : new Date(input.lastPollAt).toISOString(),
    lastQueueError: input.lastQueueError ?? null,
  };
}
