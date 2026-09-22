import { describe, expect, it } from 'vitest';
import { wishAttendanceLabel, wishAttendances } from '@aruna/contracts/api';
import { publicAttendance, serializeRsvp } from '../../src/rsvp/attendance.js';

describe('ejaan kehadiran yang dikirim keluar', () => {
  it('selalu huruf kecil, apa pun bentuk simpanannya', () => {
    // Prisma menyimpan `YES`/`NO`/`MAYBE`; seluruh web membandingkan dengan `'yes'`. Selisih
    // itu membuat penghitung "hadir" selalu 0 dan tiap lencana RSVP berbunyi "Berhalangan".
    expect(publicAttendance('YES')).toBe('yes');
    expect(publicAttendance('NO')).toBe('no');
    expect(publicAttendance('MAYBE')).toBe('maybe');
  });

  it('meneruskan field lain apa adanya dan menjaga null tetap null', () => {
    expect(serializeRsvp({ attendance: 'YES', count: 2, message: 'Sampai jumpa' })).toEqual({ attendance: 'yes', count: 2, message: 'Sampai jumpa' });
    expect(serializeRsvp(null)).toBeNull();
    expect(serializeRsvp(undefined)).toBeNull();
  });
});

describe('lencana kehadiran ucapan', () => {
  it('memberi label untuk ketiga ejaan yang memang bisa ditulis', () => {
    expect(wishAttendances.every((nilai) => wishAttendanceLabel(nilai) !== null)).toBe(true);
    expect(wishAttendanceLabel('hadir')).toEqual({ label: 'Hadir', tone: 'sage' });
    expect(wishAttendanceLabel('belum-pasti')).toEqual({ label: 'Belum pasti', tone: 'gold' });
    expect(wishAttendanceLabel('berhalangan')).toEqual({ label: 'Berhalangan', tone: 'neutral' });
  });

  /*
   * Ini yang diperbaiki fase 75, dan bukan cabang matinya.
   *
   * Kedua layar dulu berakhir dengan `return { label: 'Belum pasti' }` tanpa syarat, jadi nilai
   * APA PUN yang tidak dikenal tampil sebagai jawaban yang tamunya tidak pernah pilih — termasuk
   * `yes`/`no`/`maybe`, yang milik tabel RSVP dan bukan kolom ini.
   */
  it('menolak menebak: nilai yang tidak dikenal tidak dapat lencana sama sekali', () => {
    for (const asing of ['yes', 'no', 'maybe', 'YES', 'Hadir', 'hadir ', 'entah', '']) {
      expect(wishAttendanceLabel(asing)).toBeNull();
    }
    expect(wishAttendanceLabel(null)).toBeNull();
    expect(wishAttendanceLabel(undefined)).toBeNull();
  });

  it('ejaan RSVP dan ejaan ucapan tidak saling meminjam', () => {
    // `publicAttendance` memakai yes/no/maybe; kolom ucapan tidak pernah.
    expect((wishAttendances as readonly string[]).includes(publicAttendance('YES'))).toBe(false);
  });
});
