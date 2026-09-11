import { Injectable, type NestMiddleware } from '@nestjs/common';
import { REQUEST_ID_HEADER, resolveRequestId } from '../context/request-context.js';

export interface CorrelationRequest {
  headers: Record<string, string | string[] | undefined>;
  id?: string;
}

export interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

/**
 * Assigns a correlation id to every request **before** any other middleware, so
 * even early failures (oversized body, bad JSON) carry a `requestId` a support
 * engineer can look up (Phase 02 ER-01).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelationRequest, res: CorrelationResponse, next: () => void): void {
    const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
