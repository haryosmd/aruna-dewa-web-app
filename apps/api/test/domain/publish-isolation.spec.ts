import { describe, expect, it } from 'vitest';

import { publishDraft } from '../../src/invitations/publishing.js';

describe('published invitation isolation', () => {
  it('stores an immutable snapshot and does not expose later draft mutations', () => {
    const draft = { schemaVersion: 1, title: 'Aruna & Dewa', sections: [{ id: 'cover', enabled: true }] };
    const published = publishDraft(draft, 3, new Date('2026-09-11T00:00:00.000Z'));
    draft.sections[0]!.enabled = false;

    expect(published.document.sections[0]).toEqual({ id: 'cover', enabled: true });
    expect(published.revision).toBe(3);
  });
});
