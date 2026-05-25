/**
 * Nominatim geocoding adapter — PRD §FR-L3 / §FR-L4.
 *
 * Hard rules:
 *   - Backend-side only (User-Agent identifies pvprospect / Solar AI Solutions).
 *   - Max 1 request/second, server-wide (NOMINATIM_RATE_LIMIT_RPS overrides).
 *   - Cache successful query result lists (caller's responsibility — adapter
 *     accepts an optional KV-style cache).
 *   - Provider switchable via baseUrl.
 */

import { z } from 'zod';
import type { ProspectLocation } from '@/lib/schemas';
import { parseCoordinatePair } from '@/lib/coordinates';

const DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org';

const NominatimResultSchema = z.object({
  place_id: z.union([z.string(), z.number()]).optional(),
  osm_type: z.string().optional(),
  osm_id: z.union([z.string(), z.number()]).optional(),
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
  importance: z.number().optional(),
  boundingbox: z.array(z.string()).optional(),
  address: z
    .object({
      country_code: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
    })
    .partial()
    .optional(),
});

export type NominatimResult = z.infer<typeof NominatimResultSchema>;
const NominatimResponseSchema = z.array(NominatimResultSchema);

export type NominatimCache = {
  get(key: string): Promise<NominatimResult[] | null> | NominatimResult[] | null;
  set(key: string, value: NominatimResult[]): Promise<void> | void;
};

export type NominatimAdapterOptions = {
  baseUrl?: string;
  contactEmail?: string | null;
  /** Min interval (ms) between outbound requests. Default 1000 (1 rps). */
  minIntervalMs?: number;
  cache?: NominatimCache;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export type NominatimQuery = {
  query: string;
  acceptLanguage?: string;
  limit?: number;
};

let lastRequestAt = 0;

/** Test-only: reset the in-process rate-limit clock. */
export function __resetRateLimit() {
  lastRequestAt = 0;
}

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildUserAgent(contactEmail: string | null | undefined): string {
  const contact = contactEmail?.trim() ? `; contact: ${contactEmail.trim()}` : '';
  return `pvprospect/1.2 (Solar AI Solutions${contact})`;
}

export function nominatimResultToLocation(
  raw: NominatimResult,
  inputText: string,
): ProspectLocation {
  return {
    lat: Number(raw.lat),
    lon: Number(raw.lon),
    inputText,
    displayLabel: raw.display_name,
    source: 'nominatim_search',
    geocodingProvider: 'nominatim',
    geocodingPlaceId: raw.place_id ?? null,
    osmType: raw.osm_type ?? null,
    osmId: raw.osm_id ?? null,
  };
}

export type NominatimSearchOutcome =
  | { kind: 'coordinates'; location: ProspectLocation }
  | { kind: 'results'; results: NominatimResult[]; cached: boolean }
  | { kind: 'error'; status: 'failed' | 'rate_limited' | 'timeout'; message: string };

export async function searchNominatim(
  q: NominatimQuery,
  options: NominatimAdapterOptions = {},
): Promise<NominatimSearchOutcome> {
  // PRD: try coordinate parser before geocoding.
  const coords = parseCoordinatePair(q.query);
  if (coords) {
    return {
      kind: 'coordinates',
      location: {
        lat: coords.lat,
        lon: coords.lon,
        inputText: q.query.trim(),
        displayLabel: null,
        source: 'manual_coordinates',
        geocodingProvider: null,
        geocodingPlaceId: null,
        osmType: null,
        osmId: null,
      },
    };
  }

  const acceptLanguage = q.acceptLanguage ?? 'en';
  const limit = Math.min(Math.max(q.limit ?? 5, 1), 10);
  const cacheKey = `${normalizeQuery(q.query)}::${acceptLanguage}::${limit}`;

  if (options.cache) {
    const cached = await options.cache.get(cacheKey);
    if (cached) return { kind: 'results', results: cached, cached: true };
  }

  await throttle(options.minIntervalMs ?? 1000);

  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const doFetch = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  const params = new URLSearchParams({
    q: q.query,
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    'accept-language': acceptLanguage,
    polygon_geojson: '0',
    polygon_kml: '0',
    polygon_svg: '0',
    polygon_text: '0',
  });
  if (options.contactEmail) params.set('email', options.contactEmail);

  const url = `${baseUrl}/search?${params.toString()}`;
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': buildUserAgent(options.contactEmail),
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      return { kind: 'error', status: 'rate_limited', message: '429 Too Many Requests' };
    }
    if (!response.ok) {
      return { kind: 'error', status: 'failed', message: `HTTP ${response.status}` };
    }

    const json = await response.json();
    const parsed = NominatimResponseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'error',
        status: 'failed',
        message: `Unexpected Nominatim response: ${parsed.error.message.slice(0, 200)}`,
      };
    }

    if (options.cache && parsed.data.length > 0) {
      await options.cache.set(cacheKey, parsed.data);
    }

    return { kind: 'results', results: parsed.data, cached: false };
  } catch (err) {
    if (isAbortError(err)) {
      return {
        kind: 'error',
        status: 'timeout',
        message: `Nominatim request timed out after ${timeoutMs}ms`,
      };
    }
    return {
      kind: 'error',
      status: 'failed',
      message: err instanceof Error ? err.message : 'Unknown network error',
    };
  } finally {
    clearTimeout(handle);
  }
}

async function throttle(minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + minIntervalMs - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')
  );
}
