import { Injectable } from '@nestjs/common';
import type { BackofficeInvitationPage } from '@aruna/contracts/api';
import { Prisma } from '@aruna/database';
import { PrismaService } from '../database/prisma.service.js';
import { assertOperator, type AuthenticatedUser } from '../common/auth.js';

/** Satu halaman = 25 baris, sama dengan daftar tamu; angka yang sudah dikenal tangan operator. */
const pageSize = 25;

const statuses = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

@Injectable()
export class BackofficeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seluruh undangan di sistem, berhalaman.
   *
   * **Termasuk yang diarsipkan** — dan itulah satu-satunya tempat arsip bisa dilihat:
   * `GET /invitations` mengecualikannya di kedua cabangnya, jadi tanpa halaman ini undangan
   * yang diarsipkan pasangan tidak punya siapa pun yang bisa memulihkannya sebelum penyapu
   * retensi memusnahkannya tiga puluh hari kemudian.
   *
   * `select` eksplisit, dan `draftDocument` sengaja tidak ikut: dua puluh lima dokumen undangan
   * penuh per halaman adalah muatan tanpa pembaca. Operator yang ingin melihat isinya menekan
   * Sunting atau Pratinjau, dan keduanya mengambil undangannya satu per satu.
   */
  async invitations(user: AuthenticatedUser, params: { q?: string; status?: string; page?: number }): Promise<BackofficeInvitationPage> {
    assertOperator(user);

    const q = params.q?.trim() ?? '';
    const status = params.status && statuses.has(params.status) ? (params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') : undefined;
    const page = Number.isFinite(params.page) && (params.page ?? 0) > 0 ? Math.floor(params.page!) : 1;

    const where: Prisma.InvitationWhereInput = {
      ...(status ? { status } : {}),
      // Tiga kolom yang benar-benar diketik orang saat mencari satu undangan: judulnya, alamatnya,
      // dan email pemiliknya — yang terakhir karena keluhan datang lewat email, bukan lewat slug.
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { createdBy: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.invitation.count({ where }),
      this.prisma.invitation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, slug: true, title: true, status: true,
          createdAt: true, updatedAt: true, publishedAt: true,
          createdBy: { select: { email: true } },
          _count: { select: { guests: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        ownerEmail: row.createdBy.email,
        guestCount: row._count.guests,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
