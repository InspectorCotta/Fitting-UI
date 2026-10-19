import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { formatCurveValue, placeCurveTooltip, type CurvePair } from './curveHover';
import { plotInfo, type PlotKind } from './plotData';

export function CurveTooltip({
  kind,
  pair,
  cursor,
  container,
  modelLabel = 'Model',
  candidateLabel = 'Candidate',
}: {
  kind: PlotKind;
  pair: CurvePair;
  cursor: { x: number; y: number };
  container: RefObject<HTMLDivElement | null>;
  modelLabel?: string;
  candidateLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const info = plotInfo[kind];
  useLayoutEffect(() => {
    if (!container.current || !ref.current) return;
    const bounds = container.current.getBoundingClientRect();
    const next = placeCurveTooltip(
      cursor,
      { width: bounds.width || 300, height: bounds.height || 255 },
      { width: ref.current.offsetWidth || 174, height: ref.current.offsetHeight || 76 },
    );
    setPosition((current) =>
      current?.left === next.left && current?.top === next.top ? current : next,
    );
  }, [cursor.x, cursor.y, pair, container]);
  return (
    <div
      ref={ref}
      className="curve-cursor-tooltip"
      role="tooltip"
      aria-label={`${info.short} cursor values`}
      style={{
        left: position?.left || 0,
        top: position?.top || 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="curve-tooltip-heading">
        <i style={{ background: `var(--curve-${pair.series})` }} />
        <strong>{info.series[pair.series]}</strong>
        <span>
          {kind === 'output' ? 'Vds' : 'Vgs'} {pair.x.toFixed(3)} V
        </span>
      </div>
      <div className="curve-tooltip-value">
        <span>
          <i className="tooltip-measured" />
          Measured
        </span>
        <b>
          {formatCurveValue(pair.measured)} <small>{info.unit}</small>
        </b>
      </div>
      <div className="curve-tooltip-value">
        <span>
          <i className="tooltip-model" />
          {modelLabel}
        </span>
        <b>
          {formatCurveValue(pair.model)} <small>{info.unit}</small>
        </b>
      </div>
      {pair.candidate !== undefined && (
        <div className="curve-tooltip-value">
          <span>
            <i className="tooltip-candidate" />
            {candidateLabel}
          </span>
          <b>
            {formatCurveValue(pair.candidate)} <small>{info.unit}</small>
          </b>
        </div>
      )}
    </div>
  );
}
