/**
 * Pengusiran cookie sesi warisan.
 *
 * Mengubah cakupan cookie sesi — memasang `COOKIE_DOMAIN`, atau menggantinya kelak — tidak
 * menyentuh salinan yang sudah telanjur ada di browser orang. Salinan lama itu bertahan sampai
 * `maxAge`-nya habis (tiga puluh hari untuk cookie refresh), ikut terkirim di tiap permintaan,
 * dan `logout` tidak bisa menghapusnya: `clearCookie` hanya cocok kalau `Path` **dan** `Domain`
 * persis sama, sedangkan yang dikirimnya sekarang membawa `Domain` yang baru.
 *
 * Karena itu pembersihannya dipasang sebagai middleware, bukan hanya di jalur yang menerbitkan
 * sesi: browser yang terkunci memantul di `/auth/me` dan `/auth/refresh` **sebelum** sempat login
 * lagi, jadi penyembuhannya harus ikut di permintaan yang berakhir 401 sekalipun.
 *
 * Penghapusan dikirim **tanpa `domain`**, jadi ia mengenai tepat salinan host-only dan tidak
 * menyentuh cookie yang sedang berlaku. Satu respons boleh membawa keduanya sekaligus untuk nama
 * yang sama — bagi browser itu dua cookie berbeda.
 */

import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { sessionCookieDomain } from './cookie-domain.js';
import { duplicatedSessionCookies, type SessionCookieName } from './session-cookie.js';
import { isProduction, type RuntimeEnv } from './env.js';

/** Atribut penghapusan. Tanpa `domain`, dan `path` samakan dengan penerbitnya di `auth.service.ts`. */
export function legacyCookieClearOptions(env: RuntimeEnv = process.env): Record<string, unknown> {
  return { httpOnly: true, sameSite: 'lax', secure: isProduction(env), path: '/' };
}

/**
 * Nama yang perlu diusir dari sebuah header `Cookie`.
 *
 * Kosong selama `COOKIE_DOMAIN` tidak dipasang — dan penjaga itu bukan basa-basi. Di mesin
 * pengembang web dan API berbagi satu host, cookie sesinya memang host-only, dan tanpa penjaga
 * ini middleware-nya akan menghapus cookie yang justru sedang sah.
 */
export function legacyCookiesToExpire(header: string | undefined, env: RuntimeEnv = process.env): SessionCookieName[] {
  if (!sessionCookieDomain(env)) return [];
  return duplicatedSessionCookies(header);
}

@Injectable()
export class LegacySessionCookieMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    for (const name of legacyCookiesToExpire(request.headers.cookie)) {
      response.clearCookie(name, legacyCookieClearOptions());
    }
    next();
  }
}
