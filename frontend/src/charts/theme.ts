// Shared Recharts styling: graphite on dark, mono numbers, the portfolio's hairlines.

export const GRID = '#252c35';

/** Y-axis width that fits the longest tick label (Spanish "100 mil $" is longer than "$100K"). */
export function axisWidth(labels: string[]): number {
  const longest = Math.max(0, ...labels.map((l) => l.length));
  return Math.max(44, Math.round(longest * 7.6 + 14));
}

export const AXIS = {
  stroke: '#3a414c',
  tick: { fill: '#9aa0a8', fontSize: 12, fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
  tickLine: false,
  axisLine: { stroke: '#3a414c' },
} as const;

export const TOOLTIP = {
  contentStyle: {
    background: '#10141a',
    border: '1px solid #3a414c',
    borderRadius: 6,
    color: '#eceae4',
    fontSize: 13,
  },
  labelStyle: { color: '#9aa0a8', marginBottom: 2 },
  itemStyle: { color: '#eceae4', fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
} as const;

/* ---------------------------------------------------------------- "Night cockpit" theme
   Colors come from tokens.css (SVG attributes accept var()), so the palette lives in one place.
   Charts opt in with tone="cockpit" until every page has moved. */

export const COCKPIT = {
  grid: 'var(--data-grid)',
  bar: 'var(--data-rest)',
  barStrong: 'var(--data)',
  cursor: 'rgb(255 255 255 / 0.06)',
  axis: {
    stroke: 'var(--edge-control)',
    tick: { fill: 'var(--ink-2)', fontSize: 12, fontFamily: 'General Sans, ui-sans-serif, system-ui, sans-serif' },
    tickLine: false,
    axisLine: false,
  },
} as const;

/** Width of a y-axis in the text face (narrower glyphs than the mono face above). */
export function axisWidthSans(labels: string[]): number {
  const longest = Math.max(0, ...labels.map((l) => l.length));
  return Math.max(40, Math.round(longest * 6.6 + 14));
}
