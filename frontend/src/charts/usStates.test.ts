import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, STATE_NAMES, STATES } from './usStates';

describe('state shapes', () => {
  it('has the 50 states and DC exactly once', () => {
    const codes = STATES.map((s) => s.code);
    expect(codes).toHaveLength(51);
    expect(new Set(codes).size).toBe(51);
    expect(STATE_NAMES.ca).toBe('California');
    expect(STATE_NAMES.dc).toBe('District of Columbia');
  });

  it('gives every state a closed outline', () => {
    for (const state of STATES) {
      expect(state.d.startsWith('M'), state.code).toBe(true);
      expect(state.d.endsWith('z'), state.code).toBe(true);
      // only absolute moves, relative lines and closes: nothing a renderer could misread
      expect(/^[Mlz0-9.,-]+$/.test(state.d), state.code).toBe(true);
    }
  });

  it('keeps every label inside the map box', () => {
    for (const state of STATES) {
      expect(state.x, state.code).toBeGreaterThan(0);
      expect(state.x, state.code).toBeLessThan(MAP_WIDTH);
      expect(state.y, state.code).toBeGreaterThan(0);
      expect(state.y, state.code).toBeLessThan(MAP_HEIGHT);
      expect(state.area, state.code).toBeGreaterThan(0);
    }
  });
});
