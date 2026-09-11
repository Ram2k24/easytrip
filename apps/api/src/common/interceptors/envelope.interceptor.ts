import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type ApiEnvelope } from '@easytrip/contracts';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful handler result in the success envelope (Arch §3.3):
 * `{ "data": … }`. List endpoints return `{ data, page }` from the handler itself.
 */
@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
