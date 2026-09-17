import { BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { googleFailureCode, googleFailureCodes } from '../../src/identity/google-failure.js';

describe('sebab gagalnya callback Google', () => {
  it('membaca kode yang dibawa exception-nya sendiri', () => {
    expect(googleFailureCode(new BadRequestException({ code: 'GOOGLE_CANCELLED', message: 'apa pun' }))).toBe('GOOGLE_CANCELLED');
    expect(googleFailureCode(new UnauthorizedException({ code: 'GOOGLE_EXPIRED', message: 'apa pun' }))).toBe('GOOGLE_EXPIRED');
  });

  it('jatuh ke GOOGLE_FAILED untuk kegagalan yang tidak membawa kode', () => {
    // Balapan penautan identitas dan kegagalan basis data keluar lewat jalur ini.
    expect(googleFailureCode(new InternalServerErrorException())).toBe('GOOGLE_FAILED');
    expect(googleFailureCode(new Error('prisma mati'))).toBe('GOOGLE_FAILED');
    expect(googleFailureCode(undefined)).toBe('GOOGLE_FAILED');
    expect(googleFailureCode(null)).toBe('GOOGLE_FAILED');
  });

  it('tidak pernah meneruskan kode karangan ke URL', () => {
    // Nilainya berakhir sebagai `?error=` di halaman login, jadi ia diperlakukan sebagai daftar
    // tertutup — bukan string yang kebetulan bernama `code`.
    expect(googleFailureCode(new BadRequestException({ code: 'SESSION_REPLACED' }))).toBe('GOOGLE_FAILED');
    expect(googleFailureCode(new BadRequestException({ code: '<script>' }))).toBe('GOOGLE_FAILED');
    expect(googleFailureCode(new BadRequestException('kalimat biasa'))).toBe('GOOGLE_FAILED');
  });

  it('tiap kode punya kalimatnya di web', () => {
    // Penjaga terhadap kode yang ditambahkan di API lalu tidak pernah diterjemahkan di halaman
    // login — gejalanya kotak galat kosong, dan tidak ada yang merah karenanya.
    expect(googleFailureCodes).toContain('GOOGLE_FAILED');
    expect(new Set(googleFailureCodes).size).toBe(googleFailureCodes.length);
  });
});
