import { describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@aruna/contracts';
import {
  changePasswordBodySchema,
  createGuestBodySchema,
  createOrderBodySchema,
  loginBodySchema,
  midtransWebhookBodySchema,
  publicRsvpBodySchema,
  saveDraftBodySchema,
  updateGuestBodySchema,
  updateProfileBodySchema,
} from '@aruna/contracts/api';
import { ZodValidationPipe } from '../../src/common/zod-validation.pipe.js';

describe('revisi optimistik', () => {
  it('menolak body tanpa kunci revision — inilah kehilangan data yang dulu diam-diam berhasil', () => {
    // `where: { draftRevision: undefined }` membuat Prisma membuang filternya, bukan
    // mencocokkan null: tulisannya lolos terhadap revisi apa pun dan cabang konflik
    // tidak pernah tercapai.
    const parsed = saveDraftBodySchema.safeParse({ document: createDefaultDocument() });
    expect(parsed.success).toBe(false);
  });

  it('menolak revisi yang bukan bilangan bulat non-negatif', () => {
    const document = createDefaultDocument();
    for (const revision of ['3', 3.5, -1, null, Number.NaN]) {
      expect(saveDraftBodySchema.safeParse({ document, revision }).success).toBe(false);
    }
    expect(saveDraftBodySchema.safeParse({ document, revision: 0 }).success).toBe(true);
  });

  it('memberlakukan aturan yang sama pada tamu', () => {
    const guest = { displayName: 'Rara', quota: 2 };
    expect(updateGuestBodySchema.safeParse(guest).success).toBe(false);
    expect(updateGuestBodySchema.safeParse({ ...guest, revision: 4 }).success).toBe(true);
  });
});

describe('body yang dulu berujung 500', () => {
  it('login dengan {} ditolak sebagai 400, bukan TypeError pada .trim()', () => {
    expect(loginBodySchema.safeParse({}).success).toBe(false);
    expect(loginBodySchema.safeParse({ email: 'a@b.test', password: 'x' }).success).toBe(true);
  });

  it('pesanan tanpa addonIds berarti daftar kosong, bukan new Set(undefined)', () => {
    const parsed = createOrderBodySchema.safeParse({ packageId: 'paket-utama' });
    expect(parsed.success && parsed.data.addonIds).toEqual([]);
  });

  it('webhook Midtrans menolak field non-string sebelum createHash menyentuhnya', () => {
    const notification = { order_id: 'aruna-1', status_code: '200', gross_amount: '150000', signature_key: 'abc', transaction_status: 'settlement' };
    expect(midtransWebhookBodySchema.safeParse(notification).success).toBe(true);
    expect(midtransWebhookBodySchema.safeParse({ ...notification, status_code: 200 }).success).toBe(false);
    expect(midtransWebhookBodySchema.safeParse({ ...notification, signature_key: null }).success).toBe(false);
  });

  it('menyimpan field webhook yang belum kita kenal, karena payloadnya jadi bukti forensik', () => {
    const parsed = midtransWebhookBodySchema.safeParse({ order_id: 'aruna-1', status_code: '200', gross_amount: '150000', signature_key: 'abc', transaction_status: 'settlement', payment_type: 'qris' });
    expect(parsed.success && (parsed.data as Record<string, unknown>).payment_type).toBe('qris');
  });
});

describe('batas panjang dan bentuk', () => {
  it('memberi judul dan nama batas atas — sebelumnya string tak terbatas masuk DB', () => {
    expect(createGuestBodySchema.safeParse({ displayName: 'a'.repeat(201) }).success).toBe(false);
    expect(createGuestBodySchema.safeParse({ displayName: 'a'.repeat(200) }).success).toBe(true);
  });

  it('menolak nama tamu bermuatan karakter kontrol sebagai 400, bukan Error mentah', () => {
    expect(createGuestBodySchema.safeParse({ displayName: 'Rara\nDewi' }).success).toBe(false);
  });

  it('menjaga bentuk RSVP publik', () => {
    expect(publicRsvpBodySchema.safeParse({ token: 'abc', attendance: 'mungkin' }).success).toBe(false);
    expect(publicRsvpBodySchema.safeParse({ token: 'abc', attendance: 'yes', count: 2 }).success).toBe(true);
  });
});

describe('ubah akun sendiri', () => {
  it('memakai aturan ketat hanya untuk kata sandi baru', () => {
    expect(changePasswordBodySchema.safeParse({ currentPassword: 'pendek', newPassword: 'sembilan1' }).success).toBe(false);
    expect(changePasswordBodySchema.safeParse({ currentPassword: 'pendek', newPassword: 'sepuluhhuruf' }).success).toBe(true);
  });

  /**
   * Kata sandi lama sengaja longgar, persis seperti `loginBodySchema`: akun yang lahir sebelum
   * aturan panjang mana pun tetap harus bisa membuktikan dirinya untuk bisa keluar dari aturan
   * lama itu. Menolaknya di sini berarti mengunci mereka dari satu-satunya jalan memperbaikinya.
   */
  it('tidak mengunci akun lama dari jalan memperbaiki kata sandinya', () => {
    expect(changePasswordBodySchema.safeParse({ currentPassword: 'lama', newPassword: 'kata sandi panjang' }).success).toBe(true);
  });

  it('tidak memangkas spasi di ujung kata sandi baru — itu bagian sah dari rahasianya', () => {
    const parsed = changePasswordBodySchema.safeParse({ currentPassword: 'x', newPassword: ' sepuluhhuruf ' });
    expect(parsed.success && parsed.data.newPassword).toBe(' sepuluhhuruf ');
  });

  it('menolak nama kosong dan merapikan yang berspasi', () => {
    expect(updateProfileBodySchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(updateProfileBodySchema.safeParse({ name: 'a'.repeat(121) }).success).toBe(false);
    const parsed = updateProfileBodySchema.safeParse({ name: '  Rara Dewi  ' });
    expect(parsed.success && parsed.data.name).toBe('Rara Dewi');
  });
});

describe('pipe validasi', () => {
  it('mengisi fieldErrors dengan nama field, bentuk yang dipakai form di web', () => {
    const pipe = new ZodValidationPipe(createGuestBodySchema);
    try {
      pipe.transform({ displayName: '', quota: 99 });
      expect.unreachable('harus melempar');
    } catch (error) {
      const body = (error as { getResponse(): { code: string; message: string; fieldErrors: Record<string, string[]> } }).getResponse();
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(body.fieldErrors).sort()).toEqual(['displayName', 'quota']);
      expect(body.message).toBe(body.fieldErrors.displayName?.[0]);
    }
  });

  it('meneruskan data yang sudah dirapikan, bukan body mentahnya', () => {
    const pipe = new ZodValidationPipe(createGuestBodySchema);
    expect(pipe.transform({ displayName: '  Rara  ', phone: ' 0812 ' })).toEqual({ displayName: 'Rara', phone: '0812' });
  });
});
