import { describe, it, expect } from 'vitest';
import { consolidate } from '@/lib/consolidation';
import type { SourceEstimate } from '@/lib/schemas';

const makeMonthly = (values: number[], kwp = 10) =>
  values.map((kwh, i) => ({ month: i + 1, kwh, kwhPerKwp: kwh / kwp }));

const pvgisSuccess: SourceEstimate = {
  source: 'pvgis',
  status: 'success',
  annualKwh: 12760,
  annualKwhPerKwp: 1276,
  monthly: makeMonthly([800, 900, 1050, 1150, 1250, 1300, 1300, 1250, 1100, 1000, 850, 810]),
  warnings: [],
  metadata: {},
};

const pvwattsSuccess: SourceEstimate = {
  source: 'pvwatts',
  status: 'success',
  annualKwh: 12080,
  annualKwhPerKwp: 1208,
  monthly: makeMonthly([750, 850, 1000, 1100, 1180, 1220, 1230, 1180, 1050, 950, 800, 770]),
  warnings: [],
  metadata: {},
};

const pvwattsRateLimited: SourceEstimate = {
  source: 'pvwatts',
  status: 'rate_limited',
  annualKwh: null,
  annualKwhPerKwp: null,
  monthly: [],
  warnings: ['429'],
  metadata: {},
};

describe('consolidate (PRD §14.2)', () => {
  it('averages both providers and computes deltaPercent', () => {
    const c = consolidate([pvgisSuccess, pvwattsSuccess]);
    expect(c.providerCount).toBe(2);
    expect(c.annualKwh).toBe(12420);
    expect(c.annualKwhPerKwp).toBe(1242);
    expect(c.deltaPercent).toBe(5.5); // |12760 - 12080| / 12420 * 100 = 5.47 → rounds to 5.5
    expect(c.recommendationLabel).toBe('Based on PVGIS and PVWatts');
  });

  it('falls back to single successful provider', () => {
    const c = consolidate([pvgisSuccess, pvwattsRateLimited]);
    expect(c.providerCount).toBe(1);
    expect(c.annualKwh).toBe(12760);
    expect(c.deltaPercent).toBeNull();
    expect(c.recommendationLabel).toBe('Based on PVGIS only');
  });

  it('returns all-null when no providers succeed', () => {
    const c = consolidate([pvwattsRateLimited]);
    expect(c.providerCount).toBe(0);
    expect(c.annualKwh).toBeNull();
    expect(c.deltaPercent).toBeNull();
    expect(c.monthly.every((m) => m.kwh === null && m.kwhPerKwp === null)).toBe(true);
    expect(c.recommendationLabel).toBe('No providers succeeded');
  });

  it('handles monthly slots where only one provider has data', () => {
    const partial: SourceEstimate = {
      ...pvgisSuccess,
      monthly: makeMonthly([800, 900, 1050]),
    };
    const c = consolidate([partial, pvwattsSuccess]);
    expect(c.monthly[3]?.kwh).toBe(1100); // April: only PVWatts has data → use it
    expect(c.monthly[0]?.kwh).toBe(775); // Jan: average of 800 + 750
  });
});
