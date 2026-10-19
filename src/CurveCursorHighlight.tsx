import { useLayoutEffect, useState, type RefObject } from 'react';
import type { Layout, PlotlyHTMLElement } from 'plotly.js';
import { projectCurvePair, type CurvePair, type CursorMarker } from './curveHover';

type Projection = {
  left: number;
  top: number;
  width: number;
  height: number;
  markers: CursorMarker[];
};

/** A pointer-transparent overlay; moving the cursor never redraws or changes Plotly data. */
export function CurveCursorHighlight({
  pair,
  container,
  plot,
  layout,
}: {
  pair: CurvePair;
  container: RefObject<HTMLDivElement | null>;
  plot: RefObject<HTMLDivElement | null>;
  layout: Partial<Layout>;
}) {
  const [projection, setProjection] = useState<Projection | null>(null);
  useLayoutEffect(() => {
    const area = container.current;
    const graph = plot.current;
    const dragRect = graph?.querySelector<SVGRectElement>('.nsewdrag');
    if (!area || !graph || !dragRect) {
      setProjection(null);
      return;
    }
    function update() {
      const bounds = dragRect!.getBoundingClientRect();
      const outer = area!.getBoundingClientRect();
      // Plotly's current ranges reflect the rendered frame, including automatic margins.
      const axes = (graph as Partial<PlotlyHTMLElement>).layout || layout;
      const next: Projection = {
        left: bounds.left - outer.left,
        top: bounds.top - outer.top,
        width: bounds.width,
        height: bounds.height,
        markers: projectCurvePair(
          pair,
          {
            xRange: axes.xaxis?.range || [],
            yRange: axes.yaxis?.range || [],
            logarithmic: axes.yaxis?.type === 'log',
          },
          bounds,
        ),
      };
      setProjection((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    }
    update();
    const resize = new ResizeObserver(update);
    resize.observe(area);
    // Resizing Plotly can finish after the container's resize notification.
    const mutation = new MutationObserver(update);
    mutation.observe(dragRect, { attributes: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [pair, container, plot, layout]);

  if (!projection?.markers.length) return null;
  const { left, top, width, height, markers } = projection;
  const x = markers[0].x;
  const ys = markers.map((marker) => marker.y);
  return (
    <svg
      className="curve-cursor-highlight"
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ left, top, color: `var(--curve-${pair.series})` }}
    >
      {markers.length > 1 && (
        <line
          className="curve-cursor-link"
          x1={x}
          x2={x}
          y1={Math.min(...ys)}
          y2={Math.max(...ys)}
        />
      )}
      {markers.map((marker) => (
        <g
          key={`${pair.series}-${marker.role}`}
          className={`curve-cursor-marker cursor-marker-${marker.role}`}
          transform={`translate(${marker.x},${marker.y})`}
        >
          <circle className="curve-marker-halo" r="10" />
          {marker.role === 'candidate' ? (
            <path className="curve-marker-core" d="M0 -5L5 0L0 5L-5 0Z" />
          ) : (
            <circle className="curve-marker-core" r={marker.role === 'measured' ? 5 : 2.5} />
          )}
        </g>
      ))}
    </svg>
  );
}
