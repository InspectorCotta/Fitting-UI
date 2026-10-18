import type { Data } from 'plotly.js';
import { initialParameters } from './data';
import { interpolateCurve } from './curveHover';
import {
  createFigure,
  defaultChartView,
  plotInfo,
  plotKinds,
  type ChartView,
  type CurveSamples,
  type PlotKind,
} from './plotData';

export const MAX_SAVED_FITS = 12;
export type FitMetric = { rms: number; max: number; points: number };
/** Data boundary for the comparison UI. A backend can supply these snapshots directly. */
export type SavedFit = {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  origin: 'example' | 'saved';
  modelFamily: string;
  measurementSetId: string;
  measurementLabel: string;
  parameters: { name: string; value: number; unit: string }[];
  curves: Record<PlotKind, CurveSamples[]>;
  metrics: Record<PlotKind, FitMetric> & { overall: FitMetric };
};

/** The existing browser demo's surrogate mapping, not a fitting engine. */
export function demoParameterShift(values: number[]) {
  return (
    (values[0] - 0.412) * 1.5 +
    (320 - values[1]) / 5500 +
    (values[2] - 1.1) * 0.045 +
    (values[3] - 245) / 15000 +
    (values[4] - 0.065) * 0.15
  );
}

function metric(errors: number[]): FitMetric {
  return {
    rms: Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length) * 100,
    max: Math.max(...errors.map(Math.abs)) * 100,
    points: errors.length,
  };
}

export function calculateFitMetrics(curves: SavedFit['curves']): SavedFit['metrics'] {
  const all: number[] = [];
  const result = {} as SavedFit['metrics'];
  for (const kind of plotKinds) {
    const errors = curves[kind].flatMap((series) => {
      const floor = Math.max(...series.measured.map(Math.abs), 1e-12) * 1e-6;
      return series.x.map((x, i) => {
        const model = interpolateCurve(series.modelX, series.modelY, x, kind === 'transfer')!;
        return (model - series.measured[i]) / Math.max(Math.abs(series.measured[i]), floor);
      });
    });
    result[kind] = metric(errors);
    all.push(...errors);
  }
  result.overall = metric(all);
  return result;
}

/** Fixture factory is deliberately separate from the presentation components. */
export function createDemoSavedFit(
  name: string,
  values: number[],
  options: { id?: string; createdAt?: string; origin?: SavedFit['origin'] } = {},
): SavedFit {
  if (
    values.length !== initialParameters.length ||
    values.some(
      (value, i) =>
        !Number.isFinite(value) ||
        value < initialParameters[i].min ||
        value > initialParameters[i].max,
    )
  ) {
    throw new Error('Save a fit with all parameters inside their supported ranges.');
  }
  const curves = {} as SavedFit['curves'];
  for (const kind of plotKinds) {
    const figure = createFigure(kind, demoParameterShift(values), defaultChartView(kind), 'black');
    curves[kind] = plotInfo[kind].series.map((series, i) => {
      const model = figure.data[i * 2] as { x: number[]; y: number[] };
      const measured = figure.data[i * 2 + 1] as { x: number[]; y: number[] };
      return {
        name: series,
        x: [...measured.x],
        measured: [...measured.y],
        modelX: [...model.x],
        modelY: [...model.y],
      };
    });
  }
  return {
    schemaVersion: 1,
    id: options.id || `fit-${crypto.randomUUID()}`,
    name: name.trim(),
    createdAt: options.createdAt || new Date().toISOString(),
    origin: options.origin || 'saved',
    modelFamily: 'BSIM-CMG demo',
    measurementSetId: 'mosfit-synthetic-300k-v1',
    measurementLabel: 'Synthetic GAA measurements · 300 K',
    parameters: initialParameters.map((parameter, i) => ({
      name: parameter.name,
      value: values[i],
      unit: parameter.unit,
    })),
    curves,
    metrics: calculateFitMetrics(curves),
  };
}

export function exampleSavedFits(): SavedFit[] {
  return [
    createDemoSavedFit(
      'Current reference',
      initialParameters.map((p) => p.value),
      { id: 'example-reference', origin: 'example', createdAt: '2026-10-16T12:00:00Z' },
    ),
    createDemoSavedFit('DC refinement', [0.421, 305, 1.12, 260, 0.07], {
      id: 'example-refinement',
      origin: 'example',
      createdAt: '2026-10-15T12:00:00Z',
    }),
    createDemoSavedFit('Initial baseline', [0.438, 280, 1.2, 285, 0.08], {
      id: 'example-baseline',
      origin: 'example',
      createdAt: '2026-10-14T12:00:00Z',
    }),
  ];
}

const finiteArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite);
const increasing = (values: number[]) =>
  values.every((value, i) => i === 0 || value > values[i - 1]);
