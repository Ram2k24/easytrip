import { Global, Module } from '@nestjs/common';
import { EnvelopeInterceptor } from './interceptors/envelope.interceptor.js';
import { CorrelationIdMiddleware } from './middleware/correlation.middleware.js';

/**
 * Cross-cutting providers (Arch §2.4 `common/`).
 *
 * Registered as providers so `buildApplication` resolves the *same* instances the
 * container uses, rather than constructing parallel objects that never receive DI.
 */
@Global()
@Module({
  providers: [EnvelopeInterceptor, CorrelationIdMiddleware],
  exports: [EnvelopeInterceptor, CorrelationIdMiddleware],
})
export class CoreModule {}
