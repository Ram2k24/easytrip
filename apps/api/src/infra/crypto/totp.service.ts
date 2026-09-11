import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { safeEqual } from './hashing.js';

/**
 * TOTP (RFC 6238) over HOTP (RFC 4226).
 *
 * Implemented directly on `node:crypto` rather than pulled from a dependency:
 * the algorithm is short, fully specified, and — importantly — verifiable against
 * the RFC's published test vectors, which the unit tests do. A library would make
 * "is this correct?" a matter of trust instead of a test.
 *
 * SHA-1 is the RFC's default and what every mainstream authenticator app expects;
 * it is used here as an HMAC (not for collision resistance) exactly as specified.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 encode, no padding. */
export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** RFC 4648 base32 decode. Tolerates lower case, spaces and `=` padding. */
export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export interface TotpOptions {
  /** Time step in seconds (RFC 6238 X). 30 is the near-universal default. */
  period: number;
  /** Code length (RFC 6238 digits). */
  digits: number;
  /** How many steps either side of "now" are accepted, for clock skew. */
  window: number;
}

export interface TotpVerifyResult {
  valid: boolean;
  /** Which step matched; negative = in the past, positive = in the future. */
  drift?: number;
}

/** HOTP (RFC 4226 §5.3): dynamic truncation of HMAC-SHA1(secret, counter). */
function hotp(secret: Buffer, counter: number, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  // RFC 4226 requires the counter as an 8-byte big-endian unsigned value.
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(counterBuffer).digest();

  // `readUInt8` / `readUInt32BE` throw on an out-of-range offset instead of
  // returning `undefined`, so the dynamic-truncation offsets are *validated*
  // rather than asserted. offset <= 15, so bytes 15..18 of a 20-byte SHA-1
  // digest are always in range.
  const offset = digest.readUInt8(digest.length - 1) & 0x0f;
  // Clearing the top bit is equivalent to masking the first byte with 0x7f.
  const binary = digest.readUInt32BE(offset) & 0x7f_ff_ff_ff;

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

@Injectable()
export class TotpService {
  /** A new enrollment secret: 20 random bytes, base32-encoded (160 bits). */
  generateSecret(bytes = 20): string {
    return base32Encode(randomBytes(bytes));
  }

  /** The code for a given instant. Exposed for tests and for enrollment previews. */
  codeAt(secretBase32: string, timeSeconds: number, options: TotpOptions): string {
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(timeSeconds / options.period);
    return hotp(secret, counter, options.digits);
  }

  currentCode(secretBase32: string, options: TotpOptions): string {
    return this.codeAt(secretBase32, Math.floor(Date.now() / 1000), options);
  }

  /**
   * Verify a submitted code.
   *
   * Accepts `window` steps either side of the current one (RFC 6238 recommends
   * transmitting at most one future step). Every candidate is compared in
   * constant time, and all candidates are checked even after a match so the
   * number of comparisons does not depend on where the match landed.
   */
  verify(
    secretBase32: string,
    submitted: string,
    options: TotpOptions,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): TotpVerifyResult {
    let secret: Buffer;
    try {
      secret = base32Decode(secretBase32);
    } catch {
      return { valid: false };
    }

    const currentCounter = Math.floor(nowSeconds / options.period);
    let matched: number | undefined;

    for (let drift = -options.window; drift <= options.window; drift += 1) {
      const counter = currentCounter + drift;
      if (counter < 0) continue;
      const expected = hotp(secret, counter, options.digits);
      // safeEqual short-circuits nothing about *which* step matched.
      if (safeEqual(expected, submitted)) matched = drift;
    }

    return matched === undefined ? { valid: false } : { valid: true, drift: matched };
  }

  /**
   * `otpauth://` URI for authenticator apps (Key URI Format).
   *
   * The label is percent-encoded because issuer and account commonly contain
   * spaces and `@`.
   */
  keyUri(issuer: string, account: string, secretBase32: string, options: TotpOptions): string {
    const label = `${issuer}:${account}`;
    const params = new URLSearchParams({
      secret: secretBase32,
      issuer,
      algorithm: 'SHA1',
      digits: String(options.digits),
      period: String(options.period),
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }
}

/**
 * Single-use replay guard for TOTP.
 *
 * RFC 6238 §5.2: a code must not be accepted twice. Because a code stays valid for
 * its whole period (plus the skew window), remembering the last accepted counter
 * per enrollment closes the replay window without any storage beyond the session.
 */
@Injectable()
export class TotpReplayGuard {
  private readonly lastAccepted = new Map<string, number>();

  /** True when this counter has not already been used for this key. */
  claim(key: string, counter: number): boolean {
    const previous = this.lastAccepted.get(key);
    if (previous !== undefined && counter <= previous) return false;
    this.lastAccepted.set(key, counter);
    return true;
  }

  /** Counter for a timestamp — used with `claim`. */
  counterFor(nowSeconds: number, period: number): number {
    return Math.floor(nowSeconds / period);
  }

  clear(): void {
    this.lastAccepted.clear();
  }
}
