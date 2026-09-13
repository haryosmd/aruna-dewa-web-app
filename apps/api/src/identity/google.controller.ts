import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { safeWebPath } from './next-path.js';

/** Kedua cookie hidup sependek state OAuth-nya dan hanya terkirim ke jalur callback ini. */
const oauthPath = '/auth/google';
const stateCookie = 'aruna_oauth_state';
const nextCookie = 'aruna_oauth_next';

@Controller('auth/google')
export class GoogleController {
  constructor(private readonly auth: AuthService) {}

  @Get('start')
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

  @Get()
  async callback(@Query('code') code: string, @Query('state') state: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    await this.auth.completeGoogle(code, state, request.cookies?.[stateCookie] as string | undefined, response);
    response.clearCookie(stateCookie, { path: oauthPath });
    response.clearCookie(nextCookie, { path: oauthPath });
    const next = safeWebPath(request.cookies?.[nextCookie]);
    response.redirect(`${process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000'}${next}`);
  }
}
