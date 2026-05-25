/**
 * Coordinate parsing/formatting per PRD §FR-L2 and §FR-L2.1.
 *
 * Hard rules from the spec:
 *   - Canonical display is `latitude.toFixed(6), longitude.toFixed(6)`.
 *   - Decimal separator is always `.`; the comma is the coordinate separator.
 *   - The parser must accept the canonical format AND simple decimal degrees
 *     separated by comma, semicolon, or whitespace.
 *   - No DMS, no maps URLs, no auto-swap. Return `null` when ambiguous.
 *   - Six decimals: parser normalises by clamping output to 6 decimals.
 */

export type Coordinates = { lat: number; lon: number };

const LAT_MIN = -90;
const LAT_MAX = 90;
const LON_MIN = -180;
const LON_MAX = 180;
const DECIMALS = 6;

const round6 = (n: number) => Number(n.toFixed(DECIMALS));

export function formatCoordinatePair(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new RangeError('Coordinates must be finite numbers');
  }
  if (lat < LAT_MIN || lat > LAT_MAX) {
    throw new RangeError(`Latitude out of range: ${lat}`);
  }
  if (lon < LON_MIN || lon > LON_MAX) {
    throw new RangeError(`Longitude out of range: ${lon}`);
  }
  return `${lat.toFixed(DECIMALS)}, ${lon.toFixed(DECIMALS)}`;
}

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

export function parseCoordinatePair(input: string): Coordinates | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Permitted separators are comma, semicolon, or whitespace.
  // Anything else (letters, slashes, parens, URL artefacts) is ambiguous.
  if (/[^\d\s,;.+\-]/.test(trimmed)) return null;

  const matches = trimmed.match(NUMBER_PATTERN);
  if (!matches || matches.length !== 2) return null;

  const lat = Number(matches[0]);
  const lon = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < LAT_MIN || lat > LAT_MAX) return null;
  if (lon < LON_MIN || lon > LON_MAX) return null;

  return { lat: round6(lat), lon: round6(lon) };
}

export function isValidLat(value: number): boolean {
  return Number.isFinite(value) && value >= LAT_MIN && value <= LAT_MAX;
}

export function isValidLon(value: number): boolean {
  return Number.isFinite(value) && value >= LON_MIN && value <= LON_MAX;
}
