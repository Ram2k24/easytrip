import { describe, expect, it } from 'vitest';
import {
  addMinor,
  fromMinor,
  isMoney,
  minorUnitExponent,
  money,
  toMinor,
} from '../src/money/money.js';

describe('money (GC-7 / T-9: integer minor units)', () => {
  it('converts major-unit strings to minor units without float drift', () => {
    expect(toMinor('1250.50', 'NPR')).toBe(125050);
    expect(toMinor('0.07', 'NPR')).toBe(7);
    expect(toMinor('10000', 'NPR')).toBe(1000000);
    expect(toMinor('-25.10', 'NPR')).toBe(-2510);
  });

  it('honours per-currency minor unit exponents', () => {
    expect(minorUnitExponent('NPR')).toBe(2);
    expect(minorUnitExponent('JPY')).toBe(0);
    expect(toMinor('1200', 'JPY')).toBe(1200);
  });

  it('rejects sub-minor precision instead of silently rounding', () => {
    expect(() => toMinor('10.005', 'NPR')).toThrow(RangeError);
    expect(() => toMinor('abc', 'NPR')).toThrow(RangeError);
  });

  it('round-trips minor units back to major-unit strings', () => {
    expect(fromMinor(125050, 'NPR')).toBe('1250.50');
    expect(fromMinor(7, 'NPR')).toBe('0.07');
    expect(fromMinor(-2510, 'NPR')).toBe('-25.10');
    expect(fromMinor(1200, 'JPY')).toBe('1200');
  });

  it('refuses non-integer minor amounts', () => {
    expect(() => money(10.5, 'NPR')).toThrow(RangeError);
    expect(() => addMinor([10, 1.5], 'NPR')).toThrow(RangeError);
  });

  it('sums amounts and normalises the currency code', () => {
    expect(addMinor([100, 250, 3], 'npr')).toEqual({ amountMinor: 353, currency: 'NPR' });
  });

  it('type-guards money values', () => {
    expect(isMoney({ amountMinor: 10, currency: 'NPR' })).toBe(true);
    expect(isMoney({ amountMinor: 10.5, currency: 'NPR' })).toBe(false);
    expect(isMoney({ amountMinor: 10, currency: 'NPRR' })).toBe(false);
    expect(isMoney(null)).toBe(false);
  });
});
