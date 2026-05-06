import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';

export type SeverityPercentileRow = {
  band: string;
  severity: string;
  count: number;
  percentile: number | null;
};

/** Theme-aware palette: critical → informational, aligned with BugChase emerald/zinc aesthetic. */
const WEDGE_COLORS_LIGHT = ['#e11d48', '#ea580c', '#d97706', '#059669', '#0284c7'];
const WEDGE_COLORS_DARK = ['#fb7185', '#fb923c', '#fbbf24', '#34d399', '#38bdf8'];

const TAU = Math.PI * 2;

function formatOrdinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function SeverityRadar({ rows, className = '' }: { rows: SeverityPercentileRow[]; className?: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = isDark ? WEDGE_COLORS_DARK : WEDGE_COLORS_LIGHT;
  const strokeGrid = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.12)';
  const strokeOutline = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(24,24,27,0.18)';
  const labelFill = isDark ? '#a1a1aa' : '#52525b';

  const safeRows = rows.filter((row) => row && row.band).slice(0, 6);
  const n = Math.max(3, safeRows.length || 0);
  const cx = 140;
  const cy = 140;
  const maxR = 92;
  const labelR = 118;

  const angles = useMemo(() => Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i * TAU) / n), [n]);

  const scales = useMemo(
    () =>
      safeRows.slice(0, n).map((row) => {
        const p = row.percentile;
        if (p == null) return 0.06;
        if (row.count === 0) return 0.06;
        return Math.max(0.08, Math.min(1, p / 100));
      }),
    [safeRows],
  );

  const wedges = useMemo(() => {
    const out: { d: string; fill: string; opacity: number }[] = [];
    for (let i = 0; i < n; i += 1) {
      const t0 = angles[i];
      const t1 = angles[(i + 1) % n];
      const r0 = maxR * scales[i];
      const r1 = maxR * scales[(i + 1) % n];
      const [x0, y0] = polar(cx, cy, r0, t0);
      const [x1, y1] = polar(cx, cy, r1, t1);
      const d = `M ${cx} ${cy} L ${x0} ${y0} L ${x1} ${y1} Z`;
      const fill = colors[i % colors.length];
      const opacity = 0.45 + 0.45 * Math.max(scales[i], scales[(i + 1) % n]);
      out.push({ d, fill, opacity: Math.min(0.95, opacity) });
    }
    return out;
  }, [angles, colors, cx, cy, maxR, scales]);

  const outlinePath = useMemo(() => {
    const pts = angles.map((t, i) => {
      const r = maxR * scales[i];
      return polar(cx, cy, r, t);
    });
    return `M ${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')} Z`;
  }, [angles, cx, cy, maxR, scales]);

  const gridRings = [0.35, 0.65, 1];

  if (!safeRows.length) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400 ${className}`}
      >
        No severity data yet
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 280 280" className="mx-auto h-64 w-full max-w-[280px]" aria-label="Severity priority radar">
        {gridRings.map((g) => {
          const pts = angles.map((t) => polar(cx, cy, maxR * g, t));
          const d = `M ${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')} Z`;
          return <path key={g} d={d} fill="none" stroke={strokeGrid} strokeWidth={1} />;
        })}
        {angles.map((t, i) => {
          const [x, y] = polar(cx, cy, maxR, t);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={strokeGrid} strokeWidth={1} />;
        })}
        {wedges.map((w, i) => (
          <path key={i} d={w.d} fill={w.fill} fillOpacity={w.opacity} stroke="none" />
        ))}
        <path d={outlinePath} fill="none" stroke={strokeOutline} strokeWidth={2} strokeLinejoin="round" />
        {safeRows.slice(0, n).map((row, i) => {
          const t = angles[i] + TAU / n / 2;
          const [lx, ly] = polar(cx, cy, labelR, t);
          return (
            <text
              key={row.band}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={labelFill}
              className="text-[10px] font-semibold uppercase tracking-wide"
            >
              {row.band}
            </text>
          );
        })}
      </svg>
      <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {safeRows.slice(0, n).map((row, i) => (
          <li key={row.band} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.band}</span>
              <span className="hidden text-zinc-400 sm:inline">({row.severity})</span>
            </span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {row.percentile != null ? formatOrdinal(row.percentile) : '—'} · {row.count} rep.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
