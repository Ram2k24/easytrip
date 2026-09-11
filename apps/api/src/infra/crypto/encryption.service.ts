import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Env } from '@easytrip/contracts';
import { ENV_TOKEN } from '../config/env.token.js';
import { Inject } from '@nestjs/common';

/**
 * AES-256-GCM encryption at rest (DB-04 / decision D-20).
 *
 * Used for values that must be *recovered*, not merely verified — today the TOTP
 * secret, which the server needs in plaintext to compute the expected code.
 *
 * Layout of the stored buffer: `iv (12) || authTag (16) || ciphertext`. GCM's
 * authentication tag means a tampered ciphertext fails to decrypt rather than
 * yielding garbage, so a modified row cannot silently produce a working secret.
 */
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(@Inject(ENV_TOKEN) env: Env) {
    const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      // Fail at construction, not on first use: a bad key must stop the boot.
      throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex characters)');
    }
    this.key = key;
  }

  encrypt(plaintext: string): Buffer {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]);
  }

  decrypt(payload: Buffer): string {
    if (payload.length <= IV_BYTES + TAG_BYTES) {
      throw new Error('Ciphertext is too short to be valid');
    }
    const iv = payload.subarray(0, IV_BYTES);
    const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
