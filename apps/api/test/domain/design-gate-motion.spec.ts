import { describe, expect, it } from 'vitest';

import { createDefaultDocument, type InvitationDocument } from '@aruna/contracts';

import { hasDesignChange } from '../../src/invitations/invitations.service';

/** `tokens.motion` (fase 69) ikut gerbang `design` lewat `tokens`; `{}` dan urutan kunci tidak menyalakannya. */
const lama = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
const dengan = (motion: InvitationDocument['tokens']['motion']): InvitationDocument => {
  const doc = createDefaultDocument('Aruna', 'Dewa', 'aruna-bloom');
  if (motion) doc.tokens.motion = motion;
  return doc;
};

describe('gerbang gerak', () => {
  it('menggerbangi tempo amplop dan gaya masuk', () => {
    expect(hasDesignChange(lama, dengan({ amplop: 'pelan' }))).toBe(true);
    expect(hasDesignChange(lama, dengan({ masuk: 'iris' }))).toBe(true);
  });

  it('tidak menyala untuk motion kosong', () => {
    expect(hasDesignChange(lama, dengan({}))).toBe(false);
    expect(hasDesignChange(dengan({}), lama)).toBe(false);
  });

  it('tidak peduli urutan kunci di dalam motion', () => {
    expect(hasDesignChange(dengan({ amplop: 'pelan', masuk: 'iris' }), dengan({ masuk: 'iris', amplop: 'pelan' }))).toBe(false);
  });
});
