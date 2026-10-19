import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { ArrowRight, Download, LoaderCircle, Scan, Sparkles, Square, Undo2 } from 'lucide-react';
import { Dialog } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { CurveChart } from './ScientificChart';
import { formatCurveValue } from './curveHover';
import { defaultChartView, plotInfo, type ChartView } from './plotData';
import { demoFitAgent } from './demoFitAgent';
import {
  isValidRegion,
  regionMetric,
  type FitAgent,
  type FitRegion,
  type FocusedFitResult,
  type InvestigationReport,
  type InvestigationRequest,
  type RegionBlock,
} from './fitInvestigation';

const percent = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);
const value = (n: number) => formatCurveValue(n);

function focusView(region: FitRegion): ChartView {
  const scale = region.kind === 'transfer' && region.yRange[0] > 0 ? 'log' : 'linear';
  const y = region.yRange.map((n) => (scale === 'log' ? Math.log10(n) : n));
  const padX = (region.xRange[1] - region.xRange[0]) * 0.12;
  const padY = (y[1] - y[0]) * 0.12;
  return {
    scale,
    hidden: plotInfo[region.kind].series.map((_, i) => i).filter((i) => !region.series.includes(i)),
    xRange: [region.xRange[0] - padX, region.xRange[1] + padX],
    yRange: [y[0] - padY, y[1] + padY],
  };
}

