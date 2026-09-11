import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Hashing helpers (Arch §5.2, DB-04).
 *
 * Two distinct jobs live here and must not be confused:
 *
 *  - **High-entropy secrets** (refresh tokens, reset tokens, OTP codes) are hashed
 *    with SHA-256/HMAC before storage. A database dump cannot be replayed, because
 *    the raw value was never stored.
 *  - **Passwords** are *not* handled here — they go through Argon2id
 *    (`password.service.ts`). Fast hashing a password would be a vulnerability.
 */

/** SHA-256 hex digest of a high-entropy value. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Keyed hash for low-entropy values such as 6-digit OTP codes.
 *
 * A bare SHA-256 of a 6-digit code is brute-forceable offline in seconds (10^6
 * candidates). Keying it with a server-side secret means an attacker who obtains
 * the database but not the key still cannot recover the code.
 */
export function keyedHashHex(value: string, key: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

/**
 * Salted hash of a client IP.
 *
 * Raw IPs are personal data (DB-04), but the audit log and rate limiter need a
 * stable per-client key. A keyed hash gives that without storing the address.
 */
export function hashIp(ip: string | undefined, salt: string): string | null {
  if (ip === undefined || ip.length === 0) return null;
  return createHmac('sha256', salt).update(ip).digest('hex');
}

/**
 * Constant-time string comparison.
 *
 * Used for anything an attacker can probe repeatedly (OTP codes, TOTP codes,
 * token digests) so response timing does not leak how many leading characters
 * matched.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Lengths differ; still run a comparison so the branch itself is not a
    // timing oracle for equal-length candidates.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** SHA-256 of a JSON-serialisable value — for `audit_log.before_hash`/`after_hash`. */
export function hashState(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return sha256Hex(JSON.stringify(value));
}
