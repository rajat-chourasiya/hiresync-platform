import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Decimal } from '@prisma/client/runtime/library';

const SENSITIVE_FIELDS = ['passwordHash', 'refreshTokenHash', 'otpHash', 'tokenHash'];

function sanitize(data: unknown): unknown {
  if (data instanceof Date) return data;
  if (data instanceof Decimal) return Number(data);
  if (Array.isArray(data)) return data.map(sanitize);
  if (data && typeof data === 'object') {
    const clone: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const field of SENSITIVE_FIELDS) delete clone[field];
    for (const key in clone) clone[key] = sanitize(clone[key]);
    return clone;
  }
  return data;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => sanitize(data)));
  }
}