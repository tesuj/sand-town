'use client';

import { useState } from 'react';
import type { ProspectRunResponse } from '@/lib/schemas';
import { MonthlyChart } from './MonthlyChart';

export type ResultViewProps = {
  result: ProspectRunResponse;
};

const fmt = (n: number | null, suffix: string) =>
  n === null ? '—' : `${Math.round(n).toLocaleString()} ${suffix}`;

export function ResultView({ result }: ResultViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const { consolidated, sources, assumptions, location } = result;

  if (!consolidated || !location || !assumptions) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Estimated annual production">
          <p className="text-3xl font-semibold tracking-tight">
            {fmt(consolidated.annualKwh, 'kWh/year')}
          </p>
          {consolidated.annualKwhPerKwp !== null ? (
            <p className="mt-1 text-sm text-zinc-600">
              {fmt(consolidated.annualKwhPerKwp, 'kWh/kWp/year')} for {assumptions.systemSizeKwp} kWp
            </p>
          ) : null}
        </Card>
        <Card title="Recommended average">
          <p className="text-3xl font-semibold tracking-tight">
            {fmt(consolidated.annualKwh, 'kWh/year')}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{consolidated.recommendationLabel}</p>
        </Card>
        <Card title="Difference between models">
          <p className="text-3xl font-semibold tracking-tight">
            {consolidated.deltaPercent === null ? '—' : `${consolidated.deltaPercent}%`}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {consolidated.deltaPercent === null
              ? 'Need two providers for a delta'
              : 'Spread between PVGIS and PVWatts'}
          </p>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Monthly production</h3>
        <MonthlyChart sources={sources} consolidated={consolidated} />
      </div>

      <SourceTable result={result} />

      <AssumptionsSummary
        location={location}
        assumptions={assumptions}
        anglesSource={result.anglesSource}
      />

      <details className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Developer details
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <span className="font-medium text-zinc-700">Run status:</span>{' '}
            <code className="rounded bg-white px-1 py-0.5">{result.status}</code>
          </div>
          <div>
            <span className="font-medium text-zinc-700">Provider statuses:</span>{' '}
            {sources.map((s) => (
              <code key={s.source} className="mr-1 rounded bg-white px-1 py-0.5">
                {s.source}: {s.status}
              </code>
            ))}
          </div>
          {result.warnings.length > 0 ? (
            <div>
              <span className="font-medium text-zinc-700">Warnings:</span>
              <ul className="mt-1 list-disc pl-5 text-zinc-600">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowRaw((s) => !s)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-100"
          >
            {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
          </button>
          {showRaw ? (
            <pre className="max-h-96 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SourceTable({ result }: { result: ProspectRunResponse }) {
  const { sources, consolidated } = result;
  if (!consolidated) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Sources</h3>
      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Annual production</th>
              <th className="px-4 py-2">Specific yield</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {sources.map((s) => (
              <tr key={s.source}>
                <td className="px-4 py-2 font-medium uppercase">{s.source}</td>
                <td className="px-4 py-2">{s.status}</td>
                <td className="px-4 py-2">{fmt(s.annualKwh, 'kWh/year')}</td>
                <td className="px-4 py-2">{fmt(s.annualKwhPerKwp, 'kWh/kWp/year')}</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 font-medium">
              <td className="px-4 py-2">Average</td>
              <td className="px-4 py-2">{consolidated.recommendationLabel}</td>
              <td className="px-4 py-2">{fmt(consolidated.annualKwh, 'kWh/year')}</td>
              <td className="px-4 py-2">{fmt(consolidated.annualKwhPerKwp, 'kWh/kWp/year')}</td>
            </tr>
            {consolidated.deltaPercent !== null ? (
              <tr>
                <td className="px-4 py-2">Difference</td>
                <td className="px-4 py-2" colSpan={3}>
                  {consolidated.deltaPercent}%
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssumptionsSummary({
  location,
  assumptions,
  anglesSource,
}: {
  location: NonNullable<ProspectRunResponse['location']>;
  assumptions: NonNullable<ProspectRunResponse['assumptions']>;
  anglesSource: ProspectRunResponse['anglesSource'];
}) {
  const angleBadge = anglesBadgeFor(anglesSource);
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Assumptions</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row term="Location" desc={location.displayLabel ?? `${location.lat}, ${location.lon}`} />
        <Row term="System size" desc={`${assumptions.systemSizeKwp} kWp`} />
        <Row term="Tilt" desc={`${assumptions.tiltDegrees}°`} badge={angleBadge} />
        <Row term="Azimuth (UI)" desc={`${assumptions.uiAzimuthDegrees}°`} badge={angleBadge} />
        <Row term="Losses" desc={`${assumptions.lossPercent}%`} />
        <Row term="Module" desc={assumptions.moduleType} />
        <Row term="Mounting" desc={assumptions.mountingType} />
      </dl>
    </div>
  );
}

function anglesBadgeFor(
  source: ProspectRunResponse['anglesSource'],
): { label: string; className: string } | null {
  if (!source || source === 'manual') return null;
  if (source === 'optimal_pvgis') {
    return {
      label: 'Auto · PVGIS',
      className: 'bg-emerald-100 text-emerald-800',
    };
  }
  return {
    label: 'Auto · heuristic fallback',
    className: 'bg-amber-100 text-amber-800',
  };
}

function Row({
  term,
  desc,
  badge,
}: {
  term: string;
  desc: string;
  badge?: { label: string; className: string } | null;
}) {
  return (
    <div className="flex justify-between gap-2 border-b border-zinc-100 py-1">
      <dt className="text-zinc-500">{term}</dt>
      <dd className="flex items-center gap-2 text-zinc-900">
        {desc}
        {badge ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
