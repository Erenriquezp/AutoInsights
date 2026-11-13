// Small statistics for the charts. Everything here is derived in the browser from what the API
// already returns. Pure functions, unit-tested in stats.test.ts.

/** An axis that ends just above the data: round steps (1, 2, 2.5, 5 x 10^n), about `target` of them. */
export function niceScale(max: number, target = 4): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const power = 10 ** Math.floor(Math.log10(max / target));
  const steps = (s: number) => Math.ceil(max / s - 1e-9);
  // the step whose number of ticks is closest to the target; on a tie, the one that wastes less
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * power)
    .sort((a, b) => Math.abs(steps(a) - target) - Math.abs(steps(b) - target) || steps(a) * a - steps(b) * b)[0];
  const count = steps(step);
  return { max: count * step, ticks: Array.from({ length: count + 1 }, (_, i) => +(i * step).toPrecision(12)) };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface Bucket {
  start: number;
  count: number;
}

/** Median of binned data, interpolated inside the bucket where half of the total is reached. */
export function histogramMedian(buckets: Bucket[], size: number): number | null {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return null;
  let seen = 0;
  for (const bucket of [...buckets].sort((a, b) => a.start - b.start)) {
    if (seen + bucket.count >= total / 2) {
      return bucket.start + ((total / 2 - seen) / bucket.count) * size;
    }
    seen += bucket.count;
  }
  return null;
}

export interface Bin {
  from: number;
  to: number;
  /** middle of the bin: where its median is drawn */
  x: number;
  median: number;
  count: number;
}

/** Median of y per fixed-width bin of x. Bins with fewer than `minCount` points are left out. */
export function binnedMedians(points: { x: number; y: number }[], size: number, minCount = 5): Bin[] {
  const groups = new Map<number, number[]>();
  for (const p of points) {
    const from = Math.floor(p.x / size) * size;
    const group = groups.get(from);
    if (group) group.push(p.y);
    else groups.set(from, [p.y]);
  }
  return [...groups.entries()]
    .filter(([, ys]) => ys.length >= minCount)
    .sort(([a], [b]) => a - b)
    .map(([from, ys]) => ({ from, to: from + size, x: from + size / 2, median: median(ys) as number, count: ys.length }));
}

export interface RetentionPoint {
  /** years older than the newest model year with enough listings */
  age: number;
  year: number;
  price: number;
  /** price as a percentage of that newest model year's price */
  pct: number;
}

/** How much of the newest model year's asking price each older model year keeps. */
export function retention(history: { year: number; price: number; count: number }[], minCount: number, maxAge = 20): RetentionPoint[] {
  const reliable = history.filter((h) => h.count >= minCount && h.price > 0).sort((a, b) => b.year - a.year);
  const base = reliable[0];
  if (!base) return [];
  return reliable
    .map((h) => ({ age: base.year - h.year, year: h.year, price: h.price, pct: (h.price / base.price) * 100 }))
    .filter((p) => p.age <= maxAge);
}

/** Lower bounds of `count` equal-count classes, lowest first (the first bound is the minimum). */
export function quantileBreaks(values: number[], count: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  return Array.from({ length: count }, (_, i) => sorted[Math.min(sorted.length - 1, Math.ceil((i / count) * sorted.length))]);
}

/** Class of a value given the lower bounds from quantileBreaks (0 = lowest). */
export function classOf(value: number, breaks: number[]): number {
  let level = 0;
  // a bound equal to the one before it opens no new class (few or tied values)
  for (let i = 1; i < breaks.length; i++) if (value >= breaks[i] && breaks[i] > breaks[i - 1]) level = i;
  return level;
}
