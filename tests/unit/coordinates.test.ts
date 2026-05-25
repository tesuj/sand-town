import { describe, it, expect } from 'vitest';
import {
  formatCoordinatePair,
  parseCoordinatePair,
  isValidLat,
  isValidLon,
} from '@/lib/coordinates';

describe('formatCoordinatePair', () => {
  it('canonical 6-decimal output for Kyiv-ish coordinates', () => {
    expect(formatCoordinatePair(50.2282322739, 29.4521353011)).toBe('50.228232, 29.452135');
  });

  it('canonical 6-decimal output for negative Sydney-ish coordinates', () => {
    expect(formatCoordinatePair(-33.86882, 151.20929)).toBe('-33.868820, 151.209290');
  });

  it('rejects out-of-range latitude', () => {
    expect(() => formatCoordinatePair(91, 0)).toThrow(RangeError);
  });

  it('rejects out-of-range longitude', () => {
    expect(() => formatCoordinatePair(0, -181)).toThrow(RangeError);
  });

  it('rejects NaN', () => {
    expect(() => formatCoordinatePair(NaN, 0)).toThrow(RangeError);
  });
});

describe('parseCoordinatePair — PRD §FR-L2.1 required regressions', () => {
  it('round-trips canonical pair (Kyiv)', () => {
    const formatted = formatCoordinatePair(50.2282322739, 29.4521353011);
    expect(parseCoordinatePair(formatted)).toEqual({ lat: 50.228232, lon: 29.452135 });
  });

  it('round-trips canonical pair (Sydney, negative latitude)', () => {
    const formatted = formatCoordinatePair(-33.86882, 151.20929);
    expect(parseCoordinatePair(formatted)).toEqual({ lat: -33.86882, lon: 151.20929 });
  });

  it('accepts whitespace-separated decimals (Lisbon)', () => {
    expect(parseCoordinatePair('38.7223 -9.1393')).toEqual({ lat: 38.7223, lon: -9.1393 });
  });

  it('accepts semicolon-separated decimals (Lisbon)', () => {
    expect(parseCoordinatePair('38.7223; -9.1393')).toEqual({ lat: 38.7223, lon: -9.1393 });
  });

  it('does NOT auto-swap — treats "29.452135, 50.228232" as lat,lon literally', () => {
    expect(parseCoordinatePair('29.452135, 50.228232')).toEqual({ lat: 29.452135, lon: 50.228232 });
  });
});

describe('parseCoordinatePair — null returns for ambiguous/invalid input', () => {
  it('returns null for empty string', () => {
    expect(parseCoordinatePair('')).toBeNull();
    expect(parseCoordinatePair('   ')).toBeNull();
  });

  it('returns null for non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(parseCoordinatePair(undefined)).toBeNull();
    // @ts-expect-error testing runtime guard
    expect(parseCoordinatePair(null)).toBeNull();
    // @ts-expect-error testing runtime guard
    expect(parseCoordinatePair(42)).toBeNull();
  });

  it('returns null for free-text addresses (contains letters)', () => {
    expect(parseCoordinatePair('Lisbon, Portugal')).toBeNull();
  });

  it('returns null for maps URLs', () => {
    expect(parseCoordinatePair('https://maps.example.com/?q=38.7,-9.1')).toBeNull();
  });

  it('returns null for DMS-like input', () => {
    expect(parseCoordinatePair('50°13\'42"N 29°27\'07"E')).toBeNull();
  });

  it('returns null for single number', () => {
    expect(parseCoordinatePair('50.2282322739')).toBeNull();
  });

  it('returns null for more than two numbers', () => {
    expect(parseCoordinatePair('1.0, 2.0, 3.0')).toBeNull();
  });

  it('returns null when latitude is out of range', () => {
    expect(parseCoordinatePair('95, 10')).toBeNull();
  });

  it('returns null when longitude is out of range', () => {
    expect(parseCoordinatePair('10, 200')).toBeNull();
  });

  it('clamps parsed precision to 6 decimals (no spurious extra precision)', () => {
    expect(parseCoordinatePair('50.2282322739, 29.4521353011')).toEqual({
      lat: 50.228232,
      lon: 29.452135,
    });
  });
});

describe('range guards', () => {
  it('isValidLat boundaries', () => {
    expect(isValidLat(-90)).toBe(true);
    expect(isValidLat(90)).toBe(true);
    expect(isValidLat(90.0001)).toBe(false);
    expect(isValidLat(Number.NaN)).toBe(false);
  });
  it('isValidLon boundaries', () => {
    expect(isValidLon(-180)).toBe(true);
    expect(isValidLon(180)).toBe(true);
    expect(isValidLon(180.0001)).toBe(false);
  });
});
