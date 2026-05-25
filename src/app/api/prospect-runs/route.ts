/**
 * POST /api/prospect-runs — main calculation endpoint (PRD §12.1).
 *
 * Flow:
 *   1. Parse/validate request body (Zod).
 *   2. Resolve location: coordinates → use directly; otherwise → Nominatim.
 *      - Ambiguous Nominatim result (>1 candidate) → returns
 *        `needs_location_choice` with candidates, no provider calls.
 *   3. Call PVGIS + PVWatts in parallel.
 *   4. Consolidate per §14.2.
 *   5. Persist ProspectRun + ProspectSourceResult.
 *   6. Respond per §12.1 status taxonomy.
 *
 * Never throws — failures degrade to status='failed' with warnings.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { getEnv } from '@/lib/env';
import { parseCoordinatePair } from '@/lib/coordinates';
import { consolidate } from '@/lib/consolidation';
import { prisma } from '@/lib/prisma';
import { createPrismaGeocodingCache } from '@/lib/geocodingCache';
import {
  fetchPvgisEstimate,
  uiAzimuthToPvgisAspect,
} from '@/lib/providers/pvgis';
import { fetchPvwattsEstimate } from '@/lib/providers/pvwatts';
import {
  searchNominatim,
  nominatimResultToLocation,
} from '@/lib/providers/nominatim';
import {
  ProspectRunRequest,
  type ProspectAssumptions,
  type ProspectLocation,
  type ProspectRunResponse,
  type SourceEstimate,
} from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse<ProspectRunResponse>> {
  const env = getEnv();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return invalidLocationResponse('Request body must be JSON');
  }

  let request;
  try {
    request = ProspectRunRequest.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return invalidLocationResponse(
        `Request validation failed: ${err.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    return invalidLocationResponse('Unknown validation error');
  }

  const assumptions: ProspectAssumptions = {
    systemSizeKwp: request.systemSizeKwp,
    lossPercent: request.lossPercent,
    tiltDegrees: request.tiltDegrees,
    uiAzimuthDegrees: request.azimuthDegrees,
    moduleType: request.moduleType,
    mountingType: request.mountingType,
  };

  // ─── Step 2: resolve location ──────────────────────────────────────────
  let location: ProspectLocation;

  if (typeof request.lat === 'number' && typeof request.lon === 'number') {
    location = {
      lat: request.lat,
      lon: request.lon,
      inputText: request.locationInput,
      displayLabel: null,
      source: request.locationSource ?? 'manual_coordinates',
      geocodingProvider: null,
      geocodingPlaceId: null,
      osmType: null,
      osmId: null,
    };
  } else {
    const coords = parseCoordinatePair(request.locationInput);
    if (coords) {
      location = {
        lat: coords.lat,
        lon: coords.lon,
        inputText: request.locationInput,
        displayLabel: null,
        source: 'manual_coordinates',
        geocodingProvider: null,
        geocodingPlaceId: null,
        osmType: null,
        osmId: null,
      };
    } else {
      const outcome = await searchNominatim(
        { query: request.locationInput, limit: 5 },
        {
          baseUrl: env.NOMINATIM_BASE_URL,
          contactEmail: env.NOMINATIM_CONTACT_EMAIL ?? null,
          cache: createPrismaGeocodingCache(),
        },
      );

      if (outcome.kind === 'error') {
        return jsonResponse({
          status: 'provider_error',
          location: null,
          assumptions: null,
          sources: [],
          consolidated: null,
          warnings: [`Geocoding ${outcome.status}: ${outcome.message}`],
        });
      }

      if (outcome.kind === 'coordinates') {
        location = outcome.location;
      } else if (outcome.results.length === 0) {
        return jsonResponse({
          status: 'invalid_location',
          location: null,
          assumptions: null,
          sources: [],
          consolidated: null,
          warnings: ['No geocoding results for query'],
        });
      } else if (outcome.results.length > 1) {
        return jsonResponse({
          status: 'needs_location_choice',
          location: null,
          assumptions: null,
          sources: [],
          consolidated: null,
          warnings: [],
          candidates: outcome.results.map((r) =>
            nominatimResultToLocation(r, request.locationInput),
          ),
        });
      } else {
        location = nominatimResultToLocation(outcome.results[0], request.locationInput);
      }
    }
  }

  // ─── Step 3: call providers in parallel ────────────────────────────────
  const [pvgis, pvwatts] = await Promise.all([
    fetchPvgisEstimate({ lat: location.lat, lon: location.lon, assumptions }, {
      baseUrl: env.PVGIS_BASE_URL,
    }),
    fetchPvwattsEstimate({ lat: location.lat, lon: location.lon, assumptions }, {
      apiKey: env.PVWATTS_API_KEY ?? '',
    }),
  ]);

  const sources: SourceEstimate[] = [pvgis, pvwatts];
  const consolidated = consolidate(sources);

  // ─── Step 4: persist (best-effort; never block response) ───────────────
  try {
    await persistProspectRun(request, location, assumptions, sources, consolidated);
  } catch (err) {
    console.error('persistProspectRun failed', err);
  }

  const runStatus =
    consolidated.providerCount === 2
      ? 'success'
      : consolidated.providerCount === 1
        ? 'partial'
        : 'failed';

  return jsonResponse({
    status: runStatus,
    location,
    assumptions,
    sources,
    consolidated,
    warnings: sources.flatMap((s) => s.warnings),
  });
}

async function persistProspectRun(
  request: ProspectRunRequest,
  location: ProspectLocation,
  assumptions: ProspectAssumptions,
  sources: SourceEstimate[],
  consolidated: ReturnType<typeof consolidate>,
) {
  const aspect = uiAzimuthToPvgisAspect(assumptions.uiAzimuthDegrees);
  const status =
    consolidated.providerCount === 2
      ? 'success'
      : consolidated.providerCount === 1
        ? 'partial'
        : 'failed';

  await prisma.prospectRun.create({
    data: {
      locationInput: request.locationInput,
      locationDisplayLabel: location.displayLabel,
      locationSource: location.source,
      lat: location.lat,
      lon: location.lon,
      systemSizeKwp: assumptions.systemSizeKwp,
      lossPercent: assumptions.lossPercent,
      tiltDegrees: assumptions.tiltDegrees,
      uiAzimuthDegrees: assumptions.uiAzimuthDegrees,
      pvgisAspectDegrees: aspect,
      moduleType: assumptions.moduleType,
      mountingType: assumptions.mountingType,
      status,
      annualKwh: consolidated.annualKwh,
      annualKwhPerKwp: consolidated.annualKwhPerKwp,
      sourceDeltaPercent: consolidated.deltaPercent,
      warningsJson: sources.flatMap((s) => s.warnings) as Prisma.InputJsonValue,
      sources: {
        create: sources.map((s) => ({
          source: s.source,
          status: s.status,
          annualKwh: s.annualKwh,
          annualKwhPerKwp: s.annualKwhPerKwp,
          monthlyJson: s.monthly as unknown as Prisma.InputJsonValue,
          assumptionsJson: assumptions as unknown as Prisma.InputJsonValue,
          metadataJson: s.metadata as unknown as Prisma.InputJsonValue,
          warningsJson: s.warnings as Prisma.InputJsonValue,
        })),
      },
    },
  });
}

function jsonResponse(payload: ProspectRunResponse): NextResponse<ProspectRunResponse> {
  const httpStatus =
    payload.status === 'invalid_location'
      ? 400
      : payload.status === 'needs_location_choice'
        ? 200
        : payload.status === 'provider_error' || payload.status === 'failed'
          ? 502
          : 200;
  return NextResponse.json(payload, { status: httpStatus });
}

function invalidLocationResponse(message: string): NextResponse<ProspectRunResponse> {
  return jsonResponse({
    status: 'invalid_location',
    location: null,
    assumptions: null,
    sources: [],
    consolidated: null,
    warnings: [message],
  });
}
