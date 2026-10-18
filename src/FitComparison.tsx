import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  GitCompareArrows,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { Select } from './components/ui/select';
import { CurveChart } from './ScientificChart';
import { defaultChartView, plotInfo, plotKinds, type ChartView, type PlotKind } from './plotData';
import { fitCompatibility, MAX_SAVED_FITS, parameterDifferences, type SavedFit } from './savedFits';

const number = (value: number) => Number(value.toPrecision(5)).toString();
const signed = (value: number, digits = 2) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const dateLabel = (fit: SavedFit) =>
  new Date(fit.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function ErrorChange({ delta }: { delta: number }) {
  const direction = Math.abs(delta) < 0.005 ? 'same' : delta < 0 ? 'better' : 'worse';
  return (
    <span className={`fit-error-change ${direction}`}>
      {direction === 'better' ? (
        <TrendingDown size={14} />
      ) : direction === 'worse' ? (
        <TrendingUp size={14} />
      ) : null}
      {direction === 'same'
        ? 'No change'
        : `${signed(delta)} pp · ${direction === 'better' ? 'improved' : 'worsened'}`}
    </span>
  );
}

/** Presentation only: receives immutable snapshots, never reads storage or generates model data. */
export function FitComparison({
  fits,
  onSaveCurrent,
  onDelete,
  preferredCandidateId,
  notify,
  download,
}: {
  fits: SavedFit[];
  onSaveCurrent: () => void;
  onDelete: (id: string) => void;
  preferredCandidateId?: string;
  notify: (message: string) => void;
  download: (name: string, content: string) => void;
}) {
  const [pair, setPair] = useState({
    baseline: fits.at(-1)?.id || '',
    candidate: fits[0]?.id || '',
  });
  const [kind, setKind] = useState<PlotKind>('transfer');
  const [expanded, setExpanded] = useState(false);
  const [changedOnly, setChangedOnly] = useState(false);
  const [views, setViews] = useState<Record<PlotKind, ChartView>>({
    transfer: defaultChartView('transfer'),
    output: defaultChartView('output'),
    capacitance: defaultChartView('capacitance'),
  });
  const baseline = fits.find((fit) => fit.id === pair.baseline) || fits.at(-1);
  const candidate =
    fits.find((fit) => fit.id === pair.candidate && fit.id !== baseline?.id) ||
    fits.find((fit) => fit.id !== baseline?.id);
  useEffect(() => {
    if (preferredCandidateId && fits.some((fit) => fit.id === preferredCandidateId)) {
      setPair((current) => ({
        baseline:
          current.baseline === preferredCandidateId
            ? fits.find((fit) => fit.id !== preferredCandidateId)?.id || ''
            : current.baseline,
        candidate: preferredCandidateId,
      }));
    }
  }, [preferredCandidateId, fits]);
  const incompatible = baseline && candidate ? fitCompatibility(baseline, candidate) : null;
  const differences = useMemo(
    () => (baseline && candidate ? parameterDifferences(baseline, candidate) : []),
    [baseline, candidate],
  );
  const alternate = useMemo(
    () => (candidate ? { label: 'B · Candidate', samples: candidate.curves[kind] } : undefined),
    [candidate, kind],
  );
  const improved =
    baseline && candidate
      ? plotKinds.filter(
          (plot) => candidate.metrics[plot].rms - baseline.metrics[plot].rms < -0.005,
        ).length
      : 0;
  const worsened =
    baseline && candidate
      ? plotKinds.filter((plot) => candidate.metrics[plot].rms - baseline.metrics[plot].rms > 0.005)
          .length
      : 0;
  const choices = (disabledId?: string) =>
    (['saved', 'example'] as const)
      .map((origin) => ({
        label: origin === 'saved' ? 'Your saved fits' : 'Example fits',
        options: fits
          .filter((fit) => fit.origin === origin)
          .map((fit) => ({ value: fit.id, label: fit.name, disabled: fit.id === disabledId })),
      }))
      .filter((group) => group.options.length);
  const saveButton = (
    <Button variant="outline" onClick={onSaveCurrent} disabled={fits.length >= MAX_SAVED_FITS}>
      <Save size={15} /> Save current fit
    </Button>
  );
  function chart(fill = false) {
    if (!baseline || !candidate || incompatible) return null;
    return (
      <CurveChart
        kind={kind}
        samples={baseline.curves[kind]}
        comparison={alternate}
        modelLabel="A · Baseline"
        view={views[kind]}
        onViewChange={(view) => setViews((current) => ({ ...current, [kind]: view }))}
        onExpand={fill ? undefined : () => setExpanded(true)}
        fill={fill}
        height={fill ? undefined : 390}
        notify={notify}
      />
    );
  }
  return (
    <div className="view-stack fit-comparison">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SAVED FITS</span>
          <h2>Compare fits</h2>
          <p>Inspect model overlays, error changes, and fitted parameters.</p>
        </div>
        <div className="inline-actions">{saveButton}</div>
      </div>
      <p className="fit-demo-note">
        <span className="tag">Demo</span> Synthetic curves · snapshots saved in this browser.
      </p>
      {baseline && candidate ? (
        <>
          <section className="panel fit-pair-picker" aria-label="Fit selection">
            <label>
              <span>
                <b>A</b> Baseline
              </span>
              <Select
                aria-label="Baseline fit"
                value={baseline.id}
                groups={choices()}
                onValueChange={(id) =>
                  setPair({
                    baseline: id,
                    candidate: id === candidate.id ? baseline.id : candidate.id,
                  })
                }
              />
              <small>
                {baseline.origin === 'example' ? 'Example snapshot' : dateLabel(baseline)}
              </small>
            </label>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Swap baseline and candidate"
              title="Swap baseline and candidate"
              onClick={() => setPair({ baseline: candidate.id, candidate: baseline.id })}
            >
              <ArrowLeftRight size={18} />
            </Button>
            <label>
              <span>
                <b>B</b> Candidate
              </span>
              <Select
                aria-label="Candidate fit"
                value={candidate.id}
                groups={choices(baseline.id)}
                onValueChange={(id) => setPair({ baseline: baseline.id, candidate: id })}
              />
              <small>
                {candidate.origin === 'example' ? 'Example snapshot' : dateLabel(candidate)}
              </small>
            </label>
          </section>
          {incompatible ? (
            <div className="panel fit-compare-empty" role="status">
              <GitCompareArrows size={25} />
              <h3>These fits cannot be overlaid</h3>
              <p>{incompatible}</p>
            </div>
          ) : (
            <>
              <section className="fit-compare-summary" aria-label="Comparison summary">
                <div className="panel">
                  <span>Overall relative RMS</span>
                  <div className="fit-rms-pair">
                    <span>
                      A <strong>{baseline.metrics.overall.rms.toFixed(2)}%</strong>
                    </span>
                    <span>
                      B <strong>{candidate.metrics.overall.rms.toFixed(2)}%</strong>
                    </span>
                  </div>
                  <ErrorChange
                    delta={candidate.metrics.overall.rms - baseline.metrics.overall.rms}
                  />
                </div>
                <div className="panel">
                  <span>Measurement groups</span>
                  <strong>
                    {improved} improved · {worsened} worsened
                  </strong>
                  <small>{3 - improved - worsened} unchanged · lower RMS is better</small>
                </div>
                <div className="panel">
                  <span>Parameter changes</span>
                  <strong>
                    {differences.filter((row) => row.changed).length} of {differences.length}
                  </strong>
                  <small>{baseline.modelFamily} · A → B</small>
                </div>
              </section>
              <div className="fit-compare-grid">
                <section className="panel fit-overlay-panel" aria-label="Saved fit overlay">
                  <div className="fit-overlay-heading">
                    <h3>Model overlays</h3>
                    <div className="segmented" role="group" aria-label="Compared measurements">
                      {plotKinds.map((plot) => (
                        <button
                          key={plot}
                          aria-pressed={kind === plot}
                          className={kind === plot ? 'selected' : ''}
                          onClick={() => setKind(plot)}
                        >
                          {plotInfo[plot].short}
                        </button>
                      ))}
                    </div>
                  </div>
                  {chart()}
                </section>
                <section className="panel fit-metric-panel" aria-label="RMS error by measurement">
                  <h3>Error by measurement</h3>
                  <p>Relative RMS · same reference points</p>
                  <div className="fit-metric-list">
                    {plotKinds.map((plot) => (
                      <div key={plot}>
                        <h4>{plotInfo[plot].short}</h4>
                        <div>
                          <span>
                            A <strong>{baseline.metrics[plot].rms.toFixed(2)}%</strong>
                          </span>
                          <span>
                            B <strong>{candidate.metrics[plot].rms.toFixed(2)}%</strong>
                          </span>
                        </div>
                        <ErrorChange
                          delta={candidate.metrics[plot].rms - baseline.metrics[plot].rms}
                        />
                      </div>
                    ))}
                  </div>
                  <small>
                    {baseline.measurementLabel}
                    <br />
                    {baseline.metrics.overall.points} reference points · Δ = B − A in percentage
                    points.
                  </small>
                </section>
              </div>
              <section className="panel fit-parameter-panel" aria-label="Parameter comparison">
                <div className="panel-heading">
                  <div>
                    <h3>Parameter changes</h3>
                    <p>Values captured with each snapshot.</p>
                  </div>
                  <label className="fit-changed-toggle">
                    <input
                      type="checkbox"
                      checked={changedOnly}
                      onChange={(event) => setChangedOnly(event.target.checked)}
                    />{' '}
                    Changed only
                  </label>
                </div>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>A · Baseline</th>
                        <th>B · Candidate</th>
                        <th>Change (B − A)</th>
                        <th>Relative change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {differences
                        .filter((row) => !changedOnly || row.changed)
                        .map((row) => (
                          <tr key={row.name}>
                            <td>
                              <strong>{row.name}</strong>
                              <small className="fit-parameter-unit">
                                {row.unit || 'Dimensionless'}
                              </small>
                            </td>
                            <td>{row.baseline === undefined ? '—' : number(row.baseline)}</td>
                            <td>{row.candidate === undefined ? '—' : number(row.candidate)}</td>
                            <td className={row.changed ? 'fit-parameter-changed' : 'muted'}>
                              {row.delta === null
                                ? 'Not comparable'
                                : row.delta === 0
                                  ? '—'
                                  : `${row.delta > 0 ? '+' : ''}${number(row.delta)}`}
                            </td>
                            <td>{row.percent === null ? '—' : `${signed(row.percent)}%`}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {changedOnly && !differences.some((row) => row.changed) && (
                  <p className="fit-no-changes">No parameter changes between these fits.</p>
                )}
                <div className="fit-comparison-footer">
                  <span>Parameter movement alone does not indicate a better fit.</span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      download(
                        'mosfit-fit-comparison.json',
                        JSON.stringify(
                          { schemaVersion: 1, baseline, candidate, parameterChanges: differences },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    <Download size={15} /> Export comparison
                  </Button>
                </div>
              </section>
            </>
          )}
        </>
      ) : (
        <section className="panel fit-compare-empty">
          <GitCompareArrows size={30} />
          <h3>{fits.length ? 'Save a second fit to compare' : 'No saved fits yet'}</h3>
          <p>Save the current parameter values, adjust your fit, then save another snapshot.</p>
          {saveButton}
        </section>
      )}
      <details className="panel fit-snapshot-library">
        <summary>
          Saved fit library{' '}
          <span>
            {fits.length}/{MAX_SAVED_FITS}
          </span>
        </summary>
        <ul>
          {fits.map((fit) => (
            <li key={fit.id}>
              <div>
                <strong>{fit.name}</strong>
                <small>
                  {fit.origin === 'example' ? 'Example snapshot' : dateLabel(fit)} · RMS{' '}
                  {fit.metrics.overall.rms.toFixed(2)}%
                </small>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete fit ${fit.name}`}
                onClick={() => onDelete(fit.id)}
              >
                <Trash2 size={15} />
              </Button>
            </li>
          ))}
        </ul>
        {fits.length >= MAX_SAVED_FITS && (
          <p>Delete a snapshot to make room for another saved fit.</p>
        )}
      </details>
      <Dialog
        open={expanded && !!baseline && !!candidate && !incompatible}
        onOpenChange={setExpanded}
        title={`${plotInfo[kind].short} fit comparison`}
        description={`Baseline ${baseline?.name || ''} and candidate ${candidate?.name || ''} against shared reference measurements.`}
        fullscreen
      >
        {chart(true)}
      </Dialog>
    </div>
  );
}
