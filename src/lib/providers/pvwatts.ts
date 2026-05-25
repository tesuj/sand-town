/**
 * PVWatts v8 adapter — PRD §12.3.
 *
 * API key stays server-side. Errors never throw — they degrade to
 * SourceEstimate with status='failed'/'rate_limited'/'timeout'.
 */

import { z } from 'zod';
import type {
  ModuleType,
  MountingType,
  ProspectAssumptions,
  SourceEstimate,
  MonthlyProduction,
} from '@/lib/schemas';

// NREL is migrating developer.nrel.gov → developer.nlr.gov (PRD §12.3 matches new domain).
const DEFAULT_BASE_URL = 'https://developer.nlr.gov/api/pvwatts/v8.json';

const MODULE_TYPE_TO_PVWATTS: Record<ModuleType, number> = {
  standard: 0,
  premium: 1,
  thinfilm: 2,
};

const MOUNTING_TO_ARRAY_TYPE: Record<MountingType, number> = {
  free: 0, // fixed open rack
  roof: 1, // fixed roof mount
};

export type PvwattsAdapterOptions = {
  apiKey: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

const PvwattsResponseSchema = z.object({
  outputs: z.object({
    ac_annual: z.number(),
    ac_monthly: z.array(z.number()).length(12),
  }),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export async function fetchPvwattsEstimate(
  args: {
    lat: number;
    lon: number;
    assumptions: ProspectAssumptions;
  },
  options: PvwattsAdapterOptions,
): Promise<SourceEstimate> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  if (!options.apiKey) {
    return failed('disabled', 'PVWATTS_API_KEY is not configured', {});
  }

  const params = new URLSearchParams({
    api_key: options.apiKey,
    lat: String(args.lat),
    lon: String(args.lon),
    system_capacity: String(args.assumptions.systemSizeKwp),
    azimuth: String(args.assumptions.uiAzimuthDegrees),
    tilt: String(args.assumptions.tiltDegrees),
    array_type: String(MOUNTING_TO_ARRAY_TYPE[args.assumptions.mountingType]),
    module_type: String(MODULE_TYPE_TO_PVWATTS[args.assumptions.moduleType]),
    losses: String(args.assumptions.lossPercent),
    timeframe: 'monthly',
  });

  const url = `${baseUrl}?${params.toString()}`;
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      return failed('rate_limited', '429 Too Many Requests', {});
    }
    if (!response.ok) {
      return failed('failed', `HTTP ${response.status}`, {});
    }

    const json = await response.json();
    const parsed = PvwattsResponseSchema.safeParse(json);
    if (!parsed.success) {
      return failed('failed', `Unexpected response shape: ${parsed.error.message.slice(0, 200)}`, {
        rawShape: Object.keys(json ?? {}),
      });
    }

    if (parsed.data.errors && parsed.data.errors.length > 0) {
      // NREL surfaces auth and validation errors here.
      return failed('failed', parsed.data.errors.join('; '), {});
    }

    const annualKwh = parsed.data.outputs.ac_annual;
    const monthly: MonthlyProduction[] = parsed.data.outputs.ac_monthly.map((kwh, idx) => ({
      month: idx + 1,
      kwh,
      kwhPerKwp: args.assumptions.systemSizeKwp > 0 ? kwh / args.assumptions.systemSizeKwp : 0,
    }));

    return {
      source: 'pvwatts',
      status: 'success',
      annualKwh,
      annualKwhPerKwp:
        args.assumptions.systemSizeKwp > 0 ? annualKwh / args.assumptions.systemSizeKwp : null,
      monthly,
      warnings: parsed.data.warnings ?? [],
      metadata: {
        endpoint: baseUrl,
        moduleTypeCode: MODULE_TYPE_TO_PVWATTS[args.assumptions.moduleType],
        arrayTypeCode: MOUNTING_TO_ARRAY_TYPE[args.assumptions.mountingType],
      },
    };
  } catch (err) {
    if (isAbortError(err)) {
      return failed('timeout', `PVWatts request timed out after ${timeoutMs}ms`, {});
    }
    return failed('failed', err instanceof Error ? err.message : 'Unknown network error', {});
  } finally {
    clearTimeout(handle);
  }
}

function failed(
  status: SourceEstimate['status'],
  warning: string,
  metadata: Record<string, unknown>,
): SourceEstimate {
  return {
    source: 'pvwatts',
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
