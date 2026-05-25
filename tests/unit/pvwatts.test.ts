import { describe, it, expect, vi } from 'vitest';
import { fetchPvwattsEstimate } from '@/lib/providers/pvwatts';
import type { ProspectAssumptions } from '@/lib/schemas';

const baseAssumptions: ProspectAssumptions = {
  systemSizeKwp: 10,
  lossPercent: 14,
  tiltDegrees: 35,
  uiAzimuthDegrees: 180,
  moduleType: 'standard',
  mountingType: 'free',
};

describe('fetchPvwattsEstimate', () => {
  it('parses a happy-path v8 monthly response and maps mapping codes', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            outputs: {
              ac_annual: 11000,
              ac_monthly: [800, 800, 1000, 1100, 1200, 1300, 1300, 1200, 1000, 900, 800, 600],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    const result = await fetchPvwattsEstimate(
      { lat: 38.7223, lon: -9.1393, assumptions: baseAssumptions },
      { apiKey: 'secret', fetcher },
    );

    expect(result.status).toBe('success');
    expect(result.annualKwh).toBe(11000);
    expect(result.monthly).toHaveLength(12);

    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('api_key=secret');
    expect(url).toContain('system_capacity=10');
    expect(url).toContain('azimuth=180');
    expect(url).toContain('module_type=0'); // standard
    expect(url).toContain('array_type=0'); // free
    expect(url).toContain('timeframe=monthly');
  });

  it('marks disabled when api key is missing', async () => {
    const fetcher = vi.fn();
    const result = await fetchPvwattsEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { apiKey: '', fetcher: fetcher as unknown as typeof fetch },
    );
    expect(result.status).toBe('disabled');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('marks rate_limited on 429', async () => {
    const fetcher = vi.fn(async () => new Response('rate limited', { status: 429 }));
    const result = await fetchPvwattsEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { apiKey: 'k', fetcher },
    );
    expect(result.status).toBe('rate_limited');
  });

  it('surfaces NREL outputs.errors as failed', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            outputs: { ac_annual: 0, ac_monthly: Array(12).fill(0) },
            errors: ['invalid api_key'],
          }),
          { status: 200 },
        ),
    );
    const result = await fetchPvwattsEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { apiKey: 'bad', fetcher },
    );
    expect(result.status).toBe('failed');
    expect(result.warnings[0]).toMatch(/invalid api_key/);
  });

  it('keeps api_key only in request URL, not in returned metadata', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            outputs: { ac_annual: 100, ac_monthly: Array(12).fill(10) },
          }),
          { status: 200 },
        ),
    );
    const result = await fetchPvwattsEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { apiKey: 'sensitive', fetcher },
    );
    expect(JSON.stringify(result.metadata)).not.toContain('sensitive');
  });
});
