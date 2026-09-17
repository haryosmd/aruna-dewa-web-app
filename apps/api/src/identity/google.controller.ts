import { Controller, Get, Logger, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { googleFailureCode } from './google-failure.js';
import { safeWebPath } from './next-path.js';
import { sessionContext } from './session-context.js';
import { throttleLimits } from '../common/throttling.js';
import { canonicalWebOrigin } from '../common/web-origin.js';

/**
 * Kedua cookie hidup sependek state OAuth-nya dan hanya terkirim ke jalur callback ini.
 *
 * Sengaja TANPA `Domain`, tidak seperti cookie sesi di `auth.service.ts`: keduanya tidak pernah
 * perlu dibaca di luar host API ini, dan menyebarkannya ke seluruh subdomain hanya memperluas
 * permukaan tanpa satu pun manfaat. Jangan "diseragamkan" dengan cookie sesi.
 */
const oauthPath = '/auth/google';
const stateCookie = 'aruna_oauth_state';
const nextCookie = 'aruna_oauth_next';

@Controller('auth/google')
export class GoogleController {
  private readonly logger = new Logger(GoogleController.name);

  constructor(private readonly auth: AuthService) {}

  @Get('start')
  @Throttle({ default: throttleLimits.googleStart })
  async start(@Query('next') next: string | undefined, @Res() response: Response): Promise<void> {
    const start = await this.auth.startGoogle();
    const options = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000, path: oauthPath };
    response.cookie(stateCookie, start.state, options);
    // Tujuan dititipkan di cookie, bukan di parameter `state`: Google memantulkan `state`
    // apa adanya, jadi menaruh path di sana berarti menitipkan tujuan pengunjung ke pihak
    // ketiga dan menerimanya kembali sebagai masukan yang harus dipercaya.
    response.cookie(nextCookie, safeWebPath(next), options);
    response.redirect(start.url);
  }

  /**
   * Yang menerima jawaban ini adalah orang yang sedang berpindah halaman, bukan sepotong kode
   * yang membaca JSON. Karena itu tidak ada satu pun cabang yang boleh keluar lewat
   * `ApiExceptionFilter`: kegagalan apa pun berakhir di form login dengan kalimat yang bisa
   * dibaca, bukan sebagai `{"statusCode":400,...}` di domain API.
   *
   * `error` datang dari Google sendiri — `access_denied` saat pengunjung menekan "Batal". Ia
   * tiba tanpa `code`, jadi sebenarnya akan tertangkap juga di bawah; dibaca di sini supaya
   * pembatalan tidak pernah tersamar sebagai kegagalan.
   */
  @Get()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') googleError: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const next = safeWebPath(request.cookies?.[nextCookie]);
    try {
      if (googleError) throw new UnauthorizedException({ code: 'GOOGLE_CANCELLED', message: `Google membatalkan permintaan: ${googleError}` });
      await this.auth.completeGoogle(code, state, request.cookies?.[stateCookie] as string | undefined, response, sessionContext(request));
    } catch (cause) {
      const failure = googleFailureCode(cause);
      // Tetap dicatat. Halaman yang ramah tidak boleh berarti kegagalan yang tak terlihat —
      // `GOOGLE_UNCONFIGURED` dan `GOOGLE_REJECTED` adalah masalah server, bukan masalah orangnya.
      this.logger.warn(`Callback Google gagal (${failure}): ${cause instanceof Error ? cause.message : String(cause)}`);
      this.clearOauthCookies(response);
      response.redirect(`${canonicalWebOrigin()}/login?${new URLSearchParams({ ...(next === '/dashboard' ? {} : { next }), error: failure }).toString()}`);
      return;
    }
    this.clearOauthCookies(response);
    response.redirect(`${canonicalWebOrigin()}${next}`);
  }

  /**
   * Dipanggil di kedua ujung, dan itu yang baru: sebelum ini jalur gagal tidak pernah sampai ke
   * sini, jadi state yang sudah tidak berguna menghuni browser sampai maxAge 10 menitnya habis —
   * dan percobaan berikutnya di menit yang sama memulai dengan cookie basi di tangan.
   */
  private clearOauthCookies(response: Response): void {
    response.clearCookie(stateCookie, { path: oauthPath });
    response.clearCookie(nextCookie, { path: oauthPath });
  }
}
