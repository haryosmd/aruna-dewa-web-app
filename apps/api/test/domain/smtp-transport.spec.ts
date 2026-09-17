import { describe, expect, it } from 'vitest';
import { describeFailure, smtpTransportOptions } from '../../src/identity/mail.service.js';

describe('pilihan transport SMTP', () => {
  it('menolak menyusun transport tanpa host', () => {
    expect(() => smtpTransportOptions({})).toThrow(/SMTP_HOST/u);
  });

  it('tidak mengirim blok auth ke inbox lokal yang tidak menerimanya', () => {
    expect(smtpTransportOptions({ SMTP_HOST: '127.0.0.1' })).toEqual({ host: '127.0.0.1', port: 1025, secure: false, connectionTimeout: 10_000, greetingTimeout: 10_000 });
  });

  it('membawa kredensial saat penyedia produksi menuntutnya', () => {
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_PORT: '587', SMTP_USER: 'resend', SMTP_PASS: 're_rahasia' }))
      .toEqual({ host: 'smtp.resend.com', port: 587, secure: false, connectionTimeout: 10_000, greetingTimeout: 10_000, auth: { user: 'resend', pass: 're_rahasia' } });
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
    // 2587 adalah satu-satunya port yang benar di VPS produksi; ia harus lewat STARTTLS,
    // bukan TLS implisit, persis seperti 587.
    expect(smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_PORT: '2587' }).secure).toBe(false);
  });

  /**
   * Bawaan nodemailer dua menit, dan di jaringan yang men-*drop* paket (bukan menolaknya) dua
   * menit itu dihabiskan oleh pendaftar yang menatap layar diam. Batasnya ikut di opsi supaya
   * ia tidak bisa hilang diam-diam saat transportnya dirakit ulang.
   */
  it('membawa batas tunggu, supaya port yang diblokir gagal dalam hitungan detik', () => {
    const options = smtpTransportOptions({ SMTP_HOST: 'smtp.resend.com', SMTP_PORT: '2587' });
    expect(options.connectionTimeout).toBe(10_000);
    expect(options.greetingTimeout).toBe(10_000);
  });
});

/**
 * Tiga mode kegagalan SMTP produksi terlihat sama dari luar — pengguna hanya menerima 503 —
 * tapi penanganannya berbeda total. Sebelum Fase 27 `MailService` menangkapnya dengan `catch {}`
 * tanpa binding, jadi ketiganya menghasilkan baris log yang identik dan diagnosis dari log
 * mustahil. Yang membedakan hanya `code` dan balasan relay, dan itulah yang diuji di sini.
 */
describe('keterangan kegagalan SMTP di log', () => {
  it('menyebut port yang diblokir jaringan, yang tidak pernah punya balasan relay', () => {
    expect(describeFailure(Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT', command: 'CONN' })))
      .toBe('code=ETIMEDOUT command=CONN');
  });

  it('menyebut kredensial yang ditolak, lengkap dengan balasan relay', () => {
    expect(describeFailure(Object.assign(new Error('Invalid login'), { code: 'EAUTH', responseCode: 535, response: '535 Authentication failed\r\n' })))
      .toBe('code=EAUTH responseCode=535 response=535 Authentication failed');
  });

  it('menyebut domain pengirim yang belum terverifikasi — AUTH lolos, kirimnya yang ditolak', () => {
    expect(describeFailure(Object.assign(new Error('Forbidden'), { code: 'EMESSAGE', responseCode: 403, response: '403 The arunadewa.id domain is not verified' })))
      .toBe('code=EMESSAGE responseCode=403 response=403 The arunadewa.id domain is not verified');
  });

  it('tidak menelan galat yang tidak berbentuk galat SMTP', () => {
    expect(describeFailure('relay tiba-tiba menutup soket')).toBe('relay tiba-tiba menutup soket');
  });
});
