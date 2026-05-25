/**
 * Normalised internal schemas per PRD §14.1.
 *
 * These are the runtime + type contracts that the calculate pipeline and the
 * UI agree on. Provider adapters (PVGIS / PVWatts / Nominatim) produce
 * SourceEstimate or ProspectLocation; the consolidation step (§14.2) folds
 * SourceEstimates into a ConsolidatedEstimate.
 */

import { z } from 'zod';

export const LocationSource = z.enum([
  'map_click',
  'manual_coordinates',
  'browser_geolocation',
  'nominatim_search',
  'unknown',
]);
export type LocationSource = z.infer<typeof LocationSource>;

export const ProspectLocation = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  inputText: z.string(),
  displayLabel: z.string().nullable(),
  source: LocationSource,
  geocodingProvider: z.enum(['nominatim']).nullable().optional(),
  geocodingPlaceId: z.union([z.string(), z.number()]).nullable().optional(),
  osmType: z.string().nullable().optional(),
  osmId: z.union([z.string(), z.number()]).nullable().optional(),
});
export type ProspectLocation = z.infer<typeof ProspectLocation>;

export const ProviderSource = z.enum(['pvgis', 'pvwatts']);
export type ProviderSource = z.infer<typeof ProviderSource>;

export const ProviderStatus = z.enum([
  'success',
  'failed',
  'partial',
  'disabled',
  'timeout',
  'rate_limited',
]);
export type ProviderStatus = z.infer<typeof ProviderStatus>;

export const ModuleType = z.enum(['standard', 'premium', 'thinfilm']);
export type ModuleType = z.infer<typeof ModuleType>;

export const MountingType = z.enum(['free', 'roof']);
export type MountingType = z.infer<typeof MountingType>;

export const ProspectAssumptions = z.object({
  systemSizeKwp: z.number().positive(),
  lossPercent: z.number().min(0).max(100),
  tiltDegrees: z.number().min(0).max(90),
  uiAzimuthDegrees: z.number().min(0).max(360),
  moduleType: ModuleType,
  mountingType: MountingType,
});
export type ProspectAssumptions = z.infer<typeof ProspectAssumptions>;

export const MonthlyProduction = z.object({
  month: z.number().int().min(1).max(12),
  kwh: z.number().min(0),
  kwhPerKwp: z.number().min(0),
});
export type MonthlyProduction = z.infer<typeof MonthlyProduction>;

export const SourceEstimate = z.object({
  source: ProviderSource,
  status: ProviderStatus,
  annualKwh: z.number().nullable(),
  annualKwhPerKwp: z.number().nullable(),
  monthly: z.array(MonthlyProduction),
  warnings: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});
export type SourceEstimate = z.infer<typeof SourceEstimate>;

export const ConsolidatedEstimate = z.object({
  annualKwh: z.number().nullable(),
  annualKwhPerKwp: z.number().nullable(),
  monthly: z.array(
    MonthlyProduction.extend({
      kwh: z.number().nullable(),
      kwhPerKwp: z.number().nullable(),
    }),
  ),
  deltaPercent: z.number().nullable(),
  providerCount: z.number().int().min(0),
  recommendationLabel: z.string(),
});
export type ConsolidatedEstimate = z.infer<typeof ConsolidatedEstimate>;

/* -------------------------------------------------------------------------- */
/* Public API DTOs                                                             */
/* -------------------------------------------------------------------------- */

export const AnglesSource = z.enum(['manual', 'optimal_pvgis', 'heuristic']);
export type AnglesSource = z.infer<typeof AnglesSource>;

export const ProspectRunRequest = z.object({
  locationInput: z.string().min(1),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  locationSource: LocationSource.optional(),
  systemSizeKwp: z.number().positive(),
  lossPercent: z.number().min(0).max(100).default(14),
  moduleType: ModuleType.default('standard'),
  mountingType: MountingType.default('free'),
  tiltDegrees: z.number().min(0).max(90).default(35),
  azimuthDegrees: z.number().min(0).max(360).default(180),
  autoAngles: z.boolean().default(true),
});
export type ProspectRunRequest = z.infer<typeof ProspectRunRequest>;

export const ProspectRunStatus = z.enum([
  'success',
  'partial',
  'needs_location_choice',
  'invalid_location',
  'provider_error',
  'failed',
]);
export type ProspectRunStatus = z.infer<typeof ProspectRunStatus>;

/* -------------------------------------------------------------------------- */
/* Location resolution DTOs (PRD §FR-L3)                                       */
/* -------------------------------------------------------------------------- */

export const LocationResolveRequest = z.object({
  query: z.string().min(1),
  acceptLanguage: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});
export type LocationResolveRequest = z.infer<typeof LocationResolveRequest>;

export const LocationResolveStatus = z.enum([
  'success',
  'coordinates',
  'needs_location_choice',
  'invalid_location',
  'provider_error',
  'failed',
]);
export type LocationResolveStatus = z.infer<typeof LocationResolveStatus>;

export const LocationResolveResponse = z.object({
  status: LocationResolveStatus,
  location: ProspectLocation.nullable(),
  candidates: z.array(ProspectLocation).optional(),
  warnings: z.array(z.string()),
});
export type LocationResolveResponse = z.infer<typeof LocationResolveResponse>;

export const ProspectRunResponse = z.object({
  status: ProspectRunStatus,
  location: ProspectLocation.nullable(),
  assumptions: ProspectAssumptions.nullable(),
  anglesSource: AnglesSource.nullable(),
  sources: z.array(SourceEstimate),
  consolidated: ConsolidatedEstimate.nullable(),
  candidates: z.array(ProspectLocation).optional(),
  warnings: z.array(z.string()),
});
export type ProspectRunResponse = z.infer<typeof ProspectRunResponse>;
