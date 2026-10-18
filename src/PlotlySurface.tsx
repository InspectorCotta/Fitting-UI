import { useEffect, useRef, useState } from 'react';
import type { Config, Data, Layout, PlotMouseEvent } from 'plotly.js';
import { loadPlotly } from './plotly';

export const plotConfig: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  displayModeBar: false,
  showLink: false,
  showSendToCloud: false,
  showEditInChartStudio: false,
};
export function PlotlySurface({
  data,
  layout,
  label,
  onRelayout,
  onHover,
  onUnhover,
  plotRef,
}: {
  data: Data[];
  layout: Partial<Layout>;
  label: string;
  onRelayout: (event: Record<string, unknown>) => void;
  onHover: (event: PlotMouseEvent) => void;
  onUnhover: () => void;
  plotRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef({ data, layout, onRelayout, onHover, onUnhover });
  latest.current = { data, layout, onRelayout, onHover, onUnhover };
  const redraw = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const node = element.current!;
    plotRef.current = node;
    let active = true,
      bound = false,
      rendered = false,
      queued = false;
    let api: Awaited<ReturnType<typeof loadPlotly>> | undefined;
    let chain = Promise.resolve();
    const schedule = () => {
      if (queued || !active || !api) return;
      queued = true;
      chain = chain
        .catch(() => {})
        .then(async () => {
          queued = false;
          if (!active || !api) return;
          const snapshot = structuredClone({
            data: latest.current.data,
            layout: latest.current.layout,
          });
          const graph = await api.react(node, snapshot.data, snapshot.layout, plotConfig);
          rendered = true;
          if (!active) return;
          if (!bound) {
            graph.on('plotly_relayout', (event) =>
              latest.current.onRelayout(event as Record<string, unknown>),
            );
            graph.on('plotly_hover', (event) => latest.current.onHover(event));
            graph.on('plotly_unhover', () => latest.current.onUnhover());
            bound = true;
          }
          setStatus('ready');
        })
        .catch(() => {
          if (active) setStatus('error');
        });
    };
    redraw.current = schedule;
    setStatus('loading');
    void loadPlotly()
      .then((value) => {
        if (active) {
          api = value;
          schedule();
        }
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    const observer = new ResizeObserver(() => {
      chain = chain
        .catch(() => {})
        .then(async () => {
          if (active && api && bound) await api.Plots.resize(node);
        })
        .catch(() => {});
    });
    observer.observe(node);
    return () => {
      active = false;
      redraw.current = null;
      observer.disconnect();
      if (plotRef.current === node) plotRef.current = null;
      void chain.finally(() => {
        if (api && rendered) api.purge(node);
      });
    };
  }, [retry, plotRef]);
  useEffect(() => {
    redraw.current?.();
  }, [data, layout]);
  return (
    <div className="plotly-surface">
      <div ref={element} role="img" aria-label={label} className="plotly-canvas" />
      {status === 'loading' && (
        <div className="plot-status" role="status">
          <span />
          Loading Plotly…
        </div>
      )}
      {status === 'error' && (
        <div className="plot-status plot-error" role="alert">
          The plot couldn’t load.<button onClick={() => setRetry((n) => n + 1)}>Try again</button>
        </div>
      )}
    </div>
  );
}
