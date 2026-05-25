'use client';

import type { ModuleType, MountingType } from '@/lib/schemas';

export type ExpertAssumptions = {
  lossPercent: number;
  tiltDegrees: number;
  azimuthDegrees: number;
  moduleType: ModuleType;
  mountingType: MountingType;
};

export const DEFAULT_EXPERT: ExpertAssumptions = {
  lossPercent: 14,
  tiltDegrees: 35,
  azimuthDegrees: 180,
  moduleType: 'standard',
  mountingType: 'free',
};

export type ExpertModeProps = {
  value: ExpertAssumptions;
  onChange: (next: ExpertAssumptions) => void;
};

export function ExpertMode({ value, onChange }: ExpertModeProps) {
  const set = <K extends keyof ExpertAssumptions>(k: K, v: ExpertAssumptions[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <details className="rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700">
        Expert mode
        <span className="ml-2 text-xs font-normal text-zinc-500">
          Advanced assumptions: tilt, azimuth, losses, module, mounting
        </span>
      </summary>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Losses %"
          value={value.lossPercent}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) => set('lossPercent', v)}
        />
        <NumberField
          label="Tilt °"
          value={value.tiltDegrees}
          min={0}
          max={90}
          step={1}
          onChange={(v) => set('tiltDegrees', v)}
        />
        <NumberField
          label="Azimuth ° (180=S, 90=E, 270=W)"
          value={value.azimuthDegrees}
          min={0}
          max={360}
          step={1}
          onChange={(v) => set('azimuthDegrees', v)}
        />
        <SelectField
          label="Module type"
          value={value.moduleType}
          options={[
            { value: 'standard', label: 'Standard / crystalline Si' },
            { value: 'premium', label: 'Premium' },
            { value: 'thinfilm', label: 'Thin film' },
          ]}
          onChange={(v) => set('moduleType', v as ModuleType)}
        />
        <SelectField
          label="Mounting type"
          value={value.mountingType}
          options={[
            { value: 'free', label: 'Free / open rack' },
            { value: 'roof', label: 'Roof / fixed mount' },
          ]}
          onChange={(v) => set('mountingType', v as MountingType)}
        />
      </div>
    </details>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
