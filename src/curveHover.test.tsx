import { describe, expect, it } from 'vitest';
import type { Data } from 'plotly.js';
import { curvePairAt, interpolateCurve, placeCurveTooltip } from './curveHover';

describe('nearest curve pair', () => {
  it('interpolates measured and model at the same x despite different sampling grids', () => {
    const data: Data[] = [
      { x: [0, 1], y: [10, 20] },
      { x: [0, 0.25, 0.75, 1], y: [9, 13, 15, 19] },
      { x: [0, 1], y: [100, 200] },
      { x: [0, 1], y: [90, 210] },
    ];
    expect(curvePairAt(data, 1, 0.5, false)).toEqual({
      series: 0,
      x: 0.5,
      model: 15,
      measured: 14,
    });
    expect(curvePairAt(data, 0, 0.5, false)).toEqual(curvePairAt(data, 1, 0.5, false));
    expect(curvePairAt(data, 3, 0.5, false)).toEqual({
      series: 1,
      x: 0.5,
      model: 150,
      measured: 150,
    });
    expect(curvePairAt(data, 8, 0.5, false)).toBeNull();
    expect(curvePairAt(data, 0, 1.5, false)).toBeNull();
  });
  it('matches the drawn logarithmic segments and rejects hidden pairs', () => {
    expect(interpolateCurve([0, 1], [1e-9, 1e-5], 0.5, true)).toBeCloseTo(1e-7, 14);
    const data: Data[] = [
      { x: [0, 1], y: [1, 2], visible: false },
      { x: [0, 1], y: [1, 2] },
    ];
    expect(curvePairAt(data, 1, 0.5, false)).toBeNull();
  });
  it('places the tooltip beside the cursor and flips it at the plot edges', () => {
    const bounds = { width: 400, height: 260 },
      size = { width: 174, height: 76 };
    expect(placeCurveTooltip({ x: 80, y: 60 }, bounds, size)).toEqual({ left: 92, top: 72 });
    expect(placeCurveTooltip({ x: 390, y: 250 }, bounds, size)).toEqual({ left: 204, top: 162 });
    const clamped = placeCurveTooltip({ x: -20, y: -30 }, bounds, size);
    expect(clamped.left).toBeGreaterThanOrEqual(6);
    expect(clamped.top).toBeGreaterThanOrEqual(6);
  });
});