export function isSavedFit(value: unknown): value is SavedFit {
  const fit = value as SavedFit | null;
  return (
    !!fit &&
    fit.schemaVersion === 1 &&
    typeof fit.id === 'string' &&
    !!fit.id &&
    typeof fit.name === 'string' &&
    !!fit.name.trim() &&
    Number.isFinite(Date.parse(fit.createdAt)) &&
    ['example', 'saved'].includes(fit.origin) &&
    typeof fit.modelFamily === 'string' &&
    typeof fit.measurementSetId === 'string' &&
    typeof fit.measurementLabel === 'string' &&
    Array.isArray(fit.parameters) &&
    fit.parameters.length > 0 &&
    new Set(fit.parameters.map((p) => p?.name)).size === fit.parameters.length &&
    fit.parameters.every(
      (p) => typeof p?.name === 'string' && Number.isFinite(p.value) && typeof p.unit === 'string',
    ) &&
    plotKinds.every((kind) => {
      const series = fit.curves?.[kind];
      const summary = fit.metrics?.[kind];
      return (
        Array.isArray(series) &&
        series.length === plotInfo[kind].series.length &&
        series.every(
          (s) =>
            typeof s?.name === 'string' &&
            finiteArray(s.x) &&
            finiteArray(s.measured) &&
            finiteArray(s.modelX) &&
            finiteArray(s.modelY) &&
            s.x.length === s.measured.length &&
            s.modelX.length === s.modelY.length &&
            increasing(s.x) &&
            increasing(s.modelX) &&
            s.x[0] >= s.modelX[0] &&
            s.x.at(-1)! <= s.modelX.at(-1)!,
        ) &&
        !!summary &&
        Number.isFinite(summary.rms) &&
        summary.rms >= 0 &&
        Number.isFinite(summary.max) &&
        summary.max >= 0 &&
        Number.isInteger(summary.points) &&
        summary.points > 0
      );
    }) &&
    !!fit.metrics?.overall &&
    Number.isFinite(fit.metrics.overall.rms) &&
    fit.metrics.overall.rms >= 0 &&
    Number.isFinite(fit.metrics.overall.max) &&
    fit.metrics.overall.max >= 0 &&
    Number.isInteger(fit.metrics.overall.points) &&
    fit.metrics.overall.points > 0
  );
}

/** Undefined migrates older projects; an explicitly empty library stays empty. */
export function normalizeSavedFits(value: unknown): SavedFit[] {
  if (value === undefined) return exampleSavedFits();
  if (!Array.isArray(value)) return [];
  return value
    .filter(isSavedFit)
    .filter((fit, i, fits) => fits.findIndex((other) => other.id === fit.id) === i)
    .slice(0, MAX_SAVED_FITS);
}

export function fitCompatibility(a: SavedFit, b: SavedFit): string | null {
  if (a.modelFamily !== b.modelFamily || a.measurementSetId !== b.measurementSetId)
    return 'Choose fits from the same model family and measurement set.';
  for (const kind of plotKinds) {
    if (
      a.curves[kind].length !== b.curves[kind].length ||
      a.curves[kind].some((series, i) => {
        const other = b.curves[kind][i];
        return (
          series.name !== other.name ||
          JSON.stringify(series.x) !== JSON.stringify(other.x) ||
          JSON.stringify(series.measured) !== JSON.stringify(other.measured)
        );
      })
    )
      return 'These fits use different reference measurements. Choose matching snapshots.';
  }
  return null;
}

export function parameterDifferences(a: SavedFit, b: SavedFit) {
  return [...new Set([...a.parameters, ...b.parameters].map((p) => p.name))].map((name) => {
    const baseline = a.parameters.find((p) => p.name === name);
    const candidate = b.parameters.find((p) => p.name === name);
    const delta =
      baseline && candidate && baseline.unit === candidate.unit
        ? candidate.value - baseline.value
        : null;
    return {
      name,
      unit: candidate?.unit || baseline?.unit || '',
      baseline: baseline?.value,
      candidate: candidate?.value,
      delta,
      percent: delta !== null && baseline?.value ? (delta / Math.abs(baseline.value)) * 100 : null,
      changed: delta === null || Math.abs(delta) > 1e-10,
    };
  });
}

/** Baseline and measurements remain adjacent; the candidate traces follow them. */
export function createFitComparisonFigure(
  kind: PlotKind,
  a: CurveSamples[],
  b: CurveSamples[],
  view: ChartView,
  theme: string,
) {
  const base = createFigure(kind, 0, view, theme, a);
  const candidate = createFigure(kind, 0, view, theme, b);
  base.data = base.data.map((trace, index) =>
    index % 2
      ? trace
      : ({
          ...trace,
          line: { ...(trace as { line: object }).line, dash: 'dash', width: 2 },
          name: `A · ${a[Math.floor(index / 2)].name}`,
        } as Data),
  );
  base.data.push(
    ...candidate.data
      .filter((_, index) => index % 2 === 0)
      .map(
        (trace, i) =>
          ({
            ...trace,
            uid: `${kind}-${i}-candidate`,
            name: `B · ${b[i].name}`,
            line: { ...(trace as { line: object }).line, width: 2.4 },
          }) as Data,
      ),
  );
  // Fit both snapshots on first inspection; preserve an explicitly chosen zoom range.
  if (!view.yRange) {
    const values = base.data.flatMap((trace) => {
      const series = trace as { visible?: boolean; y?: number[] };
      return series.visible === false
        ? []
        : (series.y || [])
            .filter((value) => Number.isFinite(value) && (view.scale !== 'log' || value > 0))
            .map((value) => (view.scale === 'log' ? Math.log10(value) : value));
    });
    if (values.length) {
      const [low, high] = base.layout.yaxis!.range!;
      const min = Math.min(...values),
        max = Math.max(...values);
      const padding = Math.max(max - min, high - low) * 0.04;
      base.layout.yaxis!.range = [
        min < low ? min - padding : low,
        max > high ? max + padding : high,
      ];
    }
  }
  return base;
}
