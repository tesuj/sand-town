'use client';

import { useRef } from 'react';

export type LocationSearchBarProps = {
  value: string;
  dirty: boolean;
  onChange: (value: string) => void;
  /** Triggered by Enter on the input AND by clicking the magnifier button. */
  onResolve: () => void;
  onFindMyLocation: () => void;
  disabled?: boolean;
  geolocating?: boolean;
  resolving?: boolean;
};

export function LocationSearchBar({
  value,
  dirty,
  onChange,
  onResolve,
  onFindMyLocation,
  disabled,
  geolocating,
  resolving,
}: LocationSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="location" className="text-sm font-medium text-zinc-700">
        Location
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="location"
          name="location"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          placeholder="Enter address or coordinates"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onResolve();
            }
          }}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-100"
        />
        <button
          type="button"
          onClick={onResolve}
          disabled={disabled || resolving || value.trim().length === 0}
          aria-label="Search this address on the map"
          title="Search this address on the map"
          className="shrink-0 inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {resolving ? (
            <Spinner />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onFindMyLocation}
          disabled={disabled || geolocating}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {geolocating ? 'Locating…' : 'Find my location'}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Example: Lisbon, Portugal or 38.7223, -9.1393
        {dirty && value.length > 0 ? ' • unresolved — press search or Calculate' : ''}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
