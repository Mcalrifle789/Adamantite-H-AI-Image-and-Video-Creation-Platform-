import type { Point } from "@/lib/analytics-report";

/**
 * Traffic sparkline-with-axis.
 *
 * Inline SVG rather than a charting library: it is one series pair on one
 * dashboard, and Recharts would add far more to the bundle than this costs to
 * write. Rendered on the server, so there is no hydration and no loading state.
 */
export function TrafficChart({ series }: { series: Point[] }) {
  if (series.length === 0) {
    return (
      <p className="text-chrome-faint py-16 text-center text-sm">
        No page views recorded yet in this range.
      </p>
    );
  }

  const w = 900;
  const h = 240;
  const pad = { top: 16, right: 8, bottom: 28, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const peak = Math.max(1, ...series.map((p) => Math.max(p.views, p.visitors)));
  // Round the axis up to something a human would choose.
  const step = Math.pow(10, Math.floor(Math.log10(peak)));
  const top = Math.ceil(peak / step) * step;

  const x = (i: number) =>
    pad.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;

  const path = (key: "views" | "visitors") =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[key])}`).join(" ");

  const area =
    `${path("views")} L${x(series.length - 1)},${pad.top + innerH} ` +
    `L${x(0)},${pad.top + innerH} Z`;

  const ticks = [0, top / 2, top];

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-60 w-full"
        role="img"
        aria-label={`Page views and unique visitors per day. Peak ${peak}.`}
      >
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-crimson-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-crimson-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-edge)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-[var(--color-chrome-faint)] text-[11px]"
            >
              {Math.round(t)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#viewsFill)" />
        <path
          d={path("views")}
          fill="none"
          stroke="var(--color-crimson-400)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={path("visitors")}
          fill="none"
          stroke="var(--color-signal-green)"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {series.map((p, i) =>
          // Only label the ends and the middle, or the axis turns to mush.
          i === 0 || i === series.length - 1 || i === Math.floor(series.length / 2) ? (
            <text
              key={p.day}
              x={x(i)}
              y={h - 8}
              textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}
              className="fill-[var(--color-chrome-faint)] text-[11px]"
            >
              {p.day.slice(5)}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="text-chrome-dim mt-2 flex gap-5 text-xs">
        <span className="flex items-center gap-2">
          <span className="bg-crimson-400 inline-block h-0.5 w-5" /> Page views
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,var(--color-signal-green) 0 4px,transparent 4px 8px)",
            }}
          />
          Unique visitors
        </span>
      </figcaption>
    </figure>
  );
}

/** Horizontal bar list used for pages, referrers, countries and so on. */
export function BarList({
  rows,
  empty,
}: {
  rows: { label: string; count: number }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-chrome-faint py-6 text-sm">{empty}</p>;
  }
  const peak = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <li key={row.label} className="relative">
          <div
            aria-hidden="true"
            className="bg-crimson-900/45 absolute inset-y-0 left-0 rounded-sm"
            style={{ width: `${Math.max(2, (row.count / peak) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-2 py-1.5 text-sm">
            <span className="text-chrome truncate">{row.label}</span>
            <span className="text-chrome-dim shrink-0 tabular-nums">
              {row.count.toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
