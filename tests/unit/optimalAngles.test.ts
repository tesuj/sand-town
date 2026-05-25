import { describe, it, expect } from 'vitest';
import { latitudeBasedAngles } from '@/lib/optimalAngles';

describe('latitudeBasedAngles (heuristic fallback)', () => {
  it('Lisbon (lat 38.72) → tilt 29, azimuth 180 (south)', () => {
    expect(latitudeBasedAngles(38.72)).toEqual({ tiltDegrees: 29, uiAzimuthDegrees: 180 });
  });

  it('Sydney (lat -33.87) → tilt 26, azimuth 0 (north)', () => {
    expect(latitudeBasedAngles(-33.87)).toEqual({ tiltDegrees: 26, uiAzimuthDegrees: 0 });
  });

  it('Equator → tilt 0, azimuth 180 (south by convention)', () => {
    expect(latitudeBasedAngles(0)).toEqual({ tiltDegrees: 0, uiAzimuthDegrees: 180 });
  });

  it('high arctic (lat 80) → tilt clamped to 60', () => {
    expect(latitudeBasedAngles(80)).toEqual({ tiltDegrees: 60, uiAzimuthDegrees: 180 });
  });

  it('high antarctic (lat -80) → tilt 60, azimuth 0', () => {
    expect(latitudeBasedAngles(-80)).toEqual({ tiltDegrees: 60, uiAzimuthDegrees: 0 });
  });

  it('NaN / non-finite → safe defaults (35, 180)', () => {
    expect(latitudeBasedAngles(Number.NaN)).toEqual({ tiltDegrees: 35, uiAzimuthDegrees: 180 });
  });
});
