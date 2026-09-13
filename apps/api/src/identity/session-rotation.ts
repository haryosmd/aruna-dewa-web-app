export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  revokedAt: Date | null;
}

export class RefreshTokenReuseError extends Error {
  constructor() {
    super('Refresh token sudah digunakan atau tidak valid');
  }
}

export function rotateRefreshSession(
  sessions: RefreshSessionRecord[],
  sessionId: string,
  suppliedToken: string,
  verify: (value: string, hash: string) => boolean,
): void {
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (!session || session.revokedAt || !verify(suppliedToken, session.tokenHash)) {
    const userId = session?.userId;
    if (userId) {
      const revokedAt = new Date();
      for (const candidate of sessions) {
        if (candidate.userId === userId) candidate.revokedAt = revokedAt;
      }
    }
    throw new RefreshTokenReuseError();
  }
  session.revokedAt = new Date();
}
