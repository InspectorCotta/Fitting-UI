import { describe, expect, it } from 'vitest';
import { initialParameters } from './data';
import { defaultChartView, plotKinds } from './plotData';
import {
  calculateFitMetrics,
  createDemoSavedFit,
  createFitComparisonFigure,
  exampleSavedFits,
  fitCompatibility,
  isSavedFit,
  normalizeSavedFits,
  parameterDifferences,
} from './savedFits';

describe('saved fit data boundary', () => {
  it('captures immutable numeric curves and parameter values that survive serialization', () => {
    const values = initialParameters.map((p) => p.value);
    const saved = createDemoSavedFit('Reference', values);
    const frozen = JSON.stringify(saved);
    values[0] = 0.49;
    createDemoSavedFit('Changed', values);
    expect(JSON.stringify(saved)).toBe(frozen);
    expect(saved.parameters[0].value).toBe(0.412);
    expect(isSavedFit(JSON.parse(frozen))).toBe(true);
    expect(saved.metrics.overall.points).toBe(319);
    expect(() => createDemoSavedFit('Invalid', [NaN])).toThrow();
  });
  it('calculates relative errors from supplied samples and keeps zero reference points finite', () => {
    const fit = exampleSavedFits()[0];
    for (const kind of plotKinds)
      for (const curve of fit.curves[kind]) {
        curve.measured.fill(1);
        curve.modelY.fill(1.2);
      }
    const metrics = calculateFitMetrics(fit.curves);
    expect(metrics.overall.rms).toBeCloseTo(20);
    expect(metrics.overall.max).toBeCloseTo(20);
    for (const kind of plotKinds) expect(metrics[kind].rms).toBeCloseTo(20);
    fit.curves.output[0].measured.fill(0);
    fit.curves.output[0].modelY.fill(0);
    expect(Number.isFinite(calculateFitMetrics(fit.curves).overall.rms)).toBe(true);
  });
  it('uses both saved model arrays and one measurement set in the overlay, including visibility', () => {
    const [candidate, , baseline] = exampleSavedFits();
    const before = JSON.stringify([baseline, candidate]);
    for (const kind of plotKinds) {
      const figure = createFitComparisonFigure(
        kind,
        baseline.curves[kind],
        candidate.curves[kind],
        { ...defaultChartView(kind), hidden: [0] },
        'white',
      );
      const count = baseline.curves[kind].length;
      expect(figure.data).toHaveLength(count * 3);
      expect(figure.data[0]).toMatchObject({
        y: baseline.curves[kind][0].modelY,
        visible: false,
        line: { dash: 'dash' },
      });
      expect(figure.data[1]).toMatchObject({
        y: baseline.curves[kind][0].measured,
        mode: 'markers',
        visible: false,
      });
      expect(figure.data[count * 2]).toMatchObject({
        y: candidate.curves[kind][0].modelY,
        visible: false,
      });
    }
    expect(JSON.stringify([baseline, candidate])).toBe(before);
  });
  it('rejects incompatible measurement contexts and reference values', () => {
    const [a, b] = exampleSavedFits();
    expect(fitCompatibility(a, b)).toBeNull();
    b.measurementSetId = 'different';
    expect(fitCompatibility(a, b)).toMatch(/same model family and measurement set/);
    b.measurementSetId = a.measurementSetId;
    b.curves.transfer[0].measured[0] *= 2;
    expect(fitCompatibility(a, b)).toMatch(/different reference measurements/);
  });
  it('fits both snapshots into initial axes while preserving a user zoom', () => {
    const fit = exampleSavedFits()[0];
    const larger = structuredClone(fit);
    larger.curves.output.forEach((curve) => curve.modelY.fill(2));
    const view = defaultChartView('output');
    const automatic = createFitComparisonFigure(
      'output',
      fit.curves.output,
      larger.curves.output,
      view,
      'black',
    );
    expect(automatic.layout.yaxis!.range![1]).toBeGreaterThan(2);
    const zoomed = createFitComparisonFigure(
      'output',
      fit.curves.output,
      larger.curves.output,
      { ...view, yRange: [0.2, 0.5] },
      'black',
    );
    expect(zoomed.layout.yaxis!.range).toEqual([0.2, 0.5]);
  });
  it('keeps delta direction explicit and avoids percentages for missing or zero baselines', () => {
    const [a, b] = exampleSavedFits();
    a.parameters[0].value = 0;
    b.parameters[0].value = 0.1;
    b.parameters.pop();
    const rows = parameterDifferences(a, b);
    expect(rows[0]).toMatchObject({ delta: 0.1, percent: null, changed: true });
    expect(rows.at(-1)).toMatchObject({ candidate: undefined, delta: null, changed: true });
    const [left, right] = exampleSavedFits();
    expect(parameterDifferences(left, right)[0].delta).toBeCloseTo(
      -parameterDifferences(right, left)[0].delta!,
    );
  });
  it('migrates old libraries, preserves a deliberately empty library and filters malformed snapshots', () => {
    const fit = exampleSavedFits()[0];
    const broken = structuredClone(fit);
    broken.curves.transfer[0].modelY.pop();
    expect(normalizeSavedFits(undefined)).toHaveLength(3);
    expect(normalizeSavedFits([])).toEqual([]);
    expect(normalizeSavedFits([null, {}, broken, fit, fit])).toEqual([fit]);
  });
});
