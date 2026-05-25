'use client';

import type { ConsolidatedEstimate, SourceEstimate } from '@/lib/schemas';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export type MonthlyChartProps = {
  sources: SourceEstimate[];
  consolidated: ConsolidatedEstimate;
};

/**
 * Per PRD §13.3 + user feedback: one bar per month (12 bars total), stacked.
 *   - Bottom segment = min(PVGIS, PVWatts) — the value both providers agree on at least.
 *   - Top segment = |PVGIS − PVWatts| — the spread between them.
 *
 * This avoids the misleading "PVGIS + PVWatts = total production" reading
 * because the upper segment is explicitly the *difference*, not a second value.
 * No average line — the spread itself communicates uncertainty.
 */
export function MonthlyChart({ sources, consolidated: _consolidated }: MonthlyChartProps) {
  void _consolidated; // intentionally unused — kept in props for future extensions
  const pvgis = sources.find((s) => s.source === 'pvgis');
  const pvwatts = sources.find((s) => s.source === 'pvwatts');

  const monthData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const gisKwh = pvgis?.monthly.find((m) => m.month === month)?.kwh ?? null;
    const wattsKwh = pvwatts?.monthly.find((m) => m.month === month)?.kwh ?? null;
    const both = [gisKwh, wattsKwh].filter((v): v is number => v !== null);
    if (both.length === 0) {
      return { label: MONTHS[i], pvgis: gisKwh, pvwatts: wattsKwh, lower: null, delta: null };
    }
    const lower = Math.min(...both);
    const upper = Math.max(...both);
    return {
      label: MONTHS[i],
      pvgis: gisKwh,
      pvwatts: wattsKwh,
      lower,
      delta: upper - lower,
    };
  });

  const max =
    Math.max(
      ...monthData
        .map((d) => (d.lower !== null && d.delta !== null ? d.lower + d.delta : 0))
        .filter((v) => v > 0),
      1,
    ) * 1.1;

  const width = 720;
  const height = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const slot = chartW / 12;
  const barW = Math.min(slot * 0.62, 38);

  const y = (v: number) => padT + chartH - (v / max) * chartH;
  const h = (v: number) => (v / max) * chartH;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly production: shared baseline plus PVGIS-vs-PVWatts spread"
        className="w-full min-w-[640px]"
      >
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="#e4e4e7"
              strokeDasharray="3 3"
            />
            <text x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="#71717a">
              {Math.round(max * t).toLocaleString()}
            </text>
          </g>
        ))}

        {monthData.map((d, idx) => {
          const slotX = padL + idx * slot;
          const barX = slotX + (slot - barW) / 2;
          if (d.lower === null || d.delta === null) {
            return (
              <text
                key={idx}
                x={slotX + slot / 2}
                y={height - padB + 14}
                textAnchor="middle"
                fontSize="11"
                fill="#52525b"
              >
                {d.label}
              </text>
            );
          }
          const lowerH = h(d.lower);
          const deltaH = h(d.delta);
          const lowerY = padT + chartH - lowerH;
          const deltaY = lowerY - deltaH;
          const tooltip = `${d.label}: PVGIS ${
            d.pvgis !== null ? Math.round(d.pvgis).toLocaleString() : '—'
          } kWh, PVWatts ${
            d.pvwatts !== null ? Math.round(d.pvwatts).toLocaleString() : '—'
          } kWh, spread ${Math.round(d.delta).toLocaleString()} kWh`;
          return (
            <g key={idx}>
              {/* Lower segment: shared baseline (min of both providers) */}
              <rect
                x={barX}
                y={lowerY}
                width={barW}
                height={lowerH}
                fill="#f59e0b"
                rx={2}
              >
                <title>{tooltip}</title>
              </rect>
              {/* Upper segment: spread (difference) */}
              {d.delta > 0 ? (
                <rect
                  x={barX}
                  y={deltaY}
                  width={barW}
                  height={deltaH}
                  fill="#fde68a"
                  rx={2}
                >
                  <title>{tooltip}</title>
                </rect>
              ) : null}
              <text
                x={slotX + slot / 2}
                y={height - padB + 14}
                textAnchor="middle"
                fontSize="11"
                fill="#52525b"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-600">
        <Legend color="#f59e0b" label="Both providers agree (min)" />
        <Legend color="#fde68a" label="Provider spread (|PVGIS − PVWatts|)" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
