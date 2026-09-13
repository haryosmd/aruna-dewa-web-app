import { describe, expect, it } from 'vitest';

import { canEditDesign } from '@aruna/contracts';

describe('design entitlement', () => {
  it('locks the palette, font, and section order when nothing is granted', () => {
    expect(canEditDesign({ features: [] })).toBe(false);
  });

  it('stays locked when the invitation only owns other premium features', () => {
    expect(canEditDesign({ features: ['story', 'gift', 'video'] })).toBe(false);
  });

  it('unlocks on the design feature itself, however it was bought', () => {
    expect(canEditDesign({ features: ['design'] })).toBe(true);
    expect(canEditDesign({ features: ['story', 'design'] })).toBe(true);
  });

  it('lets an operator edit a design nobody paid for', () => {
    expect(canEditDesign({ isOperator: true, features: [] })).toBe(true);
  });
});
