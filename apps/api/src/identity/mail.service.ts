import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

export interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  auth?: { user: string; pass: string };
}

type Environment = Record<string, string | undefined>;

/**
 * Batas tunggu membuka soket dan menunggu sapaan relay.
 *
 * Bawaan nodemailer adalah dua menit, dan dua menit itu benar untuk jaringan yang menjawab
 * "ditolak". Jaringan VPS ini tidak: `ops/README.md` mencatat paket ke port SMTP yang salah
 * di-*drop*, bukan di-reject. Tanpa batas ini, satu port yang keliru berarti pendaftar
 * pertama menatap layar diam selama dua menit sebelum menerima 503 — dan `register`
 * menunggu kiriman itu selesai sebelum menjawab apa pun.
 */
const SMTP_TIMEOUT_MS = 10_000;

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
  const options: SmtpTransportOptions = {
    host,
    port,
    secure: port === 465,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
  };
  if (user && pass) options.auth = { user, pass };
  return options;
}

/** Keterangan yang dibawa galat nodemailer. Semuanya opsional; relay tidak seragam. */
interface SmtpFailure {
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
}

/**
 * Sebab kegagalan dalam satu baris yang bisa dibaca operator.
 *
 * Tiga mode kegagalan produksi di jalur ini terlihat sama dari luar — pengguna hanya melihat
 * 503 — tapi penanganannya sama sekali berbeda: port yang diblokir jaringan (`ETIMEDOUT`,
 * tanpa balasan relay), API key yang salah (`EAUTH`, `535`), dan domain pengirim yang belum
 * terverifikasi di relay (AUTH lolos, `sendMail` dijawab `403`). Yang membedakannya hanya
 * `code` dan balasan relay, jadi keduanya harus sampai ke log.
 */
export function describeFailure(cause: unknown): string {
  const failure = (cause ?? {}) as SmtpFailure;
  const parts = [
    failure.code ? `code=${failure.code}` : undefined,
    failure.command ? `command=${failure.command}` : undefined,
    failure.responseCode ? `responseCode=${failure.responseCode}` : undefined,
    failure.response ? `response=${failure.response.replace(/\s+/gu, ' ').trim()}` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : String(cause);
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(to: string, subject: string, text: string): Promise<void> {
    const options = smtpTransportOptions();
    const transport = nodemailer.createTransport(options);
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM ?? 'Aruna Dewa <noreply@localhost>', to, subject, text });
    } catch (cause) {
      // Alamat tujuan tidak ikut dicatat: log ini dibaca untuk memperbaiki relay, bukan untuk
      // menelusuri siapa yang mendaftar. Host dan port ikut karena keduanya datang dari berkas
      // env di server, dan salah satu dari keduanyalah yang paling sering keliru.
      this.logger.error(
        `Pengiriman email gagal lewat ${options.host}:${options.port} (auth=${options.auth ? 'ya' : 'tidak'}) — ${describeFailure(cause)}`,
        cause instanceof Error ? cause.stack : String(cause),
      );
      throw new ServiceUnavailableException('SMTP tidak dapat dihubungi. Periksa Mailpit atau kredensial SMTP.');
    }
  }
}
