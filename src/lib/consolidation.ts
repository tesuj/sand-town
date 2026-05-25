/**
 * Consolidation rules per PRD §14.2 + §14.3.
 *
 * Given a list of per-provider SourceEstimates, fold them into a single
 * ConsolidatedEstimate the UI can render. Never throws.
 */

import type {
  SourceEstimate,
  ConsolidatedEstimate,
  MonthlyProduction,
} from '@/lib/schemas';

const round1 = (n: number) => Number(n.toFixed(1));

export function consolidate(sources: SourceEstimate[]): ConsolidatedEstimate {
  const succeeded = sources.filter(
    (s) => s.status === 'success' && s.annualKwh !== null && s.annualKwh >= 0,
  );

  if (succeeded.length === 0) {
    return {
      annualKwh: null,
      annualKwhPerKwp: null,
      monthly: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        kwh: null,
        kwhPerKwp: null,
      })),
      deltaPercent: null,
      providerCount: 0,
      recommendationLabel: 'No providers succeeded',
    };
  }

  // Average annual values across successful providers.
  const annualKwhValues = succeeded.map((s) => s.annualKwh as number);
  const annualKwhPerKwpValues = succeeded
    .map((s) => s.annualKwhPerKwp)
    .filter((v): v is number => typeof v === 'number');

  const annualKwh = mean(annualKwhValues);
  const annualKwhPerKwp = annualKwhPerKwpValues.length
    ? mean(annualKwhPerKwpValues)
    : null;

  const monthly = consolidateMonthly(succeeded);

  // Delta only meaningful when two providers succeeded.
  let deltaPercent: number | null = null;
  if (succeeded.length === 2 && annualKwh > 0) {
    const [a, b] = annualKwhValues;
    deltaPercent = round1((Math.abs(a - b) / annualKwh) * 100);
  }

  const labelByCount: Record<number, string> = {
    1: `Based on ${succeeded[0].source.toUpperCase()} only`,
    2: 'Based on PVGIS and PVWatts',
  };

  return {
    annualKwh: round1(annualKwh),
    annualKwhPerKwp: annualKwhPerKwp !== null ? round1(annualKwhPerKwp) : null,
    monthly,
    deltaPercent,
    providerCount: succeeded.length,
    recommendationLabel: labelByCount[succeeded.length] ?? `Based on ${succeeded.length} sources`,
  };
}

function consolidateMonthly(succeeded: SourceEstimate[]): ConsolidatedEstimate['monthly'] {
  const months: ConsolidatedEstimate['monthly'] = [];
  for (let month = 1; month <= 12; month += 1) {
    const monthly: MonthlyProduction[] = succeeded
      .map((s) => s.monthly.find((m) => m.month === month))
      .filter((m): m is MonthlyProduction => Boolean(m));

    if (monthly.length === 0) {
      months.push({ month, kwh: null, kwhPerKwp: null });
      continue;
    }

    const kwh = mean(monthly.map((m) => m.kwh));
    const kwhPerKwp = mean(monthly.map((m) => m.kwhPerKwp));
    months.push({ month, kwh: round1(kwh), kwhPerKwp: round1(kwhPerKwp) });
  }
  return months;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}
