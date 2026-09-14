import { describe, expect, it } from 'vitest';
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
