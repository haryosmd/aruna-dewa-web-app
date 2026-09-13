import { describe, expect, it } from 'vitest';
import { mediaCachePolicy } from '../../src/media/media-cache-policy.js';

describe('media cache policy', () => {
  it('marks a member-only draft fallback private and varies by cookie', () => {
    expect(mediaCachePolicy(false)).toEqual({ cacheControl: 'private, no-store', vary: 'Cookie' });
  });

  it('allows a referenced published asset to be cached publicly', () => {
    expect(mediaCachePolicy(true)).toEqual({ cacheControl: 'public, max-age=3600' });
  });
});
