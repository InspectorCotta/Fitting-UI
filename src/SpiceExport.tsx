import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Download, FileCode2, Play, RefreshCw, Square, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Select } from './components/ui/select';
import { SpiceCode } from './SpiceCode';
import type { SpiceCodeSelection } from './SpiceCode';
import { CurveChart } from './ScientificChart';
import { plotInfo, plotKinds, type PlotKind } from './plotData';
import {
  compareSpiceArtifact,
  defaultModelName,
  generateSpice,
  parseSpiceValues,
  spiceParameters,
  type SpiceComparison,
} from './spice';
import type { Dataset } from './data';

type Settings = { modelName: string; precision: number; automatic: boolean; highlight: boolean };
type Phase = 'idle' | 'reading' | PlotKind | 'complete' | 'error' | 'cancelled';
type Run = {
  phase: Phase;
  inputKey: string;
  results: SpiceComparison[];
  message?: string;
  completedAt?: number;
};
function readSettings(key: string, name: string): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    return {
      modelName: typeof saved?.modelName === 'string' ? saved.modelName : defaultModelName(name),
      precision: [6, 9, 12].includes(saved?.precision) ? saved.precision : 9,
      automatic: saved?.automatic !== false,
      highlight: saved?.highlight !== false,
    };
  } catch {
    return { modelName: defaultModelName(name), precision: 9, automatic: true, highlight: true };
  }
}
function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 180);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export function SpiceExport({
  projectId,
  projectName,
  values,
  datasets,
  notify,
  download,
}: {
  projectId: string;
  projectName: string;
  values: number[];
  datasets: Dataset[];
  notify: (message: string) => void;
  download: (filename: string, source: string, type?: string) => void;
}) {
  const settingsKey = `mosfit:spice:${projectId}`;
  const [settings, setSettings] = useState(() => readSettings(settingsKey, projectName));
  const [manual, setManual] = useState<{ inputKey: string; sequence: number } | null>(null);
  const [run, setRun] = useState<Run>({ phase: 'idle', inputKey: '', results: [] });
  const [selected, setSelected] = useState<PlotKind>('transfer');
  const abort = useRef<AbortController | null>(null);
  const [codeSelection, setCodeSelection] = useState<SpiceCodeSelection>();
  const consumedManual = useRef(0);
  const prepared = useMemo(() => {
    try {
      return { artifact: generateSpice(settings.modelName, values, settings.precision), error: '' };
    } catch (error) {
      return { artifact: null, error: (error as Error).message };
    }
  }, [settings.modelName, settings.precision, values]);
  const artifact = prepared.artifact;
  const source = artifact?.source || '';
  const inputKey = source + JSON.stringify(datasets);
  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settingsKey, settings]);
  useEffect(() => {
    const requested = manual?.inputKey === inputKey && manual.sequence !== consumedManual.current;
    if (!artifact || (!settings.automatic && !requested)) {
      setRun((previous) =>
        previous.inputKey === inputKey && previous.phase === 'complete'
          ? previous
          : { phase: 'idle', inputKey, results: [] },
      );
      return;
    }
    if (requested) consumedManual.current = manual!.sequence;
    const controller = new AbortController();
    abort.current = controller;
    const current = artifact;
    setRun({ phase: 'reading', inputKey, results: [] });
    void (async () => {
      const results: SpiceComparison[] = [];
      try {
        await pause(controller.signal);
        parseSpiceValues(current.source);
        for (const kind of plotKinds) {
          if (controller.signal.aborted) return;
          setRun({ phase: kind, inputKey, results: [...results] });
          await pause(controller.signal);
          const result = compareSpiceArtifact(current, kind, datasets);
          if (result) results.push(result);
        }
        if (!results.length)
          throw new Error(
            'No bundled 300 K measurement groups are available. Add the demo datasets before comparing.',
          );
        setRun({ phase: 'complete', inputKey, results, completedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted)
          setRun({ phase: 'error', inputKey, results: [], message: (error as Error).message });
      }
    })();
    return () => {
      controller.abort();
      if (abort.current === controller) abort.current = null;
    };
  }, [inputKey, settings.automatic, manual]);
  const current = run.inputKey === inputKey;
  const complete = current && run.phase === 'complete';
  const running = current && ['reading', ...plotKinds].includes(run.phase);
  const results = current ? run.results : [];
  const passed = complete && results.every((result) => result.passed);
  const chosen = results.find((result) => result.kind === selected) || results[0];
  const exported = artifact ? parseSpiceValues(artifact.source) : values;
  const progress =
    run.phase === 'complete'
      ? 4
      : run.phase === 'reading'
        ? 0
        : plotKinds.indexOf(run.phase as PlotKind) + 1;
  const status = prepared.error
    ? 'Export needs attention'
    : running
      ? 'Comparing exported values…'
      : complete
        ? passed
          ? 'Demo comparison passed'
          : 'Review fit differences'
        : run.phase === 'cancelled'
          ? 'Comparison stopped'
          : run.phase === 'error'
            ? 'Comparison failed'
            : 'Comparison pending';
  function rerun() {
    if (artifact) setManual((previous) => ({ inputKey, sequence: (previous?.sequence || 0) + 1 }));
  }
  async function copy() {
    if (!artifact) return false;
    try {
      await navigator.clipboard.writeText(artifact.source);
      notify('Full SPICE library copied.');
      return true;
    } catch {
      notify('Clipboard is unavailable. Use Download .lib to save the library.');
      return false;
    }
  }
  function report() {
    if (!artifact || !complete) return;
    download(
      `${artifact.modelName.toLowerCase()}-comparison.json`,
      JSON.stringify(
        {
          engine: 'browser-demo-numeric-replay',
          spiceSolverExecuted: false,
          reference:
            'Bundled synthetic 300 K measurement samples; imported CSV data is not replayed.',
          comparedAt: new Date(run.completedAt!).toISOString(),
          artifact,
          exportedParameters: Object.fromEntries(
            spiceParameters.map((p, i) => [p.name, exported[i]]),
          ),
          thresholds: { relativeRmsPercent: 10, maxRelativePercent: 15 },
          results,
        },
        null,
        2,
      ),
    );
    notify('Comparison report downloaded with the exact library snapshot.');
  }
  return (
    <div className="spice-export view-stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MODEL DELIVERY</span>
          <h2>SPICE export</h2>
          <p>Inspect the library and compare the exported model with measurement curves.</p>
        </div>
        <Button
          disabled={!artifact || !complete}
          title={
            !complete
              ? 'The current library must finish its automatic comparison first.'
              : 'Download the exact library shown below'
          }
          onClick={() => {
            if (artifact && complete) {
              download(artifact.filename, artifact.source, 'text/plain');
              notify('SPICE demo library downloaded.');
            }
          }}
        >
          <Download size={15} />
          Download .lib
        </Button>
      </div>
      <div className="spice-engine-note">
        <FileCode2 size={16} />
        <div>
          <strong>Behavioral SPICE demo</strong>
          <span>
            Browser replay of exported numeric values against bundled dummy measurements. No SPICE
            solver is connected; this is not a production BSIM-CMG model.
          </span>
        </div>
      </div>
      <div className="spice-export-grid">
        <div className="spice-source-column">
          {artifact ? (
            <SpiceCode
              artifact={artifact}
              highlight={settings.highlight}
              onCopy={copy}
              selection={codeSelection}
            />
          ) : (
            <div className="spice-source-error" role="alert">
              <FileCode2 size={26} />
              <strong>Check the model name</strong>
              <p>{prepared.error}</p>
            </div>
          )}
        </div>
        <aside className="spice-settings" aria-label="SPICE export settings">
          <h3>Export settings</h3>
          <label>
            Model name
            <input
              value={settings.modelName}
              aria-invalid={Boolean(prepared.error)}
              maxLength={48}
              spellCheck={false}
              onChange={(event) => setSettings((s) => ({ ...s, modelName: event.target.value }))}
            />
          </label>
          {prepared.error && <p className="spice-field-error">{prepared.error}</p>}
          <label>
            Numeric precision
            <Select
              aria-label="Numeric precision"
              value={String(settings.precision)}
              onValueChange={(precision) =>
                setSettings((s) => ({ ...s, precision: Number(precision) }))
              }
              groups={[
                {
                  options: [6, 9, 12].map((n) => ({
                    value: String(n),
                    label: `${n} significant digits`,
                  })),
                },
              ]}
            />
          </label>
          <label className="spice-check-option">
            <input
              type="checkbox"
              checked={settings.highlight}
              onChange={(event) => setSettings((s) => ({ ...s, highlight: event.target.checked }))}
            />
            <span>Highlight fitted parameters</span>
          </label>
          <label className="spice-check-option">
            <input
              type="checkbox"
              checked={settings.automatic}
              onChange={(event) => setSettings((s) => ({ ...s, automatic: event.target.checked }))}
            />
            <span>
              Compare automatically<small>Re-run when the library changes.</small>
            </span>
          </label>
          <div className="spice-fitted-heading">
            <h3>Fitted parameters</h3>
            <span>{spiceParameters.length} exported</span>
          </div>
          <div className="spice-parameter-list">
            {spiceParameters.map((parameter, index) => (
              <button
                key={parameter.name}
                aria-label={`Show ${parameter.name} in SPICE library`}
                disabled={!artifact}
                title={`Jump to ${parameter.name} in the library`}
                onClick={() => {
                  setCodeSelection((previous) => ({
                    parameter: parameter.name,
                    request: (previous?.request || 0) + 1,
                  }));
                }}
              >
                <span>
                  <strong>{parameter.name}</strong>
                  <small>{parameter.label}</small>
                </span>
                <span>
                  {Number(exported[index].toPrecision(settings.precision))}
                  <small>{parameter.unit || 'unitless'}</small>
                </span>
              </button>
            ))}
          </div>
          <p className="spice-settings-foot">
            Values are read back from the file, including unit conversion and export rounding.
          </p>
        </aside>
      </div>
      <section
        className="spice-verification"
        aria-labelledby="spice-validation-heading"
        aria-busy={running}
      >
        <div className="spice-verification-heading">
          <div>
            <h3 id="spice-validation-heading">Export comparison</h3>
            <p>Automatic round trip · 300 K · transfer, output, and capacitance</p>
          </div>
          <div className="inline-actions">
            <Button variant="outline" disabled={!complete} onClick={report}>
              <Download size={14} />
              Report
            </Button>
            {running ? (
              <Button
                variant="outline"
                onClick={() => {
                  abort.current?.abort();
                  setRun({ phase: 'cancelled', inputKey, results: [] });
                }}
              >
                <Square size={12} />
                Stop comparison
              </Button>
            ) : (
              <Button variant="outline" disabled={!artifact} onClick={rerun}>
                {complete ? <RefreshCw size={14} /> : <Play size={14} />}
                {complete ? 'Compare again' : 'Run comparison'}
              </Button>
            )}
          </div>
        </div>
        <div
          className={`spice-run-status ${complete && !passed ? 'needs-review' : ''}`}
          role="status"
        >
          {running ? (
            <span className="spice-spinner" />
          ) : complete ? (
            passed ? (
              <CheckCheck size={18} />
            ) : (
              <X size={18} />
            )
          ) : (
            <FileCode2 size={17} />
          )}
          <strong>{status}</strong>
          {complete && <small>{results.length} of 3 groups</small>}
          <span>{artifact ? `Snapshot ${artifact.fingerprint}` : 'No library generated'}</span>
        </div>
        <ol className="spice-run-steps">
          {['Read exported values', 'Transfer sweep', 'Output sweep', 'Capacitance sweep'].map(
            (label, index) => {
              const skipped =
                complete &&
                index > 0 &&
                !results.some((result) => result.kind === plotKinds[index - 1]);
              return (
                <li
                  key={label}
                  className={
                    skipped
                      ? 'skipped'
                      : current && (complete || (running && progress > index))
                        ? 'done'
                        : running && progress === index
                          ? 'active'
                          : ''
                  }
                >
                  <span>
                    {skipped ? (
                      '–'
                    ) : current && (complete || (running && progress > index)) ? (
                      <Check size={11} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {label}
                  {skipped ? ' · no reference' : ''}
                </li>
              );
            },
          )}
        </ol>
        {current && run.phase === 'error' && (
          <p className="spice-validation-error" role="alert">
            {run.message}
          </p>
        )}
        {results.length > 0 && (
          <div className="spice-comparison-results">
            <div className="spice-comparison-summary">
              <table>
                <thead>
                  <tr>
                    <th>Measurement group</th>
                    <th>Points</th>
                    <th>RMS error</th>
                    <th>Max error</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.kind}>
                      <td>
                        <button onClick={() => setSelected(result.kind)}>
                          {plotInfo[result.kind].short}
                          <small>{result.dataset}</small>
                        </button>
                      </td>
                      <td>{result.points}</td>
                      <td className={result.rms > 10 ? 'outside-target' : ''}>
                        {result.rms.toFixed(2)}%
                      </td>
                      <td className={result.max > 15 ? 'outside-target' : ''}>
                        {result.max.toFixed(2)}%
                      </td>
                      <td>
                        <span className={`spice-result ${result.passed ? 'pass' : 'review'}`}>
                          {result.passed ? <Check size={12} /> : <X size={12} />}
                          {result.passed ? 'Within target' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Relative error per point · RMS ≤ 10% · max ≤ 15%. Near-zero values use a floor of
                10⁻⁶ of each curve’s peak.
              </p>
            </div>
            {chosen && (
              <div className="spice-validation-plot">
                <div
                  className="spice-plot-tabs"
                  role="tablist"
                  aria-label="Export comparison plots"
                >
                  {results.map((result) => (
                    <button
                      key={result.kind}
                      role="tab"
                      id={`spice-tab-${result.kind}`}
                      aria-controls="spice-comparison-plot"
                      aria-selected={chosen.kind === result.kind}
                      onClick={() => setSelected(result.kind)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                          event.preventDefault();
                          const next =
                            results[
                              (results.findIndex((item) => item.kind === chosen.kind) +
                                (event.key === 'ArrowRight' ? 1 : results.length - 1)) %
                                results.length
                            ];
                          setSelected(next.kind);
                          document.getElementById(`spice-tab-${next.kind}`)?.focus();
                        }
                      }}
                    >
                      {plotInfo[result.kind].short}
                    </button>
                  ))}
                  <span>Exported values vs measurements</span>
                </div>
                <div
                  role="tabpanel"
                  id="spice-comparison-plot"
                  aria-labelledby={`spice-tab-${chosen.kind}`}
                >
                  <CurveChart
                    key={chosen.kind}
                    kind={chosen.kind}
                    samples={chosen.series}
                    modelLabel="Exported model (demo)"
                    metadata="Bundled synthetic measurements · 300 K · browser replay"
                    height={330}
                    notify={notify}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <p className="spice-coverage-note">
          Only bundled 300 K demo datasets are replayed here; imported CSVs and an external SPICE
          solver are not part of this comparison.{' '}
          <a href="https://ngspice.sourceforge.io/docs.html" target="_blank" rel="noreferrer">
            SPICE syntax reference
          </a>
        </p>
      </section>
    </div>
  );
}
