import { describe, expect, it } from 'vitest';

import { RefreshTokenReuseError, rotateRefreshSession, type RefreshSessionRecord } from '../../src/identity/session-rotation.js';

describe('refresh session rotation', () => {
  it('revokes every session for a user when an already rotated token is replayed', () => {
    const sessions: RefreshSessionRecord[] = [
      { id: 'session-a', userId: 'user-1', revokedAt: null, tokenHash: 'current' },
      { id: 'session-b', userId: 'user-1', revokedAt: null, tokenHash: 'other-device' },
    ];

    expect(() => rotateRefreshSession(sessions, 'session-a', 'old-token', () => false)).toThrow(
      RefreshTokenReuseError,
    );
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
  });

  it('rotates only the matching active session', () => {
    const sessions: RefreshSessionRecord[] = [
      { id: 'session-a', userId: 'user-1', revokedAt: null, tokenHash: 'current' },
      { id: 'session-b', userId: 'user-1', revokedAt: null, tokenHash: 'other-device' },
    ];

    rotateRefreshSession(sessions, 'session-a', 'current-token', (value, hash) => value === 'current-token' && hash === 'current');

    expect(sessions[0]?.revokedAt).toBeInstanceOf(Date);
    expect(sessions[1]?.revokedAt).toBeNull();
  });
});
