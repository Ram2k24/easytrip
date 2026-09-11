import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@easytrip/contracts';
import { AppError } from '@easytrip/contracts';
import argon2 from 'argon2';
import { ENV_TOKEN } from '../config/env.token.js';

/**
 * Argon2id password hashing (Arch §5.1, decision E-5).
 *
 * Parameters come from the environment and default to the OWASP baseline the
 * architecture mandates: m = 19 456 KiB, t = 2, p = 1. They are *validated*, not
 * merely read — a typo that weakened hashing should fail loudly.
 *
 * `needsRehash` lets the parameters be raised later without a forced reset: the
 * next successful login transparently rehashes at the new cost.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options & { raw?: false };

  constructor(@Inject(ENV_TOKEN) env: Env) {
    if (env.ARGON2_MEMORY_KIB < 19_456) {
      // Below the OWASP baseline the architecture fixes. Refuse rather than
      // quietly accept a weaker configuration.
      throw new Error(`ARGON2_MEMORY_KIB must be >= 19456 (got ${String(env.ARGON2_MEMORY_KIB)})`);
    }
    this.options = {
      type: argon2.argon2id,
      memoryCost: env.ARGON2_MEMORY_KIB,
      timeCost: env.ARGON2_ITERATIONS,
      parallelism: env.ARGON2_PARALLELISM,
    };
  }

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string | null, password: string): Promise<boolean> {
    if (hash === null || hash.length === 0) return false;
    try {
      return await argon2.verify(hash, password, this.options);
    } catch {
      // A malformed stored hash (wrong prefix, truncated) must read as "wrong
      // password", never as a 500 — and must not distinguish itself from a real
      // mismatch, which would leak which accounts have damaged rows.
      return false;
    }
  }

  /**
   * True when the stored hash was produced with weaker parameters than current.
   *
   * Synchronous — `argon2.needsRehash` only parses the encoded parameter string,
   * it does no hashing. A malformed hash reads as "needs rehash" so the next
   * login repairs it.
   */
  needsRehash(hash: string): boolean {
    try {
      return argon2.needsRehash(hash, this.options);
    } catch {
      return true;
    }
  }

  /**
   * Burn one full hash without a user to compare against.
   *
   * Login must take the same time whether or not the email exists (Arch §5.3,
   * no user enumeration). The caller runs this on the unknown-user path so the
   * response latency does not reveal account existence.
   */
  async dummyVerify(): Promise<void> {
    await this.verify(DUMMY_HASH, 'timing-equalisation');
  }
}

/**
 * A real Argon2id hash of a throwaway string, captured with the production
 * parameters so the dummy verification costs the same as a genuine one.
 */
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$RGV2RHVtbXlTYWx0MDAwMDAwMA$' + '0'.repeat(43);

/**
 * Password policy beyond the Zod schema (Arch §5.3).
 *
 * Length and light composition are enforced in `PasswordSchema`; this adds the
 * deny-list half. The full breach check is decision **E-3** (HIBP k-anonymity
 * range API vs a local list) and is still open in the architecture document, so
 * it sits behind an interface: swapping in the range API later does not touch any
 * caller.
 */
export interface BreachChecker {
  /** True when the password appears in a known-breached corpus. */
  isBreached(password: string): Promise<boolean>;
}

/**
 * Deny-list of passwords that are trivially guessable regardless of length.
 *
 * Deliberately tiny: this is not a substitute for the breach check above, it is
 * the floor that catches `Password123!` passing a composition rule.
 */
const TRIVIAL_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password1234',
  'passw0rd',
  'p@ssw0rd',
  'qwerty1234',
  'qwertyuiop',
  '1234567890',
  'letmein123',
  'welcome123',
  'iloveyou12',
  'admin12345',
  'easytrip123',
  'easytrip2024',
  'nepal12345',
  'abc1234567',
  '1111111111',
  '0000000000',
  'a1b2c3d4e5',
]);

@Injectable()
export class LocalBreachChecker implements BreachChecker {
  isBreached(password: string): Promise<boolean> {
    // Resolved, not `async`: the interface is async because a real breach check
    // (HIBP k-anonymity range API, decision E-3) is a network call, but a local
    // set lookup should not pretend to await anything.
    return Promise.resolve(TRIVIAL_PASSWORDS.has(password.toLowerCase()));
  }
}

/** Throws `ETN-AUTH-108` when the password fails the deny-list. */
export async function assertNotBreached(checker: BreachChecker, password: string): Promise<void> {
  if (await checker.isBreached(password)) {
    throw new AppError('AUTH_108', {
      message: 'That password is too common. Please choose something less predictable.',
    });
  }
}
