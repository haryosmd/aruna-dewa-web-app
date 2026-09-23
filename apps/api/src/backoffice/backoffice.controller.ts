import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BackofficeService } from './backoffice.service.js';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common/auth.js';

/**
 * Backoffice operator (fase 78) — **baca saja**.
 *
 * Seluruh aksinya memakai endpoint undangan yang sama dengan dasbor pasangan
 * (`/v1/invitations/:id/{unpublish,archive,restore}` dan `DELETE`), jadi tidak ada jalur tulis
 * kedua yang bisa melenceng dari yang pertama. Yang khusus di sini cuma daftarnya: lebih kaya,
 * berhalaman, dan satu-satunya yang memperlihatkan arsip.
 *
 * Perannya ditegakkan `assertOperator` di service, bukan lewat guard: repo ini belum punya
 * `RolesGuard` — `isOperator`/`assertOperator` di `common/auth.ts` adalah satu-satunya definisi
 * peran istimewa, dipanggil manual di lima tempat — dan fase 78 bukan tempat memperkenalkan
 * mekanisme keenam.
 */
@Controller('v1/bo')
@UseGuards(JwtAuthGuard)
export class BackofficeController {
  constructor(private readonly backoffice: BackofficeService) {}

  @Get('invitations')
  invitations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.backoffice.invitations(user, { q, status, page: Number(page) || 1 });
  }
}
