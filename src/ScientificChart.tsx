import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Expand, Focus, Minus, Plus, RotateCcw, Scan } from 'lucide-react';
import type { PlotMouseEvent } from 'plotly.js';
import { Button } from './components/ui/button';
import { Select } from './components/ui/select';
import { PlotlySurface } from './PlotlySurface';
import { loadPlotly } from './plotly';
import { CurveTooltip } from './CurveTooltip';
import { CurveCursorHighlight } from './CurveCursorHighlight';
import { curvePairAt, interpolateCurve, type CurvePair } from './curveHover';
import { createFitComparisonFigure } from './savedFits';
import { usePlotGestures } from './usePlotGestures';
import { regionFromAxes, type FitRegion } from './fitInvestigation';
import {
  createFigure,
  defaultChartView,
  plotInfo,
  type ChartView,
  type PlotKind,
  type CurveSamples,
} from './plotData';

export function CurveChart({
  shift = 0,
  output = false,
  kind: requestedKind,
  title,
  showTitle = true,
  subtitle,
  compact = false,
  onExpand,
  notify,
  view,
  onViewChange,
  height,
  fill = false,
  samples,
  modelLabel = 'Model',
  comparison,
  region,
  selecting = false,
  onSelectingChange,
  onSelectRegion,
}: {
  shift?: number;
  output?: boolean;
  kind?: PlotKind;
  title?: string;
  showTitle?: boolean;
  subtitle?: string;
  compact?: boolean;
  onExpand?: () => void;
  notify?: (message: string) => void;
  view?: ChartView;
  onViewChange?: (view: ChartView) => void;
  height?: number;
  fill?: boolean;
  samples?: CurveSamples[];
  modelLabel?: string;
  comparison?: { label: string; samples: CurveSamples[] };
  region?: FitRegion;
  selecting?: boolean;
  onSelectingChange?: (selecting: boolean) => void;
  onSelectRegion?: (region: FitRegion) => void;
}) {
  const kind = requestedKind || (output ? 'output' : 'transfer');
  const info = plotInfo[kind];
  const [localView, setLocalView] = useState<ChartView>(() => defaultChartView(kind));
  const previousKind = useRef(kind);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'black');
  const plotRef = useRef<HTMLDivElement | null>(null);
  const plotArea = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<CurvePair | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const lastCursor = useRef(cursor);
  const activeView = view || localView;
  const current = useRef(activeView);
  current.current = activeView;
  useEffect(() => {
    if (previousKind.current !== kind) {
      previousKind.current = kind;
      setLocalView(defaultChartView(kind));
    }
  }, [kind]);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme || 'black'),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  function update(patch: Partial<ChartView>) {
    const next = { ...current.current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    current.current = next;
    if (onViewChange) onViewChange(next);
    else setLocalView(next);
  }
  const figure = useMemo(() => {
    const result =
      comparison && samples
        ? createFitComparisonFigure(kind, samples, comparison.samples, activeView, theme)
        : createFigure(kind, shift, activeView, theme, samples);
    if (region?.kind === kind)
      result.layout.shapes = [
        {
          type: 'rect',
          xref: 'x',
          yref: 'y',
          x0: region.xRange[0],
          x1: region.xRange[1],
          y0: region.yRange[0],
          y1: region.yRange[1],
          fillcolor: theme === 'white' ? 'rgba(79,95,214,.09)' : 'rgba(113,136,255,.12)',
          line: { color: theme === 'white' ? '#4f5fd6' : '#7188ff', width: 1.5, dash: 'dot' },
          layer: 'below',
        },
      ];
    return result;
  }, [kind, shift, activeView, theme, samples, comparison, region]);
  function selectRange(range: { xRange: [number, number]; yRange: [number, number] }) {
    onSelectRegion?.(
      regionFromAxes(
        kind,
        range.xRange,
        range.yRange,
        activeView.scale === 'log',
        activeView.hidden,
      ),
    );
  }
  const { zoomBox, dragging } = usePlotGestures(
    plotArea,
    plotRef,
    figure.layout,
    update,
    () => setHover(null),
    onSelectRegion ? { enabled: selecting, onSelect: selectRange } : undefined,
  );
  useEffect(() => setHover(null), [kind, activeView, shift, samples, comparison, selecting]);
  function inspect(event: PlotMouseEvent) {
    if (dragging || selecting) return;
    const point = event.points[0];
    if (
      !point ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number' ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      setHover(null);
      return;
    }
    const bounds = plotArea.current?.getBoundingClientRect();
    if (event.event && bounds)
      lastCursor.current = {
        x: event.event.clientX - bounds.left,
        y: event.event.clientY - bounds.top,
      };
    setCursor(lastCursor.current);
    const baselineTrace =
      comparison && samples && point.curveNumber >= samples.length * 2
        ? (point.curveNumber - samples.length * 2) * 2
        : point.curveNumber;
    const pair = curvePairAt(figure.data, baselineTrace, point.x, activeView.scale === 'log');
    const candidate = pair && comparison?.samples[pair.series];
    const value = candidate
      ? interpolateCurve(candidate.modelX, candidate.modelY, point.x, activeView.scale === 'log')
      : null;
    setHover(pair ? { ...pair, ...(value !== null ? { candidate: value } : {}) } : null);
  }
  function relayout(event: Record<string, unknown>) {
    const patch: Partial<ChartView> = {};
    for (const axis of ['xaxis', 'yaxis'] as const) {
      const key = axis === 'xaxis' ? 'xRange' : 'yRange';
      const range = event[`${axis}.range`] || [
        event[`${axis}.range[0]`],
        event[`${axis}.range[1]`],
      ];
      if (event[`${axis}.autorange`] === true) patch[key] = undefined;
      else if (
        Array.isArray(range) &&
        range.length === 2 &&
        range.every((v) => typeof v === 'number' && Number.isFinite(v))
      )
        patch[key] = range as [number, number];
    }
    if (Object.keys(patch).length) update(patch);
  }
  function zoom(factor: number) {
    const resizeRange = (range: number[]): [number, number] => {
      const middle = (range[0] + range[1]) / 2;
      const half = ((range[1] - range[0]) * factor) / 2;
      return [middle - half, middle + half];
    };
    // Plotly stores logarithmic ranges as exponents; scale those in the same space.
    update({
      xRange: resizeRange(figure.layout.xaxis!.range!),
      yRange: resizeRange(figure.layout.yaxis!.range!),
    });
  }
  function reset() {
    const next = defaultChartView(kind);
    current.current = next;
    if (onViewChange) onViewChange(next);
    else setLocalView(next);
  }
  async function exportChart() {
    const node = plotRef.current;
    if (!node) return;
    try {
      const api = await loadPlotly();
      await api.downloadImage(node, {
        format: 'svg',
        filename: `RX90_GAA-${kind}-curves`,
        width: 1200,
        height: 650,
      });
      notify?.('Chart exported as SVG.');
    } catch {
      notify?.('The chart is still loading. Try exporting again in a moment.');
    }
  }
  return (
    <section
      className={`curve-chart scientific-chart ${compact ? 'compact' : ''} ${fill ? 'chart-fill' : ''}`}
      aria-label={`${info.short} plot`}
    >
      <div className="chart-heading">
        <div>
          {showTitle && <h3>{title || info.short}</h3>}
          <p>{subtitle || info.subtitle}</p>
        </div>
        <div className="chart-tools">
          {onSelectRegion && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Investigate region"
              aria-pressed={selecting}
              onClick={() => onSelectingChange?.(!selecting)}
              title="Select a region for the demo agent"
            >
              <Scan size={15} />
              <span>Investigate</span>
            </Button>
          )}
          <Select
            aria-label="Chart scale"
            value={activeView.scale}
            onValueChange={(scale) =>
              update({ scale: scale as ChartView['scale'], yRange: undefined })
            }
            groups={[
              {
                options: [
                  { value: 'log', label: 'Log scale' },
                  { value: 'linear', label: 'Linear scale' },
                ],
              },
            ]}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => zoom(1 / 1.5)}
          >
            <Plus size={15} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoom(1.5)}
          >
            <Minus size={15} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Reset chart"
            title="Reset chart"
            onClick={reset}
          >
            <Focus size={15} />
          </Button>
          {onExpand && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Expand chart"
              title="Expand chart"
              onClick={onExpand}
            >
              <Expand size={15} />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Export chart"
            title="Export SVG"
            onClick={() => void exportChart()}
          >
            <Download size={15} />
          </Button>
        </div>
      </div>
      {selecting && (
        <div className="region-selection-hint" role="status">
          <span>Drag a box around the reference points to investigate.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              selectRange({
                xRange: figure.layout.xaxis!.range! as [number, number],
                yRange: figure.layout.yaxis!.range! as [number, number],
              })
            }
          >
            Use visible range
          </Button>
        </div>
      )}
      <div
        ref={plotArea}
        className={`scientific-plot ${selecting ? 'plot-selecting' : ''} ${dragging === 'zoom' ? 'plot-right-zooming' : dragging === 'pan' ? 'plot-panning' : dragging === 'select' ? 'plot-region-selecting' : ''}`}
        style={fill ? undefined : { height: height || (compact ? 285 : 335) }}
        onMouseLeave={() => setHover(null)}
        onPointerDown={() => setHover(null)}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const next = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
          lastCursor.current = next;
          if (hover) setCursor(next);
        }}
      >
        <PlotlySurface
          data={figure.data}
          layout={figure.layout}
          label={`Simulated ${info.title}`}
          onRelayout={relayout}
          onHover={inspect}
          onUnhover={() => setHover(null)}
          plotRef={plotRef}
        />
        {hover && !dragging && !selecting && (
          <CurveCursorHighlight
            pair={hover}
            container={plotArea}
            plot={plotRef}
            layout={figure.layout}
          />
        )}
        {hover && (
          <CurveTooltip
            kind={kind}
            pair={hover}
            cursor={cursor}
            container={plotArea}
            modelLabel={modelLabel}
            candidateLabel={comparison?.label}
          />
        )}
        {zoomBox && (
          <div
            className={`plot-right-zoom-box ${dragging === 'select' ? 'plot-region-box' : ''}`}
            style={zoomBox}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="scientific-legend">
        <span>
          <i className="legend-circle" />
          Measured
        </span>
        <span>
          <i className={`legend-line ${comparison ? 'comparison-baseline-line' : ''}`} />
          {modelLabel}
        </span>
        {comparison && (
          <span>
            <i className="legend-line" />
            {comparison.label}
          </span>
        )}
        <div className="series-toggles">
          {info.series.map((name, i) => (
            <button
              key={name}
              aria-pressed={!activeView.hidden.includes(i)}
              className={activeView.hidden.includes(i) ? 'muted' : ''}
              onClick={() =>
                update({
                  hidden: activeView.hidden.includes(i)
                    ? activeView.hidden.filter((n) => n !== i)
                    : [...activeView.hidden, i],
                })
              }
            >
              <i style={{ background: `var(--curve-${i})` }} />
              {name}
            </button>
          ))}
        </div>
        <button className="legend-reset" onClick={reset} aria-label="Reset view" title="Reset view">
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="chart-foot">
        <span>
          <i className="tiny-dot" />
          {info.series.length - activeView.hidden.length}{' '}
          {kind === 'capacitance' ? 'capacitances' : 'bias conditions'}
          <b>·</b>
          {samples
            ? samples.reduce((count, series) => count + series.x.length, 0)
            : info.series.length * 29}{' '}
          measured points
        </span>
        <span>
          {selecting
            ? 'Left-drag select · right-drag zoom · Escape cancels a drag'
            : 'Left-drag pan · right-drag zoom · wheel zoom'}
        </span>
      </div>
    </section>
  );
}
