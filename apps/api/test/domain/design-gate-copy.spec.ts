import { describe, expect, it } from 'vitest';

import { createLegacyDocument, type InvitationDocument } from '@aruna/contracts';

import { hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * Kata-kata (fase 69) ikut gerbang `design` — keputusan pemilik. Yang dijaga di sini sama dengan
 * `design-gate-ornament.spec.ts`: perubahan sungguhan menyala, dan bentuk-bentuk "tidak ada
 * perubahan" (absen, `{}`, urutan kunci) tidak pernah menyala sendiri.
 */
// `copy` hanya ada di dokumen v1; v2 menaruh kata-kata di `data` tiap bagian dan tidak menggerbanginya.
const lama = createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom');
const dengan = (copy: InvitationDocument['copy']): InvitationDocument => ({ ...createLegacyDocument('Aruna', 'Dewa', 'aruna-bloom'), copy });

describe('gerbang kata-kata', () => {
  it('menggerbangi kalimat yang ditulis ulang', () => {
    expect(hasDesignChange(lama, dengan({ 'gate.open': 'Buka' }))).toBe(true);
  });

  it('tidak menyala untuk copy kosong atau absen', () => {
    expect(hasDesignChange(lama, dengan({}))).toBe(false);
    expect(hasDesignChange(lama, dengan(undefined))).toBe(false);
    expect(hasDesignChange(dengan({}), lama)).toBe(false);
  });

  it('tidak peduli urutan kunci', () => {
    const a = dengan({ 'gate.open': 'Buka', 'rsvp.yes': 'Datang' });
    const b = dengan({ 'rsvp.yes': 'Datang', 'gate.open': 'Buka' });
    expect(hasDesignChange(a, b)).toBe(false);
  });

  it('mengembalikan kalimat ke bawaan tetap digerbangi — itu juga perubahan desain', () => {
    expect(hasDesignChange(dengan({ 'gate.open': 'Buka' }), lama)).toBe(true);
  });
});
