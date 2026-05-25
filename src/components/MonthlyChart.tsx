'use client';

import type { ConsolidatedEstimate, SourceEstimate } from '@/lib/schemas';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export type MonthlyChartProps = {
  sources: SourceEstimate[];
  consolidated: ConsolidatedEstimate;
};

/**
 * Per PRD §13.3: grouped monthly columns showing PVGIS + PVWatts side-by-side
 * with a thin horizontal tick for the recommended average. Pure SVG, no chart
 * library — keeps bundle small and avoids "stacked = sum" semantics confusion.
 */
export function MonthlyChart({ sources, consolidated }: MonthlyChartProps) {
  const pvgis = sources.find((s) => s.source === 'pvgis');
  const pvwatts = sources.find((s) => s.source === 'pvwatts');

  const monthData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      label: MONTHS[i],
      pvgis: pvgis?.monthly.find((m) => m.month === month)?.kwh ?? null,
      pvwatts: pvwatts?.monthly.find((m) => m.month === month)?.kwh ?? null,
      avg: consolidated.monthly.find((m) => m.month === month)?.kwh ?? null,
    };
  });

  const max =
    Math.max(
      ...monthData.flatMap((d) => [d.pvgis, d.pvwatts, d.avg].filter((v): v is number => v !== null)),
      1,
    ) * 1.1;

  const width = 720;
  const height = 240;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const slot = chartW / 12;
  const barW = (slot - 8) / 2;

  const y = (v: number) => padT + chartH - (v / max) * chartH;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly production: PVGIS vs PVWatts with average overlay"
        className="w-full min-w-[640px]"
      >
        {/* y gridlines */}
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
          const xPvgis = slotX + (slot - 2 * barW - 4) / 2;
          const xPvwatts = xPvgis + barW + 4;
          return (
            <g key={idx}>
              {d.pvgis !== null ? (
                <rect
                  x={xPvgis}
                  y={y(d.pvgis)}
                  width={barW}
                  height={padT + chartH - y(d.pvgis)}
                  fill="#fbbf24"
                  rx={1}
                >
                  <title>{`PVGIS ${d.label}: ${Math.round(d.pvgis).toLocaleString()} kWh`}</title>
                </rect>
              ) : null}
              {d.pvwatts !== null ? (
                <rect
                  x={xPvwatts}
                  y={y(d.pvwatts)}
                  width={barW}
                  height={padT + chartH - y(d.pvwatts)}
                  fill="#f59e0b"
                  rx={1}
                >
                  <title>{`PVWatts ${d.label}: ${Math.round(d.pvwatts).toLocaleString()} kWh`}</title>
                </rect>
              ) : null}
              {d.avg !== null ? (
                <line
                  x1={xPvgis - 2}
                  x2={xPvwatts + barW + 2}
                  y1={y(d.avg)}
                  y2={y(d.avg)}
                  stroke="#18181b"
                  strokeWidth={1.5}
                >
                  <title>{`Average ${d.label}: ${Math.round(d.avg).toLocaleString()} kWh`}</title>
                </line>
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
        <Legend color="#fbbf24" label="PVGIS" />
        <Legend color="#f59e0b" label="PVWatts" />
        <Legend color="#18181b" label="Average" />
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
