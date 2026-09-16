import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

export interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
}

type Environment = Record<string, string | undefined>;

/**
 * Pilihan transport SMTP, dipisah dari pengiriman supaya bisa diuji tanpa membuka soket.
 *
 * `auth` sengaja **opsional**. Mailpit lokal tidak menerima kredensial sama sekali — mengirimi
 * dia blok `auth` membuat koneksi ditolak — sementara tiap relay produksi (Resend, Brevo, SES,
 * Postmark) menuntutnya. Satu-satunya cara memenuhi keduanya adalah menyertakan bloknya hanya
 * saat kedua nilainya ada. Sebelumnya blok itu tidak pernah ada, dan akibatnya bukan "email
 * lambat" melainkan verifikasi email dan reset password mati total di produksi.
 */
export function smtpTransportOptions(environment: Environment = process.env): SmtpTransportOptions {
  const host = environment.SMTP_HOST;
  if (!host) throw new ServiceUnavailableException('SMTP_HOST belum dikonfigurasi; jalankan Mailpit atau konfigurasi SMTP.');
  const port = Number(environment.SMTP_PORT ?? '1025');
  const user = environment.SMTP_USER?.trim();
  const pass = environment.SMTP_PASS;
  // 465 adalah TLS implisit; 587 dinaikkan lewat STARTTLS oleh nodemailer sendiri.
  const options: SmtpTransportOptions = { host, port, secure: port === 465 };
  if (user && pass) options.auth = { user, pass };
  return options;
}

@Injectable()
export class MailService {
  async send(to: string, subject: string, text: string): Promise<void> {
    const transport = nodemailer.createTransport(smtpTransportOptions());
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM ?? 'Aruna Dewa <noreply@localhost>', to, subject, text });
    } catch {
      throw new ServiceUnavailableException('SMTP tidak dapat dihubungi. Periksa Mailpit atau kredensial SMTP.');
    }
  }
}
