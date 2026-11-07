import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, GRID_ROWS, TILES } from './usStates';
import { quantileClasses } from './scale';

describe('tile map layout', () => {
  it('has the 50 states and DC exactly once', () => {
    const codes = TILES.map((t) => t.code);
    expect(codes).toHaveLength(51);
    expect(new Set(codes).size).toBe(51);
  });

  it('never puts two states on one tile, and stays inside the grid', () => {
    const cells = TILES.map((t) => `${t.col},${t.row}`);
    expect(new Set(cells).size).toBe(TILES.length);
    for (const t of TILES) {
      expect(t.col).toBeGreaterThanOrEqual(0);
      expect(t.col).toBeLessThan(GRID_COLUMNS);
      expect(t.row).toBeGreaterThanOrEqual(0);
      expect(t.row).toBeLessThan(GRID_ROWS);
    }
  });
});

describe('quantile classes', () => {
  it('splits values into equal-count classes', () => {
    const classes = quantileClasses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(classes)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('handles a single value', () => {
    expect(quantileClasses([7], 5)(7)).toBe(0);
  });
});
