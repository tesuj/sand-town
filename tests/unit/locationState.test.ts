import { describe, it, expect } from 'vitest';
import {
  initialLocationState,
  locationReducer,
} from '@/lib/locationState';

describe('locationReducer (PRD §9.5.1)', () => {
  it('edit with non-coordinate text marks input dirty without touching confirmed', () => {
    const next = locationReducer(initialLocationState, { type: 'edit', value: 'Lisbon, Portugal' });
    expect(next.value).toBe('Lisbon, Portugal');
    expect(next.dirty).toBe(true);
    expect(next.confirmedLocation).toBeNull();
  });

  it('edit with valid coordinates confirms manual_coordinates immediately', () => {
    const next = locationReducer(initialLocationState, { type: 'edit', value: '38.7223, -9.1393' });
    expect(next.dirty).toBe(false);
    expect(next.confirmedLocation).toEqual({
      lat: 38.7223,
      lon: -9.1393,
      source: 'manual_coordinates',
      label: null,
    });
    expect(next.value).toBe('38.722300, -9.139300');
  });

  it('confirm_coordinates from map click overwrites prior dirty input', () => {
    const dirty = locationReducer(initialLocationState, { type: 'edit', value: 'unfinished add' });
    const next = locationReducer(dirty, {
      type: 'confirm_coordinates',
      lat: 50.228232,
      lon: 29.452135,
      source: 'map_click',
    });
    expect(next.dirty).toBe(false);
    expect(next.value).toBe('50.228232, 29.452135');
    expect(next.confirmedLocation?.source).toBe('map_click');
  });

  it('confirm_geocoded uses label as display value', () => {
    const next = locationReducer(initialLocationState, {
      type: 'confirm_geocoded',
      lat: 38.7223,
      lon: -9.1393,
      label: 'Lisbon, Portugal',
    });
    expect(next.value).toBe('Lisbon, Portugal');
    expect(next.confirmedLocation?.source).toBe('nominatim_search');
  });

  it('clear resets to initial state', () => {
    const dirty = locationReducer(initialLocationState, { type: 'edit', value: 'x' });
    expect(locationReducer(dirty, { type: 'clear' })).toEqual(initialLocationState);
  });
});
