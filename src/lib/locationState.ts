/**
 * LocationInputState reducer per PRD §9.5.1.
 *
 * `confirmedLocation` is the source of truth. The input text is display-only;
 * Calculate must never re-parse the app's own generated coordinate string.
 */

import { formatCoordinatePair, parseCoordinatePair } from '@/lib/coordinates';
import type { LocationSource } from '@/lib/schemas';

export type ConfirmedLocation = {
  lat: number;
  lon: number;
  source: LocationSource;
  label: string | null;
};

export type LocationInputState = {
  value: string;
  dirty: boolean;
  confirmedLocation: ConfirmedLocation | null;
};

export const initialLocationState: LocationInputState = {
  value: '',
  dirty: false,
  confirmedLocation: null,
};

export type LocationAction =
  | { type: 'edit'; value: string }
  | { type: 'confirm_coordinates'; lat: number; lon: number; source: LocationSource; label?: string | null }
  | { type: 'confirm_geocoded'; lat: number; lon: number; label: string }
  | { type: 'clear' }
  | { type: 'focus_select' };

export function locationReducer(state: LocationInputState, action: LocationAction): LocationInputState {
  switch (action.type) {
    case 'edit': {
      // Allow parser to recover a confirmed location when the user pastes coords.
      const coords = parseCoordinatePair(action.value);
      if (coords) {
        return {
          value: formatCoordinatePair(coords.lat, coords.lon),
          dirty: false,
          confirmedLocation: {
            lat: coords.lat,
            lon: coords.lon,
            source: 'manual_coordinates',
            label: null,
          },
        };
      }
      return { ...state, value: action.value, dirty: true };
    }
    case 'confirm_coordinates':
      return {
        value: formatCoordinatePair(action.lat, action.lon),
        dirty: false,
        confirmedLocation: {
          lat: action.lat,
          lon: action.lon,
          source: action.source,
          label: action.label ?? null,
        },
      };
    case 'confirm_geocoded':
      return {
        value: action.label,
        dirty: false,
        confirmedLocation: {
          lat: action.lat,
          lon: action.lon,
          source: 'nominatim_search',
          label: action.label,
        },
      };
    case 'clear':
      return initialLocationState;
    case 'focus_select':
      // Marker for tests; actual select-all happens in the DOM handler.
      return state;
    default:
      return state;
  }
}