/** Renders a bounded component plan from an injected agent, alongside a captured plot. */
export function RegionInvestigation({
  request,
  open,
  onOpenChange,
  onReselect,
  onRegionChange,
  download,
  agent = demoFitAgent,
  returnFocusRef,
}: {
  request: InvestigationRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReselect: () => void;
  onRegionChange: (region: FitRegion) => void;
  download?: (name: string, content: string) => void;
  agent?: FitAgent;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const { region, source } = request;
  const info = plotInfo[region.kind];
  const [prompt, setPrompt] = useState(request.prompt);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [preview, setPreview] = useState<FocusedFitResult | null>(null);
  const [busy, setBusy] = useState<'investigate' | 'fit' | null>(null);
  const [error, setError] = useState('');
  const [weight, setWeight] = useState(4);
  const [view, setView] = useState(() => focusView(region));
  const [editBounds, setEditBounds] = useState(false);
  const [bounds, setBounds] = useState([...region.xRange, ...region.yRange].map(String));
  const [series, setSeries] = useState(region.series);
  const operation = useRef<AbortController | null>(null);
  const selectedMetric = useMemo(() => regionMetric(source.curves, region), [source, region]);
  const biasMetrics = useMemo(
    () =>
      region.series.map((i) => ({ index: i, ...regionMetric(source.curves, region, false, i) })),
    [source, region],
  );
  const alternate = useMemo(
    () =>
      preview ? { label: 'Simulated candidate', samples: preview.curves[region.kind] } : undefined,
    [preview, region.kind],
  );

  function cancel() {
    operation.current?.abort();
    operation.current = null;
    setBusy(null);
  }
  useEffect(() => {
    if (!open) {
      operation.current?.abort();
      setBusy(null);
    }
    return () => operation.current?.abort();
  }, [open]);

  async function run(mode: 'investigate' | 'fit') {
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(mode);
    setError('');
    try {
      if (mode === 'investigate') {
        setPreview(null);
        const result = await agent.investigate(
          { ...request, prompt: prompt.trim() },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setReport(result);
        setWeight(result.suggestedWeight);
      } else if (report) {
        const result = await agent.runFocusedFit(report, weight, controller.signal);
        if (controller.signal.aborted) return;
        setPreview(result);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : 'The demo agent could not complete this request. Try again.',
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(null);
        operation.current = null;
      }
    }
  }

  function updateBounds(event: FormEvent) {
    event.preventDefault();
    const numbers = bounds.map((n) => (n.trim() ? Number(n) : NaN));
    const next: FitRegion = {
      kind: region.kind,
      xRange: [numbers[0], numbers[1]],
      yRange: [numbers[2], numbers[3]],
      series,
    };
    if (!isValidRegion(next)) {
      setError('Use finite, increasing bounds and select at least one trace.');
      return;
    }
    onRegionChange(next);
  }

  function blockContent(block: RegionBlock) {
    switch (block.type) {
      case 'metrics':
        return (
          <div className="region-agent-metrics">
            <div>
              <strong>{selectedMetric.points}</strong>
              <span>reference points</span>
            </div>
            <div>
              <strong>{percent(selectedMetric.rms)}</strong>
              <span>regional relative RMS</span>
            </div>
          </div>
        );
      case 'bias-errors':
        return (
          <div className="region-bias-errors">
            {biasMetrics.map((row) => (
              <div key={row.index}>
                <span>
                  <i style={{ background: `var(--curve-${row.index})` }} />
                  {info.series[row.index]}
                </span>
                <strong>
                  {percent(row.rms)}
                  <small>{row.points} points</small>
                </strong>
              </div>
            ))}
          </div>
        );
      case 'hypotheses':
        return (
          <>
            <p className="region-caveat">Example hypotheses to check with sensitivity analysis.</p>
            <ul className="region-hypotheses">
              {block.items.map((item) => (
                <li key={item.parameter}>
                  <code>{item.parameter}</code>
                  <p>{item.explanation}</p>
                </li>
              ))}
            </ul>
          </>
        );
      case 'objective':
        return <p>{block.explanation}</p>;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${info.short} region investigation`}
      description="Inspect a selected plot region with a mock agent and preview a simulated focused fit. No LLM or fitting backend is connected."
      fullscreen
      returnFocusRef={returnFocusRef}
    >
      <div className="region-investigation">
        <div className="region-demo-strip">
          <span>
            <Sparkles size={13} /> Demo agent · no LLM connected
          </span>
          <span>Captured synthetic data · live parameters stay unchanged</span>
        </div>
        <div className="region-investigation-grid">
          <div className="region-inspection">
            <div className="region-inspection-toolbar">
              <div>
                <span className="region-selection-chip">
                  <Scan size={13} /> Selected region
                </span>
                <span>
                  {value(region.xRange[0])}–{value(region.xRange[1])} V · {region.series.length}{' '}
                  traces
                </span>
              </div>
              <div>
                <Button variant="ghost" size="sm" onClick={() => setView(focusView(region))}>
                  Focus selection
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView({ ...defaultChartView(region.kind), hidden: view.hidden })}
                >
                  Show context
                </Button>
                <Button variant="outline" size="sm" onClick={onReselect}>
                  <Scan size={13} /> Reselect
                </Button>
              </div>
            </div>
            <CurveChart
              kind={region.kind}
              samples={source.curves[region.kind]}
              comparison={alternate}
              modelLabel={preview ? 'Captured baseline' : 'Captured model'}
              region={region}
              view={view}
              onViewChange={setView}
              fill
            />
            {preview && (
              <div
                className="region-fit-outcome"
                aria-label="Focused demo fit results"
                role="region"
              >
                <div>
                  <span>Selected region · relative RMS</span>
                  <strong>
                    {percent(preview.regionBefore.rms)} <ArrowRight size={15} />{' '}
                    {percent(preview.regionAfter.rms)}
                  </strong>
                  <small>
                    {preview.regionAfter.points} reference points · weight {preview.weight}×
                  </small>
                </div>
                <div>
                  <span>Outside selection · relative RMS</span>
                  <strong>
                    {percent(preview.outsideBefore.rms)} <ArrowRight size={15} />{' '}
                    {percent(preview.outsideAfter.rms)}
                  </strong>
                  <small>
                    {preview.outsideAfter.points} reference points · all other plots included
                  </small>
                </div>
              </div>
            )}
            <p className="region-metric-note">
              Relative RMS uses a floor of 10⁻⁶ × each reference trace’s peak. Selection membership
              uses measured points and captured trace visibility.
            </p>
          </div>
          <aside className="region-agent" aria-label="Demo fit agent">
            <div className="region-agent-heading">
              <span className="region-agent-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <h3>Investigate this region</h3>
                <p>A focused workspace for your next fit.</p>
              </div>
            </div>
            <details className="region-scope">
              <summary>Selection & captured source</summary>
              <dl>
                <div>
                  <dt>{info.x}</dt>
                  <dd>
                    {value(region.xRange[0])} to {value(region.xRange[1])}
                  </dd>
                </div>
                <div>
                  <dt>{info.y}</dt>
                  <dd>
                    {value(region.yRange[0])} to {value(region.yRange[1])}
                  </dd>
                </div>
                <div>
                  <dt>Captured</dt>
                  <dd>{new Date(source.createdAt).toLocaleTimeString()}</dd>
                </div>
              </dl>
              <Button variant="ghost" size="sm" onClick={() => setEditBounds(!editBounds)}>
                {editBounds ? 'Hide bounds editor' : 'Edit bounds & traces'}
              </Button>
              {editBounds && (
                <form className="region-bounds-form" onSubmit={updateBounds}>
                  {['X minimum', 'X maximum', 'Y minimum', 'Y maximum'].map((label, i) => (
                    <label key={label}>
                      {label}
                      <input
                        aria-label={label}
                        type="number"
                        step="any"
                        required
                        value={bounds[i]}
                        onChange={(e) =>
                          setBounds((current) =>
                            current.map((n, index) => (index === i ? e.target.value : n)),
                          )
                        }
                      />
                    </label>
                  ))}
                  <fieldset>
                    <legend>Reference traces</legend>
                    {info.series.map((name, i) => (
                      <label key={name}>
                        <input
                          type="checkbox"
                          checked={series.includes(i)}
                          onChange={(e) =>
                            setSeries((current) =>
                              e.target.checked
                                ? [...current, i].sort()
                                : current.filter((n) => n !== i),
                            )
                          }
                        />
                        {name}
                      </label>
                    ))}
                  </fieldset>
                  <Button type="submit" variant="outline" size="sm">
                    Update selection
                  </Button>
                </form>
              )}
            </details>
            <form
              className="region-prompt"
              onSubmit={(event) => {
                event.preventDefault();
                void run('investigate');
              }}
            >
              <label htmlFor="region-agent-prompt">What should the next fit improve?</label>
              <textarea
                id="region-agent-prompt"
                rows={3}
                maxLength={1200}
                value={prompt}
                onChange={(e) => {
                  cancel();
                  setPrompt(e.target.value);
                  setReport(null);
                  setPreview(null);
                  setError('');
                }}
                placeholder="Describe the mismatch or tradeoff you want to investigate…"
              />
              <div className="region-prompt-suggestions">
                {['Explain the mismatch', 'Inspect parameter sensitivity'].map((text) => (
                  <button
                    type="button"
                    key={text}
                    onClick={() => {
                      cancel();
                      setPrompt(`${text} in this region. Preserve the fit elsewhere.`);
                      setReport(null);
                      setPreview(null);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <Button type="submit" disabled={!!busy || !prompt.trim() || !selectedMetric.points}>
                <Sparkles size={14} />
                {report ? 'Investigate again' : 'Investigate selection'}
              </Button>
            </form>
            {!selectedMetric.points && (
              <p className="region-empty" role="status">
                No measured points in this box. Edit the bounds or reselect a region containing
                reference markers.
              </p>
            )}
            {busy && (
              <div className="region-agent-working" role="status">
                <LoaderCircle size={16} />
                <span>
                  {busy === 'investigate'
                    ? 'Inspecting captured samples…'
                    : 'Simulating a focused fit…'}
                </span>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  <Square size={12} /> Stop
                </Button>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {report && (
              <div className="region-agent-response" aria-label="Agent investigation" role="region">
                <p className="region-agent-summary">{report.summary}</p>
                {report.blocks.map((block) => (
                  <section className="region-agent-card" key={block.type}>
                    <h4>{block.title}</h4>
                    {blockContent(block)}
                  </section>
                ))}
                <section className="region-agent-card region-next-fit">
                  <h4>Try a focused follow-up</h4>
                  <label htmlFor="region-fit-weight">
                    Region weight <strong>{weight}×</strong>
                  </label>
                  <input
                    id="region-fit-weight"
                    aria-label="Region weight"
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={weight}
                    disabled={!!busy}
                    onChange={(e) => {
                      setWeight(Number(e.target.value));
                      setPreview(null);
                    }}
                  />
                  <p>
                    Unselected reference points are preserved. This preview moves local curve
                    samples toward measurements; it does not solve physical parameters.
                  </p>
                  <Button onClick={() => void run('fit')} disabled={!!busy}>
                    Run focused demo fit <ArrowRight size={14} />
                  </Button>
                  {preview && (
                    <>
                      <p className="region-preview-ready" role="status">
                        Simulated candidate ready. Inspect both error groups and the overlay.
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                        <Undo2 size={13} /> Discard preview
                      </Button>
                    </>
                  )}
                </section>
              </div>
            )}
            {!report && !busy && selectedMetric.points > 0 && (
              <div className="region-agent-intro">
                <Scan size={25} />
                <p>Your selection becomes the agent’s context.</p>
                <span>
                  The demo assembles region metrics, a bias breakdown, parameter hypotheses, and a
                  next-fit objective from these samples.
                </span>
              </div>
            )}
            {download && (
              <Button
                variant="outline"
                className="region-export"
                disabled={!!busy}
                onClick={() =>
                  download(
                    `fit-region-${request.id}.json`,
                    JSON.stringify(
                      {
                        schemaVersion: 1,
                        mode: 'demo-no-llm',
                        request: { ...request, prompt },
                        report,
                        focusedFit: preview,
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Download size={14} /> Export investigation
              </Button>
            )}
          </aside>
        </div>
      </div>
    </Dialog>
  );
}
