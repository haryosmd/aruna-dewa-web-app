import { describe, expect, it } from 'vitest';

import { createDefaultDocument, type InvitationDocument } from '@aruna/contracts';

import { hasDesignChange } from '../../src/invitations/invitations.service';

/**
 * Kanvas bebas (fase 81) adalah desain: geseran, ukuran, putaran, ornamen per tempat, dan ornamen
 * tambahan ikut gerbang add-on `design`. `{}` ≡ absen dan urutan kunci tidak menyalakannya.
 */
const dengan = (kanvas: unknown): InvitationDocument => {
  const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
  const hero = doc.sections.find(section => section.type === 'hero')!;
  if (kanvas !== undefined) (hero.data as Record<string, unknown>).kanvas = kanvas;
  return doc;
};
const lama = dengan(undefined);

describe('gerbang kanvas', () => {
  it('menggerbangi geseran keping, ornamen per tempat, dan ornamen tambahan', () => {
    expect(hasDesignChange(lama, dengan({ keping: { 'o:corner:tl': { x: 4 } } }))).toBe(true);
    expect(hasDesignChange(lama, dengan({ keping: { 'o:corner:tl': { glyph: 'corner-kawung', putar: 90 } } }))).toBe(true);
    expect(hasDesignChange(lama, dengan({ tambahan: [{ id: 't-1', glyph: 'corner-kawung', x: 50, y: 20, lebar: 20 }] }))).toBe(true);
  });

  it('tidak menyala untuk kanvas kosong', () => {
    expect(hasDesignChange(lama, dengan({}))).toBe(false);
    expect(hasDesignChange(lama, dengan({ keping: {}, tambahan: [] }))).toBe(false);
    expect(hasDesignChange(dengan({ keping: { 'o:corner:tl': {} } }), lama)).toBe(false);
  });

  it('tidak peduli urutan kunci', () => {
    expect(hasDesignChange(
      dengan({ keping: { 'o:corner:tl': { x: 1, y: 2 }, 't:title': { skala: 1.2 } } }),
      dengan({ keping: { 't:title': { skala: 1.2 }, 'o:corner:tl': { y: 2, x: 1 } } }),
    )).toBe(false);
  });
});
