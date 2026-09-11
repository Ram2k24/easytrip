/**
 * `@easytrip/contracts` — the shared kernel (Arch §21.3).
 *
 * Everything the API and the web app must agree on lives here: error catalog,
 * response envelopes, pagination, enums, money and identifiers. No framework
 * imports, no I/O.
 */
export * from './auth/index.js';
export * from './common/index.js';
export * from './env/index.js';
export * from './errors/index.js';
export * from './health/index.js';
export * from './http/index.js';
export * from './ids/index.js';
export * from './money/index.js';
export * from './rbac/index.js';
export * from './validation/index.js';
