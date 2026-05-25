import { describe, it, expect } from 'vitest';
import {
  ProspectLocation,
  ProspectAssumptions,
  SourceEstimate,
  ConsolidatedEstimate,
  ProspectRunRequest,
  AnglesSource,
  LocationResolveRequest,
  LocationResolveResponse,
} from '@/lib/schemas';

describe('ProspectLocation', () => {
  it('accepts a valid Nominatim-sourced location', () => {
    const parsed = ProspectLocation.parse({
      lat: 38.7223,
      lon: -9.1393,
      inputText: 'Lisbon, Portugal',
      displayLabel: 'Lisbon, Portugal',
      source: 'nominatim_search',
      geocodingProvider: 'nominatim',
      geocodingPlaceId: 12345,
    });
    expect(parsed.source).toBe('nominatim_search');
  });

  it('rejects out-of-range latitude', () => {
    expect(() =>
      ProspectLocation.parse({
        lat: 95,
        lon: 0,
        inputText: 'x',
        displayLabel: null,
        source: 'map_click',
      }),
    ).toThrow();
  });
});

describe('ProspectAssumptions', () => {
  it('parses the canonical default assumptions', () => {
    const parsed = ProspectAssumptions.parse({
      systemSizeKwp: 10,
      lossPercent: 14,
      tiltDegrees: 35,
      uiAzimuthDegrees: 180,
      moduleType: 'standard',
      mountingType: 'free',
    });
    expect(parsed.systemSizeKwp).toBe(10);
  });

  it('rejects unknown moduleType', () => {
    expect(() =>
      ProspectAssumptions.parse({
        systemSizeKwp: 10,
        lossPercent: 14,
        tiltDegrees: 35,
        uiAzimuthDegrees: 180,
        moduleType: 'magic',
        mountingType: 'free',
      }),
    ).toThrow();
  });
});

describe('SourceEstimate', () => {
  it('accepts a successful PVGIS estimate with 12 months', () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      kwh: 1000,
      kwhPerKwp: 100,
    }));
    const parsed = SourceEstimate.parse({
      source: 'pvgis',
      status: 'success',
      annualKwh: 12000,
      annualKwhPerKwp: 1200,
      monthly,
      warnings: [],
      metadata: { endpoint: 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc' },
    });
    expect(parsed.monthly).toHaveLength(12);
  });

  it('accepts a failed source with null totals', () => {
    const parsed = SourceEstimate.parse({
      source: 'pvwatts',
      status: 'rate_limited',
      annualKwh: null,
      annualKwhPerKwp: null,
      monthly: [],
      warnings: ['429 Too Many Requests'],
      metadata: {},
    });
    expect(parsed.status).toBe('rate_limited');
  });
});

describe('ConsolidatedEstimate', () => {
  it('accepts null monthly values when both providers missing for a month', () => {
    const parsed = ConsolidatedEstimate.parse({
      annualKwh: null,
      annualKwhPerKwp: null,
      monthly: [{ month: 1, kwh: null, kwhPerKwp: null }],
      deltaPercent: null,
      providerCount: 0,
      recommendationLabel: 'No providers succeeded',
    });
    expect(parsed.providerCount).toBe(0);
  });
});

describe('ProspectRunRequest', () => {
  it('fills defaults per PRD §11.3', () => {
    const parsed = ProspectRunRequest.parse({
      locationInput: '50.228232, 29.452135',
      lat: 50.228232,
      lon: 29.452135,
      systemSizeKwp: 10,
    });
    expect(parsed.lossPercent).toBe(14);
    expect(parsed.tiltDegrees).toBe(35);
    expect(parsed.azimuthDegrees).toBe(180);
    expect(parsed.moduleType).toBe('standard');
    expect(parsed.mountingType).toBe('free');
    expect(parsed.autoAngles).toBe(true);
  });

  it('honors explicit autoAngles=false', () => {
    const parsed = ProspectRunRequest.parse({
      locationInput: 'x',
      systemSizeKwp: 10,
      autoAngles: false,
    });
    expect(parsed.autoAngles).toBe(false);
  });
});

describe('AnglesSource enum', () => {
  it('accepts the 3 known values', () => {
    expect(AnglesSource.parse('manual')).toBe('manual');
    expect(AnglesSource.parse('optimal_pvgis')).toBe('optimal_pvgis');
    expect(AnglesSource.parse('heuristic')).toBe('heuristic');
  });
  it('rejects unknown values', () => {
    expect(() => AnglesSource.parse('auto')).toThrow();
  });
});

describe('LocationResolveRequest / Response', () => {
  it('rejects empty query', () => {
    expect(() => LocationResolveRequest.parse({ query: '' })).toThrow();
  });
  it('accepts minimal query', () => {
    expect(LocationResolveRequest.parse({ query: 'Lisbon' })).toEqual({ query: 'Lisbon' });
  });
  it('caps limit to 1..10', () => {
    expect(() => LocationResolveRequest.parse({ query: 'x', limit: 0 })).toThrow();
    expect(() => LocationResolveRequest.parse({ query: 'x', limit: 11 })).toThrow();
    expect(LocationResolveRequest.parse({ query: 'x', limit: 5 }).limit).toBe(5);
  });
  it('parses a success response payload', () => {
    const parsed = LocationResolveResponse.parse({
      status: 'success',
      location: {
        lat: 38.7,
        lon: -9.1,
        inputText: 'Lisbon',
        displayLabel: 'Lisbon, Portugal',
        source: 'nominatim_search',
      },
      warnings: [],
    });
    expect(parsed.status).toBe('success');
  });
});
