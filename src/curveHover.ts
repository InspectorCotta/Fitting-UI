import type { Data } from 'plotly.js';

export type CurvePair = {
  series: number;
  x: number;
  measured: number;
  model: number;
  candidate?: number;
};
export function interpolateCurve(x: number[], y: number[], voltage: number, logarithmic: boolean) {
  if (x.length < 2 || x.length !== y.length || voltage < x[0] || voltage > x[x.length - 1])
    return null;
  let low = 0,
    high = x.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (x[mid] <= voltage) low = mid;
    else high = mid;
  }
  const fraction = (voltage - x[low]) / (x[high] - x[low]);
  if (logarithmic && y[low] > 0 && y[high] > 0)
    return Math.exp(Math.log(y[low]) + fraction * (Math.log(y[high]) - Math.log(y[low])));
  return y[low] + fraction * (y[high] - y[low]);
}

/** Interpolate the two plotted traces at one voltage, rather than mixing nearby x samples. */
export function curvePairAt(
  data: Data[],
  curveNumber: number,
  voltage: number,
  logarithmic: boolean,
): CurvePair | null {
  if (
    !Number.isInteger(curveNumber) ||
    curveNumber < 0 ||
    curveNumber >= data.length ||
    !Number.isFinite(voltage)
  )
    return null;
  const series = Math.floor(curveNumber / 2);
  const values = [data[series * 2], data[series * 2 + 1]].map((trace) => {
    if (!trace || ('visible' in trace && trace.visible === false)) return null;
    const { x, y } = trace as { x?: unknown; y?: unknown };
    if (
      !Array.isArray(x) ||
      !Array.isArray(y) ||
      !x.every(Number.isFinite) ||
      !y.every(Number.isFinite)
    )
      return null;
    return interpolateCurve(x, y, voltage, logarithmic);
  });
  return values[0] !== null && values[1] !== null
    ? { series, x: voltage, model: values[0], measured: values[1] }
    : null;
}

export function placeCurveTooltip(
  cursor: { x: number; y: number },
  bounds: { width: number; height: number },
  size: { width: number; height: number },
) {
  const padding = 6,
    gap = 12;
  let left = cursor.x + gap,
    top = cursor.y + gap;
  if (left + size.width > bounds.width - padding) left = cursor.x - size.width - gap;
  if (top + size.height > bounds.height - padding) top = cursor.y - size.height - gap;
  return {
    left: Math.max(padding, Math.min(left, bounds.width - size.width - padding)),
    top: Math.max(padding, Math.min(top, bounds.height - size.height - padding)),
  };
}

export function formatCurveValue(value: number) {
  return value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 10000)
    ? value.toExponential(2)
    : String(Number(value.toPrecision(4)));
}
