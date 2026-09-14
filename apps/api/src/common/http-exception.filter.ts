import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Satu-satunya tempat galat berubah jadi jawaban HTTP. Karena `@Catch()`-nya menangkap
 * semuanya, logging bawaan Nest tidak pernah kebagian — jadi tanpa `Logger` di sini, tiap
 * 500 hilang tanpa jejak sama sekali. Itu berlaku selama ini, termasuk untuk setiap
 * `TypeError` yang lahir dari body tak tervalidasi.
 */

/** Field galat yang boleh ikut ke klien. `current` dipakai UI konflik revisi. */
interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: unknown;
  /** Nilai terkini saat revisi bentrok; service sudah membayar satu kueri untuk membangunnya. */
  current?: unknown;
  /** Berapa lama lagi sebuah permintaan yang kena batas laju boleh diulang. */
  retryAfterSeconds?: number;
}

/**
 * Header `x-request-id` dari luar hanya diterima kalau bentuknya masuk akal. Sebelumnya ia
 * dipantulkan apa adanya: nilai bermuatan CRLF membuat `setHeader` melempar **di dalam
 * filter ini**, tempat tidak ada lagi yang menangkap.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function safeRequestId(header: string | undefined): string {
  return header && SAFE_REQUEST_ID.test(header) ? header : randomUUID();
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = safeRequestId(request.header('x-request-id'));
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof payload === 'object' && payload !== null ? payload as ApiErrorBody : { message: typeof payload === 'string' ? payload : undefined };
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.originalUrl} → ${status} [${requestId}]`, exception instanceof Error ? exception.stack : String(exception));
    }
    response.status(status).setHeader('x-request-id', requestId).json({
      code: body.code ?? `HTTP_${status}`,
      message: body.message ?? (status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'Terjadi kesalahan pada server' : 'Permintaan tidak dapat diproses'),
      ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
      ...(body.current !== undefined ? { current: body.current } : {}),
      ...(body.retryAfterSeconds !== undefined ? { retryAfterSeconds: body.retryAfterSeconds } : {}),
      requestId,
    });
  }
}
