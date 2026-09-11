import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/** Redis module (Arch §11). Global: rate limiting and caching are cross-cutting. */
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
