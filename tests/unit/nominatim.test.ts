import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchNominatim,
  normalizeQuery,
  buildUserAgent,
  __resetRateLimit,
} from '@/lib/providers/nominatim';

beforeEach(() => __resetRateLimit());

describe('normalizeQuery', () => {
  it('lowercases, trims, collapses whitespace', () => {
    expect(normalizeQuery('  Lisbon,   Portugal  ')).toBe('lisbon, portugal');
  });
});

describe('buildUserAgent (PRD §FR-L4)', () => {
  it('includes contact when provided', () => {
    expect(buildUserAgent('ops@example.com')).toBe(
      'pvprospect/1.2 (Solar AI Solutions; contact: ops@example.com)',
    );
  });
  it('omits contact when missing', () => {
    expect(buildUserAgent(null)).toBe('pvprospect/1.2 (Solar AI Solutions)');
  });
});

describe('searchNominatim', () => {
  it('short-circuits when query is coordinates (no HTTP call)', async () => {
    const fetcher = vi.fn();
    const outcome = await searchNominatim(
      { query: '38.7223, -9.1393' },
      { fetcher: fetcher as unknown as typeof fetch, minIntervalMs: 0 },
    );
    expect(outcome.kind).toBe('coordinates');
    if (outcome.kind === 'coordinates') {
      expect(outcome.location.lat).toBe(38.7223);
      expect(outcome.location.source).toBe('manual_coordinates');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sets User-Agent and queries /search with required params', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              display_name: 'Lisbon, Portugal',
              lat: '38.7223',
              lon: '-9.1393',
              place_id: 1,
              osm_type: 'relation',
              osm_id: 5400890,
            },
          ]),
          { status: 200 },
        ),
    );

    const outcome = await searchNominatim(
      { query: 'Lisbon, Portugal' },
      { fetcher, contactEmail: 'ops@example.com', minIntervalMs: 0 },
    );

    expect(outcome.kind).toBe('results');
    if (outcome.kind !== 'results') return;
    expect(outcome.results).toHaveLength(1);
    expect(outcome.cached).toBe(false);

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/search?');
    expect(url).toContain('format=jsonv2');
    expect(url).toContain('addressdetails=1');
    expect(url).toContain('polygon_geojson=0');
    expect(url).toContain('email=ops%40example.com');
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toContain('pvprospect/1.2');
  });

  it('serves cached results without calling fetch', async () => {
    const cached = [
      { display_name: 'Cached', lat: '1', lon: '2' },
    ];
    const cache = {
      get: vi.fn().mockResolvedValue(cached),
      set: vi.fn(),
    };
    const fetcher = vi.fn();

    const outcome = await searchNominatim(
      { query: 'lisbon' },
      { fetcher: fetcher as unknown as typeof fetch, cache, minIntervalMs: 0 },
    );

    expect(outcome.kind).toBe('results');
    if (outcome.kind === 'results') expect(outcome.cached).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('writes through to cache on successful response', async () => {
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([{ display_name: 'Lisbon', lat: '38.7', lon: '-9.1' }]),
          { status: 200 },
        ),
    );
    await searchNominatim(
      { query: 'Lisbon' },
      { fetcher, cache, minIntervalMs: 0 },
    );
    expect(cache.set).toHaveBeenCalledOnce();
  });

  it('returns rate_limited on HTTP 429', async () => {
    const fetcher = vi.fn(async () => new Response('blocked', { status: 429 }));
    const outcome = await searchNominatim(
      { query: 'whatever' },
      { fetcher, minIntervalMs: 0 },
    );
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') expect(outcome.status).toBe('rate_limited');
  });

  it('throttles to 1 rps by default', async () => {
    let count = 0;
    const fetcher = vi.fn(async () => {
      count += 1;
      return new Response('[]', { status: 200 });
    });
    const start = Date.now();
    await searchNominatim({ query: 'a' }, { fetcher, minIntervalMs: 200 });
    await searchNominatim({ query: 'b' }, { fetcher, minIntervalMs: 200 });
    const elapsed = Date.now() - start;
    expect(count).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(190);
  });
});
