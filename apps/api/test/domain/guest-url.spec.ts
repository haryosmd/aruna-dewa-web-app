import { describe, expect, it } from 'vitest';

import { buildGuestUrl, normalizeDisplayName } from '../../src/guests/guest-url.js';

describe('guest URL domain rules', () => {
  it('preserves titles, punctuation and a literal plus in greeting links', () => {
    const displayName = normalizeDisplayName('  dr. Yosi Susanti, Sp.OG  ');

    expect(buildGuestUrl('https://aruna.test', 'fahrul-dan-chika', displayName)).toBe(
      'https://aruna.test/i/fahrul-dan-chika?to=dr.+Yosi+Susanti%2C+Sp.OG',
    );
    expect(buildGuestUrl('https://aruna.test', 'fahrul-dan-chika', 'A+B')).toBe(
      'https://aruna.test/i/fahrul-dan-chika?to=A%2BB',
    );
  });

  it('adds a personal token without using the greeting as identity', () => {
    expect(buildGuestUrl('https://aruna.test', 'fahrul-dan-chika', 'Yosi Susanti', 'guest-token')).toBe(
      'https://aruna.test/i/fahrul-dan-chika?to=Yosi+Susanti&g=guest-token',
    );
  });

  it('rejects blank and control-character names', () => {
    expect(() => normalizeDisplayName('   ')).toThrow();
    expect(() => normalizeDisplayName('Yosi\nSusanti')).toThrow();
  });
});
