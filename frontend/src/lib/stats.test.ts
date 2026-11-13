import { describe, expect, it } from 'vitest';
import { binnedMedians, classOf, histogramMedian, median, niceScale, quantileBreaks, retention } from './stats';

describe('niceScale', () => {
  it('ends just above the data on a round step', () => {
    expect(niceScale(42_427)).toEqual({ max: 50_000, ticks: [0, 10_000, 20_000, 30_000, 40_000, 50_000] });
    expect(niceScale(30_839).max).toBe(40_000);
    expect(niceScale(100).ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it('keeps decimal steps exact', () => {
    expect(niceScale(0.9).ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('survives empty data', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });
});

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('histogramMedian', () => {
  it('interpolates inside the bucket that holds the middle listing', () => {
    // 100 listings: the 50th falls halfway through the second bucket
    const buckets = [
      { start: 0, count: 40 },
      { start: 2000, count: 20 },
      { start: 4000, count: 40 },
    ];
    expect(histogramMedian(buckets, 2000)).toBe(3000);
  });

  it('does not depend on the order of the buckets', () => {
    const buckets = [
      { start: 4000, count: 40 },
      { start: 0, count: 40 },
      { start: 2000, count: 20 },
    ];
    expect(histogramMedian(buckets, 2000)).toBe(3000);
  });

  it('returns null without listings', () => {
    expect(histogramMedian([], 2000)).toBeNull();
    expect(histogramMedian([{ start: 0, count: 0 }], 2000)).toBeNull();
  });
});

describe('binnedMedians', () => {
  const points = [
    ...[10, 20, 30, 40, 50].map((y) => ({ x: 5_000, y })),
    ...[1, 2, 3, 4, 5, 6].map((y) => ({ x: 25_000, y })),
    { x: 45_000, y: 999 }, // a lone point: not enough for a median
  ];

  it('takes the median of each bin with enough points', () => {
    expect(binnedMedians(points, 20_000)).toEqual([
      { from: 0, to: 20_000, x: 10_000, median: 30, count: 5 },
      { from: 20_000, to: 40_000, x: 30_000, median: 3.5, count: 6 },
    ]);
  });

  it('honors the minimum count', () => {
    expect(binnedMedians(points, 20_000, 1)).toHaveLength(3);
    expect(binnedMedians(points, 20_000, 6)).toHaveLength(1);
  });
});

describe('retention', () => {
  const history = [
    { year: 2022, price: 70_000, count: 3 }, // too few listings: not the base
    { year: 2021, price: 40_000, count: 50 },
    { year: 2016, price: 20_000, count: 80 },
    { year: 2019, price: 30_000, count: 60 },
    { year: 1995, price: 5_000, count: 40 },
  ];

  it('indexes each model year to the newest one with enough listings', () => {
    expect(retention(history, 20)).toEqual([
      { age: 0, year: 2021, price: 40_000, pct: 100 },
      { age: 2, year: 2019, price: 30_000, pct: 75 },
      { age: 5, year: 2016, price: 20_000, pct: 50 },
    ]);
  });

  it('can keep older model years', () => {
    expect(retention(history, 20, 30)).toHaveLength(4);
  });

  it('returns nothing when no model year has enough listings', () => {
    expect(retention(history, 1000)).toEqual([]);
  });
});

describe('quantile classes', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('splits values into equal-count classes', () => {
    const breaks = quantileBreaks(values, 5);
    expect(breaks).toEqual([1, 3, 5, 7, 9]);
    expect(values.map((v) => classOf(v, breaks))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('puts a single value in the lowest class', () => {
    expect(classOf(7, quantileBreaks([7], 5))).toBe(0);
    expect(quantileBreaks([], 5)).toEqual([]);
  });
});
