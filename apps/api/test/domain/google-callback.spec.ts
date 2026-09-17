import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../../src/identity/auth.service.js';
import { GoogleController } from '../../src/identity/google.controller.js';

const original = process.env.WEB_ORIGIN;
beforeEach(() => { process.env.WEB_ORIGIN = 'https://arunadewa.id'; });
afterEach(() => {
  if (original === undefined) delete process.env.WEB_ORIGIN;
  else process.env.WEB_ORIGIN = original;
});

/** Request palsu secukupnya: callback hanya membaca cookie, user-agent, dan ip. */
function fakeRequest(cookies: Record<string, string> = {}): Request {
  return { cookies, header: () => undefined, ip: '203.0.113.9' } as unknown as Request;
}

function fakeResponse() {
  const cleared: string[] = [];
  const redirects: string[] = [];
  const response = {
    clearCookie: (name: string) => { cleared.push(name); },
    redirect: (url: string) => { redirects.push(url); },
  } as unknown as Response;
  return { response, cleared, redirects };
}

function controllerThatFails(cause: unknown) {
  const completeGoogle = vi.fn().mockRejectedValue(cause);
  return { controller: new GoogleController({ completeGoogle } as unknown as AuthService), completeGoogle };
}

describe('callback Google yang gagal', () => {
  it('mengantar orangnya ke form login, bukan ke JSON di domain API', async () => {
    const { controller } = controllerThatFails(new UnauthorizedException({ code: 'GOOGLE_EXPIRED', message: 'state basi' }));
    const { response, redirects } = fakeResponse();
    await controller.callback('kode', 'state', undefined, fakeRequest(), response);
    expect(redirects).toEqual(['https://arunadewa.id/login?error=GOOGLE_EXPIRED']);
  });

  it('membersihkan cookie OAuth justru di jalur yang dulu tidak pernah sampai ke sana', async () => {
    const { controller } = controllerThatFails(new BadRequestException({ code: 'GOOGLE_UNCONFIGURED' }));
    const { response, cleared } = fakeResponse();
    await controller.callback('kode', 'state', undefined, fakeRequest({ aruna_oauth_state: 'basi' }), response);
    expect(cleared).toEqual(['aruna_oauth_state', 'aruna_oauth_next']);
  });

  it('membawa serta tujuan semula, supaya niat orangnya tidak hilang karena satu kegagalan', async () => {
    const { controller } = controllerThatFails(new Error('prisma mati'));
    const { response, redirects } = fakeResponse();
    await controller.callback('kode', 'state', undefined, fakeRequest({ aruna_oauth_next: '/dashboard/abc' }), response);
    expect(redirects[0]).toBe('https://arunadewa.id/login?next=%2Fdashboard%2Fabc&error=GOOGLE_FAILED');
  });

  it('mengenali pembatalan di layar consent tanpa menukar kode apa pun ke Google', async () => {
    const { controller, completeGoogle } = controllerThatFails(new Error('tidak boleh dipanggil'));
    const { response, redirects } = fakeResponse();
    await controller.callback('', '', 'access_denied', fakeRequest(), response);
    expect(completeGoogle).not.toHaveBeenCalled();
    expect(redirects).toEqual(['https://arunadewa.id/login?error=GOOGLE_CANCELLED']);
  });

  it('menolak tujuan yang dikarang lewat cookie, di jalur gagal maupun jalur berhasil', async () => {
    const completeGoogle = vi.fn().mockResolvedValue({ sub: 'u_1' });
    const controller = new GoogleController({ completeGoogle } as unknown as AuthService);
    const { response, redirects } = fakeResponse();
    await controller.callback('kode', 'state', undefined, fakeRequest({ aruna_oauth_next: '//evil.test/panen' }), response);
    expect(redirects).toEqual(['https://arunadewa.id/dashboard']);
  });
});
