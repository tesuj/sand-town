/**
 * POST /api/location/resolve — resolve a free-text query into one or more
 * candidate locations WITHOUT running PVGIS/PVWatts. Used by the UI's search
 * button + Enter key to drop a pin on the map before Calculate.
 *
 * Per PRD §FR-L3. Mirrors the geocoding behaviour of /api/prospect-runs but
 * returns immediately after Nominatim — no provider calls, no persistence.
 *
 * Never throws — failures degrade to status='failed' with warnings.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { getEnv } from '@/lib/env';
import { parseCoordinatePair } from '@/lib/coordinates';
import { createPrismaGeocodingCache } from '@/lib/geocodingCache';
import {
  nominatimResultToLocation,
  searchNominatim,
} from '@/lib/providers/nominatim';
import {
  LocationResolveRequest,
  type LocationResolveResponse,
} from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
): Promise<NextResponse<LocationResolveResponse>> {
  try {
    return await handleResolve(req);
  } catch (err) {
    console.error('unhandled location/resolve error', err);
    return jsonResponse({
      status: 'failed',
      location: null,
      warnings: [`Internal error: ${err instanceof Error ? err.message : 'unknown'}`],
    });
  }
}

async function handleResolve(
  req: NextRequest,
): Promise<NextResponse<LocationResolveResponse>> {
  const env = getEnv();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return invalidResponse('Request body must be JSON');
  }

  let request: LocationResolveRequest;
  try {
    request = LocationResolveRequest.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return invalidResponse(
        `Request validation failed: ${err.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    return invalidResponse('Unknown validation error');
  }

  // Coordinate short-circuit — never hit Nominatim for already-resolved input.
  const coords = parseCoordinatePair(request.query);
  if (coords) {
    return jsonResponse({
      status: 'coordinates',
      location: {
        lat: coords.lat,
        lon: coords.lon,
        inputText: request.query,
        displayLabel: null,
        source: 'manual_coordinates',
        geocodingProvider: null,
        geocodingPlaceId: null,
        osmType: null,
        osmId: null,
      },
      warnings: [],
    });
  }

  const outcome = await searchNominatim(
    {
      query: request.query,
      acceptLanguage: request.acceptLanguage,
      limit: request.limit ?? 5,
    },
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
      warnings: [`Geocoding ${outcome.status}: ${outcome.message}`],
    });
  }

  if (outcome.kind === 'coordinates') {
    return jsonResponse({
      status: 'coordinates',
      location: outcome.location,
      warnings: [],
    });
  }

  if (outcome.results.length === 0) {
    return jsonResponse({
      status: 'invalid_location',
      location: null,
      warnings: ['No geocoding results for query'],
    });
  }

  if (outcome.results.length === 1) {
    return jsonResponse({
      status: 'success',
      location: nominatimResultToLocation(outcome.results[0], request.query),
      warnings: [],
    });
  }

  return jsonResponse({
    status: 'needs_location_choice',
    location: null,
    candidates: outcome.results.map((r) => nominatimResultToLocation(r, request.query)),
    warnings: [],
  });
}

function jsonResponse(
  payload: LocationResolveResponse,
): NextResponse<LocationResolveResponse> {
  const httpStatus =
    payload.status === 'invalid_location'
      ? 400
      : payload.status === 'provider_error' || payload.status === 'failed'
        ? 502
        : 200;
  return NextResponse.json(payload, { status: httpStatus });
}

function invalidResponse(message: string): NextResponse<LocationResolveResponse> {
  return jsonResponse({
    status: 'invalid_location',
    location: null,
    warnings: [message],
  });
}
