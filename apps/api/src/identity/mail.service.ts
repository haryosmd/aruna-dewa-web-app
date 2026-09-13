import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  async send(to: string, subject: string, text: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) throw new ServiceUnavailableException('SMTP_HOST belum dikonfigurasi; jalankan Mailpit atau konfigurasi SMTP.');
    const port = Number(process.env.SMTP_PORT ?? '1025');
    const transport = nodemailer.createTransport({ host, port, secure: port === 465 });
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM ?? 'Aruna Dewa <noreply@localhost>', to, subject, text });
    } catch {
      throw new ServiceUnavailableException('SMTP tidak dapat dihubungi. Periksa Mailpit atau kredensial SMTP.');
    }
  }
}
