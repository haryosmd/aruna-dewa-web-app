import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';
import { probeMediaStorage } from './media/storage.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness. Sengaja tidak menyentuh apa pun: proses yang hidup adalah satu-satunya klaimnya. */
  @Get('health') health() {
    return { status: 'ok' };
  }

  /**
   * Readiness: dua hal yang harus benar sebelum container ini pantas menerima trafik.
   *
   * Keduanya dijalankan bersamaan, bukan berurutan, supaya batas waktu terburuknya tetap satu
   * probe — healthcheck `api` di `compose.prod.yaml` memberi 5 detik untuk seluruh jawaban.
   *
   * SMTP sengaja TIDAK ada di sini. Sejak Fase 23 ia wajib saat boot (`common/env.ts`), jadi
   * yang tersisa untuk diperiksa hanyalah relay yang sedang down — dan menghubunginya tiap 15
   * detik akan memancing rate limit mereka untuk menjawab pertanyaan yang jarang berubah.
   */
  @Get('ready') async ready() {
    const [database, media] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      probeMediaStorage(),
    ]);
    const gagal = [
      database.status === 'rejected' ? 'database' : undefined,
      media.status === 'rejected' ? 'penyimpanan media' : undefined,
    ].filter(Boolean);
    // Pesannya menyebut apa yang gagal. `/ready` yang hanya berbunyi "belum siap" memaksa orang
    // menebak antara dua sebab yang penanganannya sama sekali berbeda.
    if (gagal.length) throw new ServiceUnavailableException(`Belum siap: ${gagal.join(', ')}`);
    return { status: 'ready', checks: { database: 'ok', media: 'ok' } };
  }
}
