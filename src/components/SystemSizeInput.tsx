'use client';

export type SystemSizeInputProps = {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
};

const MIN = 0.1;
const MAX = 100_000;

export function SystemSizeInput({ value, onChange, disabled }: SystemSizeInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="system-size" className="text-sm font-medium text-zinc-700">
        System size
      </label>
      <div className="flex items-center gap-2">
        <input
          id="system-size"
          name="system-size"
          type="number"
          inputMode="decimal"
          min={MIN}
          max={MAX}
          step="0.1"
          value={Number.isFinite(value) ? value : ''}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.currentTarget.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-100"
        />
        <span className="text-sm text-zinc-600">kWp</span>
      </div>
      {value < MIN || value > MAX ? (
        <p className="text-xs text-amber-700">System size must be between {MIN} and {MAX} kWp.</p>
      ) : null}
    </div>
  );
}
