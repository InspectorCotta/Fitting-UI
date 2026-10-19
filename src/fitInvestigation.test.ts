import { expect, it } from 'vitest';
import {
  regionFromAxes,
  regionMetric,
  simulateFocusedFit,
  snapshotForInvestigation,
  type FitRegion,
  type InvestigationRequest,
} from './fitInvestigation';
import { demoFitAgent } from './demoFitAgent';
import { interpolateCurve } from './curveHover';

const region: FitRegion = {
  kind: 'transfer',
  xRange: [-0.15, 0.25],
  yRange: [1e-11, 1e-3],
  series: [0, 2],
};
const request = (): InvestigationRequest => ({
  schemaVersion: 1,
  id: 'test',
  region: structuredClone(region),
  source: snapshotForInvestigation(0.025),
  prompt: 'Inspect threshold sensitivity.',
});

it('converts log-axis exponents to physical bounds and captures only visible traces', () => {
  expect(regionFromAxes('transfer', [-0.1, 0.3], [-9, -5], true, [1, 3])).toEqual({
    kind: 'transfer',
    xRange: [-0.1, 0.3],
    yRange: [1e-9, 1e-5],
    series: [0, 2],
  });
  expect(regionFromAxes('output', [0.1, 0.5], [0.2, 0.6], false, [])).toMatchObject({
    yRange: [0.2, 0.6],
  });
});

it('improves selected reference points, preserves all other reference predictions, and never mutates the source', () => {
  const input = request();
  const original = structuredClone(input);
  const result = simulateFocusedFit(input, 4);
  expect(input).toEqual(original);
  expect(result.regionBefore.points).toBeGreaterThan(0);
  expect(result.regionAfter.rms!).toBeLessThan(result.regionBefore.rms!);
  expect(result.outsideAfter.rms).toBeCloseTo(result.outsideBefore.rms!, 10);
  expect(result.curves.output).toEqual(input.source.curves.output);
  expect(result.curves.capacitance).toEqual(input.source.curves.capacitance);
  expect(result.curves.transfer[1]).toEqual(input.source.curves.transfer[1]);
  result.curves.transfer.forEach((series, index) => {
    expect(series.measured).toEqual(input.source.curves.transfer[index].measured);
    series.x.forEach((x, i) => {
      if (
        region.series.includes(index) &&
        x >= region.xRange[0] &&
        x <= region.xRange[1] &&
        series.measured[i] >= region.yRange[0] &&
        series.measured[i] <= region.yRange[1]
      )
        return;
      const before = input.source.curves.transfer[index];
      expect(interpolateCurve(series.modelX, series.modelY, x, true)).toBeCloseTo(
        interpolateCurve(before.modelX, before.modelY, x, true)!,
        12,
      );
    });
  });
  expect(simulateFocusedFit(input, 8).regionAfter.rms!).toBeLessThan(
    simulateFocusedFit(input, 1).regionAfter.rms!,
  );
});

it('reports empty selections without inventing an error metric or fit', () => {
  const input = request();
  input.region.yRange = [20, 30];
  expect(regionMetric(input.source.curves, input.region)).toEqual({ points: 0, rms: null });
  expect(() => simulateFocusedFit(input, 4)).toThrow('measured points');
  input.region.xRange = [1, -1];
  expect(() => simulateFocusedFit(input, 4)).toThrow();
});

it('composes different bounded review plans for the plot and objective', async () => {
  const input = request();
  const report = await demoFitAgent.investigate(input, new AbortController().signal);
  expect(report.blocks[1].type).toBe('hypotheses');
  expect(report.blocks).toContainEqual(
    expect.objectContaining({
      type: 'hypotheses',
      items: expect.arrayContaining([expect.objectContaining({ parameter: 'VTH0' })]),
    }),
  );
  input.region = { kind: 'capacitance', xRange: [0, 0.7], yRange: [0, 2], series: [0, 1, 2] };
  input.prompt = 'Explain this mismatch.';
  const caps = await demoFitAgent.investigate(input, new AbortController().signal);
  expect(caps.blocks[1].type).toBe('bias-errors');
  expect(caps.blocks).toContainEqual(
    expect.objectContaining({
      type: 'hypotheses',
      items: expect.arrayContaining([expect.objectContaining({ parameter: 'TOX' })]),
    }),
  );
  expect(report.request.region.kind).toBe('transfer');
});

it('cancels pending agent work through the integration boundary', async () => {
  const controller = new AbortController();
  const pending = demoFitAgent.investigate(request(), controller.signal);
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await rejected;
});
