import { describe, expect, it } from 'vitest';
import { smtpTransportOptions } from '../../src/identity/mail.service.js';

describe('pilihan transport SMTP', () => {
  it('menolak menyusun transport tanpa host', () => {
    expect(() => smtpTransportOptions({})).toThrow(/SMTP_HOST/u);
  });

  it('tidak mengirim blok auth ke inbox lokal yang tidak menerimanya', () => {
    expect(smtpTransportOptions({ SMTP_HOST: '127.0.0.1' })).toEqual({ host: '127.0.0.1', port: 1025, secure: false });
  });

  it('membawa kredensial saat penyedia produksi menuntutnya', () => {
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_PORT: '587', SMTP_USER: 'resend', SMTP_PASS: 're_rahasia' }))
      .toEqual({ host: 'smtp.resend.com', port: 587, secure: false, auth: { user: 'resend', pass: 're_rahasia' } });
  });

  /**
   * Setengah kredensial adalah salah ketik, bukan konfigurasi. Mengirimnya apa adanya membuat
   * relay menjawab 535 dan gejalanya jadi "email tidak terkirim" — bukan "SMTP_PASS lupa diisi".
   */
  it('mengabaikan kredensial yang hanya separuh terisi', () => {
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_USER: 'resend' })).not.toHaveProperty('auth');
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_PASS: 're_rahasia' })).not.toHaveProperty('auth');
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_USER: '   ', SMTP_PASS: 're_rahasia' })).not.toHaveProperty('auth');
  });

  it('menyalakan TLS implisit hanya di 465', () => {
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.example.id', SMTP_PORT: '465' }).secure).toBe(true);
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.example.id', SMTP_PORT: '587' }).secure).toBe(false);
  });
});
