// One theme for every chart. Colors are CSS variables from styles/tokens.css (SVG attributes
// accept var()), so the palette lives in one place.

const FONT = 'General Sans, ui-sans-serif, system-ui, sans-serif';

export const CHART = {
  grid: 'var(--data-grid)',
  /** a single series: the line or the emphasized mark */
  line: 'var(--data)',
  /** a single series: filled marks at rest */
  fill: 'var(--data-rest)',
  /** two things compared, in a fixed order */
  series: ['var(--series-a)', 'var(--series-b)'],
  /** what marks sit on: used for the ring that separates overlapping marks */
  surface: 'var(--surface-card-solid)',
  ink: 'var(--ink)',
  cursorBand: { fill: 'rgb(255 255 255 / 0.06)' },
  cursorLine: { stroke: 'var(--ink-3)', strokeWidth: 1, strokeDasharray: '3 3' },
  axis: {
    stroke: 'var(--edge-control)',
    tick: { fill: 'var(--ink-2)', fontSize: 12, fontFamily: FONT },
    tickLine: false,
    axisLine: false,
  },
  label: { fill: 'var(--ink)', fontSize: 12, fontWeight: 600, fontFamily: FONT },
} as const;

/** Width of a y-axis that fits its longest tick label (Spanish "100 mil $" is longer than "$100K"). */
export function axisWidth(labels: string[]): number {
  const longest = Math.max(0, ...labels.map((l) => l.length));
  return Math.max(36, Math.round(longest * 7 + 18));
}
