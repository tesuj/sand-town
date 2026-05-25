/**
 * PVGIS PVcalc adapter — PRD §12.2.
 *
 * Returns a SourceEstimate. Never throws: provider errors become
 * status='failed' / 'rate_limited' / 'timeout' with warnings.
 */

import { z } from 'zod';
import type { ProspectAssumptions, SourceEstimate, MonthlyProduction } from '@/lib/schemas';

const DEFAULT_BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_3';

export type PvgisAdapterOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  /** Hard cap on the request, including DNS/TLS. */
  timeoutMs?: number;
  /** When true, omit angle/aspect and ask PVGIS to pick optimal slope+azimuth. */
  useOptimalAngles?: boolean;
};

/**
 * Convert UI solar azimuth (180=South) to PVGIS aspect (0=South, ±90).
 *
 * UI:    180 South, 90 East, 270 West, 0/360 North
 * PVGIS:   0 South, -90 East, 90 West, ±180 North
 */
export function uiAzimuthToPvgisAspect(uiAzimuth: number): number {
  let aspect = uiAzimuth - 180;
  if (aspect > 180) aspect -= 360;
  if (aspect < -180) aspect += 360;
  return aspect;
}

/**
 * Inverse of uiAzimuthToPvgisAspect. PVGIS aspect (-180..180) → UI azimuth (0..360).
 * PVGIS 0 → UI 180 (south); PVGIS -90 → UI 90 (east); PVGIS 90 → UI 270 (west);
 * PVGIS ±180 → UI 0 / 360 (north — normalized to 0).
 */
export function pvgisAspectToUiAzimuth(pvgisAspect: number): number {
  let ui = pvgisAspect + 180;
  if (ui < 0) ui += 360;
  if (ui >= 360) ui -= 360;
  return ui;
}

const PvgisMonthly = z.object({
  month: z.number(),
  E_m: z.number(),
});

const PvgisOptimalAngle = z
  .object({
    value: z.number(),
    optimal: z.boolean().optional(),
  })
  .optional();

const PvgisFixedMounting = z
  .object({
    slope: PvgisOptimalAngle,
    azimuth: PvgisOptimalAngle,
  })
  .optional();

const PvgisResponseSchema = z.object({
  inputs: z
    .object({
      mounting_system: z
        .object({
          fixed: PvgisFixedMounting,
        })
        .optional(),
    })
    .optional(),
  outputs: z.object({
    monthly: z.object({
      fixed: z.array(PvgisMonthly),
    }),
    totals: z.object({
      fixed: z.object({
        E_y: z.number(),
      }),
    }),
  }),
});

export type PvgisOptimalAnglesPicked = {
  pvgisSlopeDegrees: number;
  pvgisAspectDegrees: number;
  source: 'pvgis';
};

export async function fetchPvgisEstimate(
  args: {
    lat: number;
    lon: number;
    assumptions: ProspectAssumptions;
  },
  options: PvgisAdapterOptions = {},
): Promise<SourceEstimate> {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const doFetch = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const useOptimal = options.useOptimalAngles === true;

  const aspect = uiAzimuthToPvgisAspect(args.assumptions.uiAzimuthDegrees);
  const params = new URLSearchParams({
    lat: String(args.lat),
    lon: String(args.lon),
    peakpower: String(args.assumptions.systemSizeKwp),
    loss: String(args.assumptions.lossPercent),
    outputformat: 'json',
    browser: '0',
  });
  if (useOptimal) {
    params.set('optimalangles', '1');
  } else {
    params.set('angle', String(args.assumptions.tiltDegrees));
    params.set('aspect', String(aspect));
  }

  const url = `${baseUrl}/PVcalc?${params.toString()}`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      return failed('rate_limited', '429 Too Many Requests', { aspect });
    }
    if (response.status === 529) {
      return failed('rate_limited', '529 Site Overloaded', { aspect });
    }
    if (!response.ok) {
      return failed('failed', `HTTP ${response.status}`, { aspect });
    }

    const json = await response.json();
    const parsed = PvgisResponseSchema.safeParse(json);
    if (!parsed.success) {
      return failed('failed', `Unexpected response shape: ${parsed.error.message.slice(0, 200)}`, {
        aspect,
      });
    }

    const monthly: MonthlyProduction[] = parsed.data.outputs.monthly.fixed
      .slice(0, 12)
      .map((m) => ({
        month: m.month,
        kwh: m.E_m,
        kwhPerKwp: args.assumptions.systemSizeKwp > 0 ? m.E_m / args.assumptions.systemSizeKwp : 0,
      }));

    const annualKwh = parsed.data.outputs.totals.fixed.E_y;

    const fixed = parsed.data.inputs?.mounting_system?.fixed;
    const optimal: PvgisOptimalAnglesPicked | null =
      useOptimal && fixed?.slope?.value !== undefined && fixed?.azimuth?.value !== undefined
        ? {
            pvgisSlopeDegrees: fixed.slope.value,
            pvgisAspectDegrees: fixed.azimuth.value,
            source: 'pvgis',
          }
        : null;

    return {
      source: 'pvgis',
      status: 'success',
      annualKwh,
      annualKwhPerKwp:
        args.assumptions.systemSizeKwp > 0 ? annualKwh / args.assumptions.systemSizeKwp : null,
      monthly,
      warnings: [],
      metadata: {
        endpoint: `${baseUrl}/PVcalc`,
        aspect: useOptimal ? null : aspect,
        optimal,
      },
    };
  } catch (err) {
    if (isAbortError(err)) {
      return failed('timeout', `PVGIS request timed out after ${timeoutMs}ms`, {});
    }
    return failed('failed', err instanceof Error ? err.message : 'Unknown network error', {});
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function failed(
  status: SourceEstimate['status'],
  warning: string,
  metadata: Record<string, unknown>,
): SourceEstimate {
  return {
    source: 'pvgis',
    status,
    annualKwh: null,
    annualKwhPerKwp: null,
    monthly: [],
    warnings: [warning],
    metadata,
  };
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')
  );
}
