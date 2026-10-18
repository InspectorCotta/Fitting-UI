import { describe, expect, it } from 'vitest';
import { rangesForSelection, zoomSelection, wheelRanges } from './plotGestures';

describe('right-drag box zoom', () => {
  const size = { width: 200, height: 100 };
  it('supports reverse drags and maps log axis ranges in exponent space', () => {
    expect(
      rangesForSelection({ x: 150, y: 75 }, { x: 50, y: 25 }, size, [0, 0.8], [-11, -3]),
    ).toEqual({ xRange: [0.2, 0.6000000000000001], yRange: [-9, -5] });
  });
  it('clamps drags outside the plot and ignores small clicks', () => {
    expect(zoomSelection({ x: 50, y: 25 }, { x: 300, y: -50 }, size)).toEqual({
      left: 50,
      top: 0,
      width: 150,
      height: 25,
    });
    expect(rangesForSelection({ x: 50, y: 25 }, { x: 53, y: 27 }, size, [0, 1], [0, 1])).toBeNull();
  });
  it('allows single-axis zoom when the other axis barely moves', () => {
    expect(rangesForSelection({ x: 50, y: 25 }, { x: 150, y: 28 }, size, [0, 1], [0, 1])).toEqual({
      xRange: [0.25, 0.75],
      yRange: [0, 1],
    });
    expect(rangesForSelection({ x: 50, y: 25 }, { x: 52, y: 75 }, size, [0, 1], [0, 1])).toEqual({
      xRange: [0, 1],
      yRange: [0.25, 0.75],
    });
  });
});

it('normalizes wheel units and reverses zoom without moving its anchor', () => {
  const point = { x: 50, y: 75 },
    size = { width: 200, height: 100 };
  const pixels = wheelRanges(point, size, [0, 1], [-11, -3], -16, 0);
  expect(wheelRanges(point, size, [0, 1], [-11, -3], -1, 1)).toEqual(pixels);
  expect(wheelRanges(point, size, [0, 1], [-11, -3], -0.16, 2)).toEqual(pixels);
  const restored = wheelRanges(point, size, pixels.xRange, pixels.yRange, 16, 0);
  expect(restored.xRange[0]).toBeCloseTo(0);
  expect(restored.xRange[1]).toBeCloseTo(1);
  expect(restored.yRange[0]).toBeCloseTo(-11);
  expect(restored.yRange[1]).toBeCloseTo(-3);
});
