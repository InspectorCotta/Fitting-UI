import {
  regionMetric,
  simulateFocusedFit,
  isValidRegion,
  type FitAgent,
  type InvestigationReport,
  type RegionBlock,
} from './fitInvestigation';
import { plotInfo } from './plotData';

function pause(signal: AbortSignal, ms: number) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** No network, API key, model inference or optimizer. Deterministic mock LLM boundary. */
export const demoFitAgent: FitAgent = {
  async investigate(request, signal) {
    await pause(signal, 650);
    if (!isValidRegion(request.region))
      throw new Error('Choose finite, increasing selection bounds and at least one bias.');
    const metric = regionMetric(request.source.curves, request.region);
    if (!metric.points)
      throw new Error(
        'This region has no measured points. Widen the bounds or select another bias.',
      );
    const { kind, xRange } = request.region;
    const lowCurrent =
      kind === 'transfer' &&
      (xRange[1] < 0.35 || /subthreshold|leakage|low.current/i.test(request.prompt));
    const hypotheses: Extract<RegionBlock, { type: 'hypotheses' }> = {
      type: 'hypotheses',
      title: 'Parameters to investigate',
      items:
        kind === 'capacitance'
          ? [
              {
                parameter: 'TOX',
                explanation: 'Check oxide-thickness sensitivity against the selected C–V region.',
              },
              {
                parameter: 'VTH0',
                explanation: 'Inspect whether a voltage shift explains the transition mismatch.',
              },
            ]
          : lowCurrent
            ? [
                {
                  parameter: 'VTH0',
                  explanation:
                    'Inspect threshold alignment across the selected gate-voltage interval.',
                },
                {
                  parameter: 'ETA0',
                  explanation: 'Check bias dependence before changing the DIBL coefficient.',
                },
              ]
            : [
                {
                  parameter: 'U0',
                  explanation:
                    'Check current-amplitude sensitivity across the selected bias conditions.',
                },
                {
                  parameter: 'RDSW',
                  explanation: 'Inspect the resistance contribution at higher current.',
                },
              ],
    };
    const blocks: RegionBlock[] = [
      { type: 'metrics', title: 'Selected region' },
      {
        type: 'bias-errors',
        title: kind === 'capacitance' ? 'Error by capacitance' : 'Error by bias',
      },
      hypotheses,
      {
        type: 'objective',
        title: 'Suggested next-fit objective',
        explanation: `Increase the relative-error weight inside this ${plotInfo[kind].short.toLowerCase()} region. Keep the remaining reference points as guardrails and compare both groups after the run.`,
      },
    ];
    // Mimic an agent composing a bounded view for the user's objective.
    if (/parameter|sensitivity|threshold/i.test(request.prompt))
      blocks.splice(1, 0, blocks.splice(2, 1)[0]);
    const report: InvestigationReport = {
      request: structuredClone(request),
      summary: `${metric.points} reference points fall inside your selection. ${lowCurrent ? 'A focused low-current review is appropriate here.' : `Inspect the ${plotInfo[kind].short.toLowerCase()} residuals across the selected traces.`} ${metric.rms! < 1 ? 'The regional mismatch is already small; check whether extra weighting is useful.' : 'Compare local improvement against error outside the region.'}`,
      blocks,
      suggestedWeight: metric.rms! < 1 ? 2 : 4,
    };
    return report;
  },
  async runFocusedFit(report, weight, signal) {
    await pause(signal, 850);
    return simulateFocusedFit(report.request, weight);
  },
};
