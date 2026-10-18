export type PlotPoint = { x: number; y: number };
export type PlotSize = { width: number; height: number };
export type AxisRange = [number, number];
export const inPlot = (point: PlotPoint, size: PlotSize) =>
  point.x >= 0 && point.y >= 0 && point.x <= size.width && point.y <= size.height;
const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));
export function panRanges(
  start: PlotPoint,
  end: PlotPoint,
  size: PlotSize,
  x: AxisRange,
  y: AxisRange,
) {
  const dx = ((end.x - start.x) / size.width) * (x[1] - x[0]);
  const dy = ((end.y - start.y) / size.height) * (y[1] - y[0]);
  return {
    xRange: [x[0] - dx, x[1] - dx] as AxisRange,
    yRange: [y[0] + dy, y[1] + dy] as AxisRange,
  };
}
export function wheelRanges(
  point: PlotPoint,
  size: PlotSize,
  x: AxisRange,
  y: AxisRange,
  delta: number,
  mode: number,
) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? size.height : 1);
  const factor = Math.exp(Math.max(-240, Math.min(240, pixels)) * 0.0015);
  const zoom = (range: AxisRange, fraction: number): AxisRange => {
    const anchor = range[0] + fraction * (range[1] - range[0]);
    return [anchor + (range[0] - anchor) * factor, anchor + (range[1] - anchor) * factor];
  };
  return { xRange: zoom(x, point.x / size.width), yRange: zoom(y, 1 - point.y / size.height) };
}
export function zoomSelection(start: PlotPoint, end: PlotPoint, size: PlotSize) {
  if (size.width <= 0 || size.height <= 0) return null;
  const x1 = clamp(start.x, size.width),
    x2 = clamp(end.x, size.width);
  const y1 = clamp(start.y, size.height),
    y2 = clamp(end.y, size.height);
  const zoomX = Math.abs(x2 - x1) >= 6,
    zoomY = Math.abs(y2 - y1) >= 6;
  if (!zoomX && !zoomY) return null;
  return {
    left: zoomX ? Math.min(x1, x2) : 0,
    top: zoomY ? Math.min(y1, y2) : 0,
    width: zoomX ? Math.abs(x2 - x1) : size.width,
    height: zoomY ? Math.abs(y2 - y1) : size.height,
  };
}
/** Plotly's log-axis ranges are exponents, so the same pixel mapping handles both scales. */
export function rangesForSelection(
  start: PlotPoint,
  end: PlotPoint,
  size: PlotSize,
  x: AxisRange,
  y: AxisRange,
) {
  const box = zoomSelection(start, end, size);
  if (!box) return null;
  return {
    xRange: [
      x[0] + (box.left / size.width) * (x[1] - x[0]),
      x[0] + ((box.left + box.width) / size.width) * (x[1] - x[0]),
    ] as AxisRange,
    yRange: [
      y[0] + (1 - (box.top + box.height) / size.height) * (y[1] - y[0]),
      y[0] + (1 - box.top / size.height) * (y[1] - y[0]),
    ] as AxisRange,
  };
}
