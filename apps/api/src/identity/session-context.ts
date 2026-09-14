import type { Request } from 'express';
import type { SessionContext } from './auth.service.js';

/** Jejak perangkat penerbit sesi. Kolomnya sudah lama ada di skema tapi tak pernah diisi. */
export function sessionContext(request: Request): SessionContext {
  return { userAgent: request.header('user-agent') ?? null, ip: request.ip ?? null };
}
