import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service.js';
import { retentionCutoffs } from './retention.js';
import { archivedPurgeCutoff } from '../invitations/lifecycle.js';
import { storageForAsset } from '../media/storage.js';

export type SweepResult = { oneTimeTokens: number; sessions: number; importJobs: number; archivedInvitations: number };

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
      if (swept.oneTimeTokens || swept.sessions || swept.importJobs || swept.archivedInvitations) this.logger.log(`Penyapuan retensi: ${JSON.stringify(swept)}`);
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
    return {
      oneTimeTokens: oneTimeTokens.count,
      sessions: sessions.count,
      importJobs: importJobs.count,
      archivedInvitations: await this.purgeArchivedInvitations(now),
    };
  }

  /**
   * Memusnahkan undangan yang sudah tiga puluh hari berada di arsip (fase 78).
   *
   * Arsip adalah janji "salah klik masih bisa dipulihkan", bukan gudang tanpa batas — dan
   * janji itu punya tanggal kedaluwarsa yang tertulis di dialog konfirmasinya. Yang berat
   * sudah dipangkas saat pengarsipan (revisi terbit dan aset yang tidak dirujuk); yang tersisa
   * dibuang di sini.
   *
   * Satu per satu, bukan `deleteMany`, dan itu bukan kelalaian: tiap undangan punya berkas di
   * penyimpanan yang tidak ikut cascade, dan `activeRevisionId` yang harus di-null-kan lebih
   * dulu karena kunci asingnya melingkar. Satu undangan yang gagal tidak boleh menahan sisanya.
   */
  private async purgeArchivedInvitations(now: Date): Promise<number> {
    const cutoff = archivedPurgeCutoff(now);
    const rows = await this.prisma.invitation.findMany({
      where: { status: 'ARCHIVED', updatedAt: { lt: cutoff } },
      select: { id: true, slug: true },
    });
    let purged = 0;
    for (const row of rows) {
      try {
        const assets = await this.prisma.mediaAsset.findMany({ where: { invitationId: row.id }, select: { key: true, provider: true } });
        for (const asset of assets) {
          try { await storageForAsset(asset.provider).delete(asset.key); }
          catch (cause) { this.logger.error(`Berkas aset arsip gagal dihapus (${asset.key})`, cause instanceof Error ? cause.stack : String(cause)); }
        }
        await this.prisma.$transaction(async (tx) => {
          await tx.invitation.update({ where: { id: row.id }, data: { activeRevisionId: null } });
          await tx.invitation.delete({ where: { id: row.id } });
        });
        await this.prisma.auditEvent.create({ data: { action: 'INVITATION_PURGED_RETENTION', targetType: 'Invitation', targetId: row.id, metadata: { slug: row.slug } } });
        purged += 1;
      } catch (cause) {
        this.logger.error(`Pemusnahan arsip gagal (${row.slug})`, cause instanceof Error ? cause.stack : String(cause));
      }
    }
    return purged;
  }
}
