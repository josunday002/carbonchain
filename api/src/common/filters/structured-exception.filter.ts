import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Structured error response shape for API clients.
 *
 * Additive filter (not yet wired into main.ts / app.module.ts). Intended to
 * replace NestJS's default unstructured exception body so the frontend can
 * distinguish error kinds (e.g. "Invalid tonnes") and show localized,
 * context-specific messages instead of a generic 400 handler.
 *
 * To adopt: register globally, e.g. in main.ts:
 *   app.useGlobalFilters(new StructuredExceptionFilter());
 */
export interface StructuredErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

@Catch(HttpException)
export class StructuredExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const { code, message, details } = this.normalize(status, body);

    response.status(status).json({ code, message, details });
  }

  private normalize(
    status: number,
    body: string | object,
  ): StructuredErrorResponse {
    const code = HttpStatus[status] ?? 'ERROR';

    if (typeof body === 'string') {
      return { code, message: body };
    }

    const obj = body as Record<string, unknown>;
    const message = Array.isArray(obj.message)
      ? obj.message.join('; ')
      : ((obj.message as string) ?? 'An error occurred');

    const details = { ...obj };
    delete details.message;
    delete details.statusCode;
    delete details.error;

    return {
      code: typeof obj.error === 'string' ? obj.error : code,
      message,
      details: Object.keys(details).length ? details : undefined,
    };
  }
}
