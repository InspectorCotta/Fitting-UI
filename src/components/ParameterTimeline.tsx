import { useEffect, useRef } from 'react';

type Props = {
  name: string;
  unit: string;
  digits: number;
  history: number[];
  value: number;
  onRestore: (value: number) => void;
};

/** Keep returns to earlier values; skip snapshots where only other parameters changed. */
export function parameterTimelineValues(history: number[], value: number) {
  return [...history, value].filter((entry, i, all) => i === 0 || entry !== all[i - 1]);
}

export function ParameterTimeline({ name, unit, digits, history, value, onRestore }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const points = parameterTimelineValues(history, value);
  const format = (entry: number) => entry.toFixed(digits);
  useEffect(() => {
    if (viewport.current) viewport.current.scrollLeft = viewport.current.scrollWidth;
  }, [points.length]);

  return <div className="parameter-timeline" role="group" aria-label={`${name} value timeline`}>
    <div className="parameter-timeline-heading">
      <strong>Value timeline</strong><span>This session{unit ? ` · ${unit}` : ''}</span>
    </div>
    <div className="parameter-timeline-direction"><span>Earlier</span><span aria-hidden="true">→</span><span>Now</span></div>
    <div className="parameter-timeline-viewport" ref={viewport} tabIndex={0}
      aria-label={`${name} timeline, scroll to see earlier edits`}>
      <ol className="parameter-timeline-track" aria-label={`${name} chronological values`}>
        {points.map((point, index) => {
          const current = index === points.length - 1;
          const label = current ? 'Now' : index === 0 ? 'Start' : `Edit ${index}`;
          return <li key={index} className={current ? 'is-current' : ''}>
            {current ? <div className="parameter-timeline-point" aria-current="step"
              aria-label={`Current ${name} value ${format(point)} ${unit}`.trim()}>
              <span className="parameter-timeline-label">{label}</span><i aria-hidden="true" /><strong>{format(point)}</strong>
            </div> : <button className="parameter-timeline-point" type="button"
              aria-label={`Restore ${name} to ${format(point)} ${unit}`.trim()}
              title={`${label} · ${format(point)} ${unit}`.trim()}
              disabled={point === value} onClick={() => onRestore(point)}>
              <span className="parameter-timeline-label">{label}</span><i aria-hidden="true" /><strong>{format(point)}</strong>
            </button>}
          </li>;
        })}
      </ol>
    </div>
    <p className="parameter-timeline-help">{points.length > 1 ? 'Click a past point to restore it as a new edit.' : 'Your next adjustment adds a point to the timeline.'}</p>
  </div>;
}
