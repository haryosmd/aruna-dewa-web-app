import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service.js';
import { retentionCutoffs } from './retention.js';

export type SweepResult = { oneTimeTokens: number; sessions: number; importJobs: number };

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sekali sehari, di jam sepi. Tiap penghapusan berdiri sendiri: satu tabel yang gagal
   * tidak boleh menahan dua lainnya, dan kegagalan penyapu tidak boleh mematikan API.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweepScheduled(): Promise<void> {
    try {
      const swept = await this.sweep();
      if (swept.oneTimeTokens || swept.sessions || swept.importJobs) this.logger.log(`Penyapuan retensi: ${JSON.stringify(swept)}`);
    } catch (cause) {
      this.logger.error('Penyapuan retensi gagal', cause instanceof Error ? cause.stack : String(cause));
    }
  }

  async sweep(now: Date = new Date()): Promise<SweepResult> {
    const cutoff = retentionCutoffs(now);
    const [oneTimeTokens, sessions, importJobs] = await this.prisma.$transaction([
      this.prisma.oneTimeToken.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff.oneTimeToken } }, { usedAt: { lt: cutoff.oneTimeToken } }] } }),
      // Hanya sesi yang sudah pasti mati: dicabut, atau lewat batas absolutnya. Sesi hidup
      // yang lama menganggur tetap dibiarkan — yang memutuskan itu penjaga sesi, bukan penyapu.
      this.prisma.session.deleteMany({ where: { OR: [{ revokedAt: { lt: cutoff.session } }, { absoluteExpiresAt: { lt: cutoff.session } }] } }),
      this.prisma.importJob.deleteMany({
        where: {
          OR: [
            { status: 'COMMITTED', createdAt: { lt: cutoff.importJobCommitted } },
            { status: { not: 'COMMITTED' }, createdAt: { lt: cutoff.importJobAbandoned } },
          ],
        },
      }),
    ]);
    return { oneTimeTokens: oneTimeTokens.count, sessions: sessions.count, importJobs: importJobs.count };
  }
}
