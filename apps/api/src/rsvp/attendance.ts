import type { RSVPAttendance } from '@aruna/database';

/**
 * Satu ejaan kehadiran untuk seluruh API.
 *
 * Prisma menyimpannya sebagai enum huruf besar (`YES`/`NO`/`MAYBE`), dan `POST /public/:slug/rsvp`
 * sudah lama memulangkannya huruf kecil. Tiga jalur lain memulangkan baris mentah, sementara
 * **setiap** pembacanya di web membandingkan dengan `'yes'` — jadi penghitung "hadir" di dasbor
 * selalu 0, lencana RSVP selalu berbunyi "Berhalangan", dan panel RSVP di undangan tamu salah
 * membaca jawaban tamu yang kembali. Bentuk yang dikirim keluar ditetapkan di sini.
 */
export type Attendance = 'yes' | 'no' | 'maybe';

export function publicAttendance(value: RSVPAttendance): Attendance {
  return value.toLowerCase() as Attendance;
}

export interface StoredRsvp {
  attendance: RSVPAttendance;
  count: number;
  message: string | null;
}

export function serializeRsvp<T extends StoredRsvp>(rsvp: T | null | undefined): (Omit<T, 'attendance'> & { attendance: Attendance }) | null {
  return rsvp ? { ...rsvp, attendance: publicAttendance(rsvp.attendance) } : null;
}
