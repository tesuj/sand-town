/**
 * Heuristic fallback for optimal tilt/azimuth when PVGIS optimal-angle lookup
 * is unavailable. Latitude-based rule of thumb: tilt ≈ |lat| × 0.76, capped at 60°.
 * Northern hemisphere faces south (UI azimuth 180); southern hemisphere faces
 * north (UI azimuth 0).
 */

import type { ProspectAssumptions } from '@/lib/schemas';

export type HeuristicAngles = Pick<ProspectAssumptions, 'tiltDegrees' | 'uiAzimuthDegrees'>;

const TILT_MIN = 0;
const TILT_MAX = 60;
const LAT_FACTOR = 0.76;

export function latitudeBasedAngles(lat: number): HeuristicAngles {
  if (!Number.isFinite(lat)) {
    return { tiltDegrees: 35, uiAzimuthDegrees: 180 };
  }
  const raw = Math.abs(lat) * LAT_FACTOR;
  const tiltDegrees = Math.max(TILT_MIN, Math.min(TILT_MAX, Math.round(raw)));
  const uiAzimuthDegrees = lat >= 0 ? 180 : 0;
  return { tiltDegrees, uiAzimuthDegrees };
}
