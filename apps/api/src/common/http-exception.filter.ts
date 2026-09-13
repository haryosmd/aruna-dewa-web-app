import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = request.header('x-request-id') ?? randomUUID();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof payload === 'object' && payload !== null ? payload as { code?: string; message?: string; fieldErrors?: unknown } : { message: typeof payload === 'string' ? payload : undefined };
    response.status(status).setHeader('x-request-id', requestId).json({ code: body.code ?? `HTTP_${status}`, message: body.message ?? (status === 500 ? 'Terjadi kesalahan pada server' : 'Permintaan tidak dapat diproses'), ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}), requestId });
  }
}
