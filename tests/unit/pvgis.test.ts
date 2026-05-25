import { describe, it, expect, vi } from 'vitest';
import {
  fetchPvgisEstimate,
  uiAzimuthToPvgisAspect,
  pvgisAspectToUiAzimuth,
} from '@/lib/providers/pvgis';
import type { ProspectAssumptions } from '@/lib/schemas';

const baseAssumptions: ProspectAssumptions = {
  systemSizeKwp: 10,
  lossPercent: 14,
  tiltDegrees: 35,
  uiAzimuthDegrees: 180,
  moduleType: 'standard',
  mountingType: 'free',
};

describe('uiAzimuthToPvgisAspect (PRD §12.2)', () => {
  it('converts South 180° → 0°', () => {
    expect(uiAzimuthToPvgisAspect(180)).toBe(0);
  });
  it('converts East 90° → -90°', () => {
    expect(uiAzimuthToPvgisAspect(90)).toBe(-90);
  });
  it('converts West 270° → 90°', () => {
    expect(uiAzimuthToPvgisAspect(270)).toBe(90);
  });
  it('converts North 0° → -180°', () => {
    expect(uiAzimuthToPvgisAspect(0)).toBe(-180);
  });
  it('converts North 360° → 180° (wrap into range)', () => {
    expect(uiAzimuthToPvgisAspect(360)).toBe(180);
  });
});

describe('pvgisAspectToUiAzimuth (inverse)', () => {
  it('PVGIS 0 → UI 180 (south)', () => {
    expect(pvgisAspectToUiAzimuth(0)).toBe(180);
  });
  it('PVGIS -90 → UI 90 (east)', () => {
    expect(pvgisAspectToUiAzimuth(-90)).toBe(90);
  });
  it('PVGIS 90 → UI 270 (west)', () => {
    expect(pvgisAspectToUiAzimuth(90)).toBe(270);
  });
  it('PVGIS -180 → UI 0 (north)', () => {
    expect(pvgisAspectToUiAzimuth(-180)).toBe(0);
  });
  it('PVGIS 180 → UI 0 (north, normalized)', () => {
    expect(pvgisAspectToUiAzimuth(180)).toBe(0);
  });
  it('round-trip ui→pvgis→ui for common angles', () => {
    for (const ui of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const round = pvgisAspectToUiAzimuth(uiAzimuthToPvgisAspect(ui));
      expect(round).toBe(ui);
    }
  });
});

describe('fetchPvgisEstimate', () => {
  it('parses a happy-path PVcalc response', async () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, E_m: 1000 }));
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({ outputs: { monthly: { fixed: monthly }, totals: { fixed: { E_y: 12000 } } } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await fetchPvgisEstimate(
      { lat: 38.7223, lon: -9.1393, assumptions: baseAssumptions },
      { fetcher },
    );

    expect(result.status).toBe('success');
    expect(result.annualKwh).toBe(12000);
    expect(result.annualKwhPerKwp).toBe(1200);
    expect(result.monthly).toHaveLength(12);
    expect(result.monthly[0]).toEqual({ month: 1, kwh: 1000, kwhPerKwp: 100 });

    const calledUrl = fetcher.mock.calls[0][0] as string;
    expect(calledUrl).toContain('PVcalc');
    expect(calledUrl).toContain('aspect=0'); // South → 0
    expect(calledUrl).toContain('outputformat=json');
  });

  it('marks rate-limited on HTTP 429', async () => {
    const fetcher = vi.fn(async () => new Response('rate limited', { status: 429 }));
    const result = await fetchPvgisEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { fetcher },
    );
    expect(result.status).toBe('rate_limited');
    expect(result.warnings[0]).toMatch(/429/);
  });

  it('marks rate-limited on HTTP 529 (PVGIS overload)', async () => {
    const fetcher = vi.fn(async () => new Response('overloaded', { status: 529 }));
    const result = await fetchPvgisEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { fetcher },
    );
    expect(result.status).toBe('rate_limited');
    expect(result.warnings[0]).toMatch(/529/);
  });

  it('returns failed on malformed payload', async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ outputs: {} }), { status: 200 }),
    );
    const result = await fetchPvgisEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { fetcher },
    );
    expect(result.status).toBe('failed');
  });

  it('useOptimalAngles=true sends optimalangles=1 and omits angle/aspect', async () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, E_m: 1000 }));
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          inputs: {
            mounting_system: {
              fixed: {
                slope: { value: 33, optimal: true },
                azimuth: { value: 4, optimal: true },
              },
            },
          },
          outputs: { monthly: { fixed: monthly }, totals: { fixed: { E_y: 15800 } } },
        }),
        { status: 200 },
      ),
    );
    const result = await fetchPvgisEstimate(
      { lat: 38.7223, lon: -9.1393, assumptions: baseAssumptions },
      { fetcher, useOptimalAngles: true },
    );
    expect(result.status).toBe('success');
    const meta = result.metadata as { optimal: { pvgisSlopeDegrees: number; pvgisAspectDegrees: number; source: string } | null };
    expect(meta.optimal).toEqual({ pvgisSlopeDegrees: 33, pvgisAspectDegrees: 4, source: 'pvgis' });

    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toContain('optimalangles=1');
    expect(url).not.toContain('angle=');
    expect(url).not.toContain('aspect=');
  });

  it('useOptimalAngles=true with missing mounting_system → optimal=null', async () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, E_m: 1000 }));
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({ outputs: { monthly: { fixed: monthly }, totals: { fixed: { E_y: 12000 } } } }),
        { status: 200 },
      ),
    );
    const result = await fetchPvgisEstimate(
      { lat: 0, lon: 0, assumptions: baseAssumptions },
      { fetcher, useOptimalAngles: true },
    );
    expect(result.status).toBe('success');
    expect((result.metadata as { optimal: unknown }).optimal).toBeNull();
  });
});
