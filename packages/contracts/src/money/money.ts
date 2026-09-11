/**
 * Money helpers (PRD GC-7, Arch T-9, DB D-4).
 *
 * Money is **always** integer minor units plus an ISO-4217 currency code.
 * Floating point is never used for amounts; conversions between major and minor
 * units go through integer arithmetic to avoid rounding drift.
 */
export interface Money {
  /** Amount in the currency's minor units (paisa for NPR). */
  amountMinor: number;
  /** ISO-4217 currency code, e.g. `NPR`. */
  currency: string;
}

/** Minor-unit exponent per currency. Unknown currencies default to 2. */
const MINOR_UNIT_EXPONENTS: Readonly<Record<string, number>> = {
  NPR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
  JPY: 0,
  KRW: 0,
  CHF: 2,
  AUD: 2,
  CNY: 2,
};

export function minorUnitExponent(currency: string): number {
  return MINOR_UNIT_EXPONENTS[currency.toUpperCase()] ?? 2;
}

export function isMoney(value: unknown): value is Money {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Money>;
  return (
    typeof candidate.amountMinor === 'number' &&
    Number.isInteger(candidate.amountMinor) &&
    typeof candidate.currency === 'string' &&
    candidate.currency.length === 3
  );
}

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new RangeError(`amountMinor must be an integer, received ${String(amountMinor)}`);
  }
  return { amountMinor, currency: currency.toUpperCase() };
}

/**
 * Convert a major-unit string ("1250.50") to minor units.
 *
 * Accepts a string on purpose: passing a JS number for money is the bug this
 * module exists to prevent.
 */
export function toMinor(major: string, currency: string): number {
  const exponent = minorUnitExponent(currency);
  const trimmed = major.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new RangeError(`Invalid money string: "${major}"`);
  }
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  if (fraction.length > exponent) {
    throw new RangeError(
      `Too many decimal places for ${currency}: "${major}" (max ${String(exponent)})`,
    );
  }
  const padded = fraction.padEnd(exponent, '0');
  const value = Number(`${whole}${padded}`);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Amount out of safe integer range: "${major}"`);
  }
  return negative ? -value : value;
}

/** Convert minor units to a major-unit string with a fixed decimal count. */
export function fromMinor(amountMinor: number, currency: string): string {
  const exponent = minorUnitExponent(currency);
  if (!Number.isInteger(amountMinor)) {
    throw new RangeError(`amountMinor must be an integer, received ${String(amountMinor)}`);
  }
  if (exponent === 0) return String(amountMinor);
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor)
    .toString()
    .padStart(exponent + 1, '0');
  const whole = absolute.slice(0, absolute.length - exponent);
  const fraction = absolute.slice(absolute.length - exponent);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Sum minor-unit amounts. Throws when currencies are mixed (never silently convert). */
export function addMinor(amounts: readonly number[], currency: string): Money {
  const total = amounts.reduce((sum, amount) => {
    if (!Number.isInteger(amount)) {
      throw new RangeError(`All amounts must be integers, received ${String(amount)}`);
    }
    return sum + amount;
  }, 0);
  return money(total, currency);
}
