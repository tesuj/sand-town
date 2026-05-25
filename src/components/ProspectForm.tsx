'use client';

import dynamic from 'next/dynamic';
import { useReducer, useState } from 'react';

import { LocationSearchBar } from './LocationSearchBar';
import { SystemSizeInput } from './SystemSizeInput';
import { ExpertMode, DEFAULT_EXPERT, type ExpertAssumptions } from './ExpertMode';
import { ResultView } from './ResultView';
import {
  initialLocationState,
  locationReducer,
} from '@/lib/locationState';
import type { ProspectLocation, ProspectRunResponse } from '@/lib/schemas';

// Leaflet hits window/document — load only on client.
const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
      Loading map…
    </div>
  ),
});

type FormState =
  | { kind: 'idle' }
  | { kind: 'calculating' }
  | { kind: 'needs_choice'; candidates: ProspectLocation[] }
  | { kind: 'error'; message: string }
  | { kind: 'result'; result: ProspectRunResponse };

export function ProspectForm() {
  const [loc, dispatch] = useReducer(locationReducer, initialLocationState);
  const [systemSize, setSystemSize] = useState(10);
  const [expert, setExpert] = useState<ExpertAssumptions>(DEFAULT_EXPERT);
  const [geolocating, setGeolocating] = useState(false);
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  const calculating = state.kind === 'calculating';
  const disabled = calculating || geolocating;

  const onCalculate = async () => {
    if (systemSize <= 0) {
      setState({ kind: 'error', message: 'System size must be greater than 0 kWp.' });
      return;
    }

    setState({ kind: 'calculating' });
    try {
      const body: Record<string, unknown> = {
        locationInput: loc.value || loc.confirmedLocation?.label || '',
        systemSizeKwp: systemSize,
        lossPercent: expert.lossPercent,
        moduleType: expert.moduleType,
        mountingType: expert.mountingType,
        tiltDegrees: expert.tiltDegrees,
        azimuthDegrees: expert.azimuthDegrees,
      };
      // PRD §9.5.1 rule 5: use confirmedLocation directly when not dirty.
      if (!loc.dirty && loc.confirmedLocation) {
        body.lat = loc.confirmedLocation.lat;
        body.lon = loc.confirmedLocation.lon;
        body.locationSource = loc.confirmedLocation.source;
        if (!body.locationInput) body.locationInput = `${loc.confirmedLocation.lat}, ${loc.confirmedLocation.lon}`;
      }
      if (!body.locationInput) {
        setState({ kind: 'error', message: 'Enter a location or click the map first.' });
        return;
      }

      const response = await fetch('/api/prospect-runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as ProspectRunResponse;

      if (data.status === 'needs_location_choice') {
        setState({ kind: 'needs_choice', candidates: data.candidates ?? [] });
        return;
      }
      if (data.status === 'invalid_location') {
        setState({
          kind: 'error',
          message: data.warnings[0] ?? 'We could not understand that location.',
        });
        return;
      }
      if (data.status === 'failed' || data.status === 'provider_error') {
        setState({
          kind: 'error',
          message: data.warnings[0] ?? 'Both providers failed. Please try again.',
        });
        return;
      }
      setState({ kind: 'result', result: data });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  };

  const onFindMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        kind: 'error',
        message: 'We could not access your location. Enter an address or coordinates instead.',
      });
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch({
          type: 'confirm_coordinates',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'browser_geolocation',
        });
        setGeolocating(false);
      },
      () => {
        setGeolocating(false);
        setState({
          kind: 'error',
          message: 'We could not access your location. Enter an address or coordinates instead.',
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const onPickCandidate = (c: ProspectLocation) => {
    dispatch({
      type: 'confirm_geocoded',
      lat: c.lat,
      lon: c.lon,
      label: c.displayLabel ?? `${c.lat}, ${c.lon}`,
    });
    setState({ kind: 'idle' });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <LocationSearchBar
          value={loc.value}
          dirty={loc.dirty}
          onChange={(value) => dispatch({ type: 'edit', value })}
          onSubmit={onCalculate}
          onFindMyLocation={onFindMyLocation}
          disabled={disabled}
          geolocating={geolocating}
        />
        <MapView
          lat={loc.confirmedLocation?.lat ?? null}
          lon={loc.confirmedLocation?.lon ?? null}
          onPick={(lat, lon) =>
            dispatch({ type: 'confirm_coordinates', lat, lon, source: 'map_click' })
          }
        />
        <div className="flex flex-wrap items-end gap-6">
          <SystemSizeInput value={systemSize} onChange={setSystemSize} disabled={disabled} />
          <button
            type="button"
            onClick={onCalculate}
            disabled={disabled}
            className="rounded-md bg-zinc-900 px-5 py-2 text-base font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          >
            {calculating ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
        <ExpertMode value={expert} onChange={setExpert} />
      </section>

      {state.kind === 'error' ? (
        <ErrorBanner message={state.message} />
      ) : null}

      {state.kind === 'needs_choice' ? (
        <CandidatePicker candidates={state.candidates} onPick={onPickCandidate} />
      ) : null}

      {state.kind === 'result' ? <ResultView result={state.result} /> : null}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {message}
    </div>
  );
}

function CandidatePicker({
  candidates,
  onPick,
}: {
  candidates: ProspectLocation[];
  onPick: (c: ProspectLocation) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700">Choose location</h3>
      <p className="mt-1 text-xs text-zinc-500">Multiple matches — pick the right one to continue.</p>
      <ul className="mt-4 divide-y divide-zinc-100">
        {candidates.map((c, idx) => (
          <li key={`${c.lat}-${c.lon}-${idx}`}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="w-full text-left py-3 hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-zinc-900">{c.displayLabel}</p>
              <p className="text-xs text-zinc-500">
                {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
