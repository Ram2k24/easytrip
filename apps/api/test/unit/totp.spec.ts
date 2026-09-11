import {
  base32Decode,
  base32Encode,
  TotpReplayGuard,
  TotpService,
} from '../../src/infra/crypto/totp.service';

/**
 * TOTP correctness is pinned to RFC 6238 Appendix B.
 *
 * If the implementation ever drifts (wrong truncation offset, wrong endianness,
 * wrong modulus) these vectors fail, which matters: authenticator apps compute the
 * same values independently, so a subtle bug would lock every admin out rather
 * than fail a test in isolation.
 */
describe('TOTP (RFC 6238)', () => {
  const service = new TotpService();
  // RFC 6238's SHA1 test secret is the ASCII string "12345678901234567890".
  const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
  const options = { period: 30, digits: 8, window: 1 };

  describe('RFC 6238 Appendix B vectors (SHA1, 8 digits)', () => {
    const vectors: [number, string][] = [
      [59, '94287082'],
      // Verified against rfc-editor.org/rfc/rfc6238 Appendix B, Table 1.
      [1_111_111_109, '07081804'],
      [1_111_111_111, '14050471'],
      [1_234_567_890, '89005924'],
      [2_000_000_000, '69279037'],
      [20_000_000_000, '65353130'],
    ];

    it.each(vectors)('T=%i -> %s', (time, expected) => {
      expect(service.codeAt(RFC_SECRET, time, options)).toBe(expected);
    });

    it('accepts each vector when verified at its own instant', () => {
      for (const [time, expected] of vectors) {
        expect(service.verify(RFC_SECRET, expected, options, time)).toEqual({
          valid: true,
          drift: 0,
        });
      }
    });
  });

  describe('RFC 4226 Appendix D HOTP-derived vectors', () => {
    // RFC 4226 §D uses the same secret with 6 digits and a counter (not a time).
    // TOTP with period=1 makes the counter equal the timestamp, reproducing them.
    const six = { period: 1, digits: 6, window: 0 };
    const expected = [
      '755224',
      '287082',
      '359152',
      '969429',
      '338314',
      '254676',
      '287922',
      '162583',
      '399871',
      '520489',
    ];

    it.each(expected.map((code, counter) => [counter, code]))(
      'counter %i -> %s',
      (counter, code) => {
        expect(service.codeAt(RFC_SECRET, counter, six)).toBe(code);
      },
    );
  });

  describe('base32 (RFC 4648)', () => {
    it('round-trips arbitrary bytes', () => {
      for (const text of [
        '',
        'f',
        'fo',
        'foo',
        'foob',
        'fooba',
        'foobar',
        '12345678901234567890',
      ]) {
        const encoded = base32Encode(Buffer.from(text, 'utf8'));
        expect(Buffer.from(base32Decode(encoded)).toString('utf8')).toBe(text);
      }
    });

    it('matches the RFC 4648 reference encoding of "foobar"', () => {
      expect(base32Encode(Buffer.from('foobar', 'utf8'))).toBe('MZXW6YTBOI');
    });

    it('accepts lower case and padding on decode', () => {
      expect(base32Decode('mzxw6ytboi======').toString('utf8')).toBe('foobar');
    });

    it('rejects characters outside the alphabet', () => {
      expect(() => base32Decode('MZXW6YTBOI1')).toThrow();
    });
  });

  describe('verification window (RFC 6238 §5.2 clock skew)', () => {
    const at = 1_234_567_890;
    const current = service.codeAt(RFC_SECRET, at, options);

    it('accepts the code from the previous step', () => {
      const previous = service.codeAt(RFC_SECRET, at - 30, options);
      expect(service.verify(RFC_SECRET, previous, options, at)).toEqual({ valid: true, drift: -1 });
    });

    it('accepts the code from the next step', () => {
      const next = service.codeAt(RFC_SECRET, at + 30, options);
      expect(service.verify(RFC_SECRET, next, options, at)).toEqual({ valid: true, drift: 1 });
    });

    it('rejects a code two steps away', () => {
      const far = service.codeAt(RFC_SECRET, at + 90, options);
      expect(service.verify(RFC_SECRET, far, options, at).valid).toBe(false);
    });

    it('rejects a wrong code of the right length', () => {
      const wrong = current === '00000000' ? '00000001' : '00000000';
      expect(service.verify(RFC_SECRET, wrong, options, at).valid).toBe(false);
    });

    it('rejects a code of the wrong length', () => {
      expect(service.verify(RFC_SECRET, '1234567', options, at).valid).toBe(false);
    });

    it('rejects a malformed secret instead of throwing', () => {
      expect(service.verify('not!base32', current, options, at).valid).toBe(false);
    });
  });

  describe('secret generation', () => {
    it('produces 160 bits of entropy encoded as 32 base32 characters', () => {
      const secret = service.generateSecret();
      expect(secret).toHaveLength(32);
      expect(base32Decode(secret)).toHaveLength(20);
    });

    it('produces distinct secrets', () => {
      const seen = new Set(Array.from({ length: 50 }, () => service.generateSecret()));
      expect(seen.size).toBe(50);
    });
  });

  describe('key URI', () => {
    it('produces an otpauth URI the authenticator apps expect', () => {
      const uri = service.keyUri('Easy Trip Nepal', 'ops@easytrip.com.np', RFC_SECRET, options);
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain('Easy%20Trip%20Nepal%3Aops%40easytrip.com.np');
      expect(uri).toContain('secret=');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=8');
      expect(uri).toContain('period=30');
    });
  });
});

describe('TotpReplayGuard (RFC 6238 §5.2 — a code must not be accepted twice)', () => {
  it('accepts a counter once and rejects a repeat', () => {
    const guard = new TotpReplayGuard();
    expect(guard.claim('user-1', 100)).toBe(true);
    expect(guard.claim('user-1', 100)).toBe(false);
  });

  it('rejects an older counter after a newer one was accepted', () => {
    const guard = new TotpReplayGuard();
    expect(guard.claim('user-1', 100)).toBe(true);
    expect(guard.claim('user-1', 99)).toBe(false);
  });

  it('tracks keys independently', () => {
    const guard = new TotpReplayGuard();
    expect(guard.claim('user-1', 100)).toBe(true);
    expect(guard.claim('user-2', 100)).toBe(true);
  });

  it('derives the counter the same way the service does', () => {
    const guard = new TotpReplayGuard();
    expect(guard.counterFor(1_234_567_890, 30)).toBe(Math.floor(1_234_567_890 / 30));
  });
});
