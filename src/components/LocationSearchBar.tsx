'use client';

import { useRef } from 'react';

export type LocationSearchBarProps = {
  value: string;
  dirty: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFindMyLocation: () => void;
  disabled?: boolean;
  geolocating?: boolean;
};

export function LocationSearchBar({
  value,
  dirty,
  onChange,
  onSubmit,
  onFindMyLocation,
  disabled,
  geolocating,
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
              onSubmit();
            }
          }}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-100"
        />
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
        {dirty && value.length > 0 ? ' • unresolved — press Calculate to resolve' : ''}
      </p>
    </div>
  );
}
