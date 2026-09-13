import { describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@aruna/contracts';
import { publicDocument } from '../../src/invitations/document-validation.js';

describe('public invitation snapshots', () => {
  it('does not expose disabled sections or private events', () => {
    const document = createDefaultDocument('Aruna', 'Dewa');
    const story = document.sections.find((section) => section.type === 'story')!;
    story.enabled = false;
    const events = document.sections.find((section) => section.type === 'events')!;
    events.data.events = [{ id: 'public', public: true }, { id: 'private', public: false }];

    const result = publicDocument(document);

    expect(result.sections.some((section) => section.type === 'story')).toBe(false);
    expect((result.sections.find((section) => section.type === 'events')!.data.events as { id: string }[])).toEqual([{ id: 'public', public: true }]);
  });
});
