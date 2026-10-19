import type { AxisRange } from './plotGestures';
import {
  createFigure,
  defaultChartView,
  plotInfo,
  plotKinds,
  type CurveSamples,
  type PlotKind,
} from './plotData';
import { interpolateCurve } from './curveHover';
import { initialParameters } from './data';
import { calculateFitMetrics, createDemoSavedFit, type SavedFit } from './savedFits';

/** Bounds always use physical data units, including when selected on a log axis. */
export type FitRegion = {
  kind: PlotKind;
  xRange: AxisRange;
  yRange: AxisRange;
  series: number[];
};
export type InvestigationRequest = {
  schemaVersion: 1;
  id: string;
  source: SavedFit;
  region: FitRegion;
  prompt: string;
};
export type RegionMetric = { rms: number | null; points: number };
export type RegionBlock =
  | { type: 'metrics'; title: string }
  | { type: 'bias-errors'; title: string }
  | { type: 'hypotheses'; title: string; items: { parameter: string; explanation: string }[] }
  | { type: 'objective'; title: string; explanation: string };
export type InvestigationReport = {
  request: InvestigationRequest;
  summary: string;
  blocks: RegionBlock[];
  suggestedWeight: number;
};
export type FocusedFitResult = {
  curves: SavedFit['curves'];
  regionBefore: RegionMetric;
  regionAfter: RegionMetric;
  outsideBefore: RegionMetric;
  outsideAfter: RegionMetric;
  weight: number;
};

/** Replace this adapter with HTTP calls to a future LLM and fitting service. */
export interface FitAgent {
  investigate(request: InvestigationRequest, signal: AbortSignal): Promise<InvestigationReport>;
  runFocusedFit(
    report: InvestigationReport,
    weight: number,
    signal: AbortSignal,
  ): Promise<FocusedFitResult>;
}

export function regionFromAxes(
  kind: PlotKind,
  xRange: AxisRange,
  yRange: AxisRange,
  logarithmic: boolean,
  hidden: number[],
): FitRegion {
  return {
    kind,
    xRange: [...xRange],
    yRange: logarithmic ? [10 ** yRange[0], 10 ** yRange[1]] : [...yRange],
    series: plotInfo[kind].series.map((_, i) => i).filter((i) => !hidden.includes(i)),
  };
}

export function isValidRegion(region: FitRegion) {
  return (
    [region.xRange, region.yRange].every(
      (range) => range.every(Number.isFinite) && range[0] < range[1],
    ) &&
    region.series.length > 0 &&
    region.series.every(
      (i) => Number.isInteger(i) && i >= 0 && i < plotInfo[region.kind].series.length,
    )
  );
}

export function inRegion(region: FitRegion, series: number, x: number, measured: number) {
  return (
    region.series.includes(series) &&
    x >= region.xRange[0] &&
    x <= region.xRange[1] &&
    measured >= region.yRange[0] &&
    measured <= region.yRange[1]
  );
}

export function snapshotForInvestigation(
  shift: number,
  values = initialParameters.map((p) => p.value),
): SavedFit {
  const snapshot = createDemoSavedFit('Live model at selection', values);
  // Capture exactly the curves on screen, even when a caller supplies only a shift.
  for (const kind of plotKinds) {
    const figure = createFigure(kind, shift, defaultChartView(kind), 'black');
    snapshot.curves[kind] = plotInfo[kind].series.map((name, i) => {
      const model = figure.data[i * 2] as { x: number[]; y: number[] };
      const measured = figure.data[i * 2 + 1] as { x: number[]; y: number[] };
      return {
        name,
        x: [...measured.x],
        measured: [...measured.y],
        modelX: [...model.x],
        modelY: [...model.y],
      };
    });
  }
  snapshot.metrics = calculateFitMetrics(snapshot.curves);
  return snapshot;
}

/** Same relative-error floor as saved-fit comparisons; selection uses reference points. */
export function regionMetric(
  curves: SavedFit['curves'],
  region: FitRegion,
  outside = false,
  onlySeries?: number,
): RegionMetric {
  const errors: number[] = [];
  for (const kind of plotKinds) {
    curves[kind].forEach((series, index) => {
      if (onlySeries !== undefined && index !== onlySeries) return;
      const floor = Math.max(...series.measured.map(Math.abs), 1e-12) * 1e-6;
      series.x.forEach((x, i) => {
        const selected = kind === region.kind && inRegion(region, index, x, series.measured[i]);
        if (outside ? selected : !selected) return;
        const model = interpolateCurve(series.modelX, series.modelY, x, kind === 'transfer');
        if (model === null) return;
        errors.push((model - series.measured[i]) / Math.max(Math.abs(series.measured[i]), floor));
      });
    });
  }
  return {
    points: errors.length,
    rms: errors.length
      ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length) * 100
      : null,
  };
}

/** Deliberate UI surrogate: move selected samples toward measurements, never solve parameters. */
export function simulateFocusedFit(
  request: InvestigationRequest,
  weight: number,
): FocusedFitResult {
  const { source, region } = request;
  if (!isValidRegion(region) || regionMetric(source.curves, region).points === 0)
    throw new Error('Select a region containing measured points.');
  if (!Number.isFinite(weight) || weight < 1 || weight > 8)
    throw new Error('Choose a region weight between 1 and 8.');
  const curves = structuredClone(source.curves);
  curves[region.kind] = curves[region.kind].map((series, index): CurveSamples => {
    if (!region.series.includes(index)) return series;
    // Include reference x positions so before/after metrics describe the plotted candidate exactly.
    const modelX = [...new Set([...series.modelX, ...series.x])].sort((a, b) => a - b);
    const modelY = modelX.map((x) => {
      const before = interpolateCurve(series.modelX, series.modelY, x, region.kind === 'transfer')!;
      const measured = interpolateCurve(series.x, series.measured, x, region.kind === 'transfer')!;
      if (!inRegion(region, index, x, measured)) return before;
      // Taper toward selection edges to avoid an abrupt local correction.
      const position = (x - region.xRange[0]) / (region.xRange[1] - region.xRange[0]);
      const taper = Math.min(1, Math.max(0, Math.min(position, 1 - position) * 8));
      return before + (measured - before) * (weight / (weight + 1)) * taper;
    });
    return { ...series, modelX, modelY };
  });
  return {
    curves,
    weight,
    regionBefore: regionMetric(source.curves, region),
    regionAfter: regionMetric(curves, region),
    outsideBefore: regionMetric(source.curves, region, true),
    outsideAfter: regionMetric(curves, region, true),
  };
}
