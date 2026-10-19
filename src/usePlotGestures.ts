import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Layout, PlotlyHTMLElement } from 'plotly.js';
import {
  inPlot,
  rangesForSelection,
  zoomSelection,
  type AxisRange,
  type PlotPoint,
  panRanges,
  wheelRanges,
} from './plotGestures';

type Box = { left: number; top: number; width: number; height: number };
type Gesture = {
  mode: 'pan' | 'zoom' | 'select';
  pointerId: number;
  bounds: DOMRect;
  offset: PlotPoint;
  start: PlotPoint;
  x: AxisRange;
  y: AxisRange;
};
const validRange = (value: unknown): value is AxisRange =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

export function usePlotGestures(
  container: RefObject<HTMLDivElement | null>,
  plot: RefObject<HTMLDivElement | null>,
  layout: Partial<Layout>,
  onChange: (range: { xRange: AxisRange; yRange: AxisRange }) => void,
  clearHover: () => void,
  selection?: {
    enabled: boolean;
    onSelect: (range: { xRange: AxisRange; yRange: AxisRange }) => void;
  },
) {
  const latest = useRef({ layout, onChange, clearHover, selection });
  latest.current = { layout, onChange, clearHover, selection };
  const [box, setBox] = useState<Box | null>(null);
  const [dragging, setDragging] = useState<'pan' | 'zoom' | 'select' | null>(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let gesture: Gesture | null = null;
    // Read Plotly's rendered Cartesian drag rectangle so automatic axis margins are respected.
    const plotBounds = () =>
      plot.current?.querySelector<SVGRectElement>('.nsewdrag')?.getBoundingClientRect();
    const position = (event: MouseEvent, bounds: DOMRect) => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    function release(current: Gesture | null) {
      if (current) {
        try {
          node!.releasePointerCapture?.(current.pointerId);
        } catch {
          /* The browser may have already released capture. */
        }
      }
    }
    function cancel() {
      const previous = gesture;
      gesture = null;
      setBox(null);
      setDragging(null);
      release(previous);
    }
    function start(event: PointerEvent) {
      if (event.isPrimary === false) return;
      if (event.button !== 0 && event.button !== 2) return;
      if (
        event.pointerType &&
        event.pointerType !== 'mouse' &&
        event.button === 0 &&
        !latest.current.selection?.enabled
      )
        return;
      const bounds = plotBounds(),
        { xaxis, yaxis } =
          (plot.current as Partial<PlotlyHTMLElement>)?.layout || latest.current.layout;
      if (
        !bounds ||
        !bounds.width ||
        !bounds.height ||
        !inPlot(position(event, bounds), bounds) ||
        !validRange(xaxis?.range) ||
        !validRange(yaxis?.range)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const outer = node!.getBoundingClientRect();
      gesture = {
        mode: event.button === 0 ? (latest.current.selection?.enabled ? 'select' : 'pan') : 'zoom',
        pointerId: event.pointerId,
        bounds,
        offset: { x: bounds.left - outer.left, y: bounds.top - outer.top },
        start: position(event, bounds),
        x: [...xaxis.range],
        y: [...yaxis.range],
      };
      latest.current.clearHover();
      setDragging(gesture.mode);
      setBox(null);
      try {
        node!.setPointerCapture?.(event.pointerId);
      } catch {
        /* Document listeners still track a drag outside the plot. */
      }
    }
    function move(event: PointerEvent) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (gesture.mode === 'pan') {
        const next = position(event, gesture.bounds);
        const range = panRanges(gesture.start, next, gesture.bounds, gesture.x, gesture.y);
        gesture.start = next;
        gesture.x = range.xRange;
        gesture.y = range.yRange;
        latest.current.onChange(range);
        return;
      }
      const selection = zoomSelection(
        gesture.start,
        position(event, gesture.bounds),
        gesture.bounds,
      );
      setBox(
        selection
          ? {
              ...selection,
              left: selection.left + gesture.offset.x,
              top: selection.top + gesture.offset.y,
            }
          : null,
      );
    }
    function finish(event: PointerEvent) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = gesture;
      const range =
        current.mode !== 'pan'
          ? rangesForSelection(
              current.start,
              position(event, current.bounds),
              current.bounds,
              current.x,
              current.y,
            )
          : null;
      cancel();
      if (range) {
        if (current.mode === 'select') latest.current.selection?.onSelect(range);
        else latest.current.onChange(range);
      }
    }
    function mouseDown(event: MouseEvent) {
      const bounds = plotBounds();
      if (
        (event.button === 0 || event.button === 2) &&
        gesture &&
        bounds &&
        inPlot(position(event, bounds), bounds)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function wheel(event: WheelEvent) {
      // Plotly's full-page drag cover otherwise receives the wheel and scrolls the page.
      // Keep the pan origin and zoom ranges together so the next move cannot undo the zoom.
      if (!gesture || !inPlot(position(event, gesture.bounds), gesture.bounds)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (gesture.mode !== 'pan') return;
      const point = position(event, gesture.bounds);
      const range = wheelRanges(
        point,
        gesture.bounds,
        gesture.x,
        gesture.y,
        event.deltaY,
        event.deltaMode,
      );
      gesture.x = range.xRange;
      gesture.y = range.yRange;
      gesture.start = point;
      latest.current.onChange(range);
    }
    function contextMenu(event: MouseEvent) {
      const bounds = plotBounds();
      if (bounds && inPlot(position(event, bounds), bounds)) event.preventDefault();
    }
    function pointerCancel(event: PointerEvent) {
      if (gesture?.pointerId === event.pointerId) cancel();
    }
    function escape(event: KeyboardEvent) {
      if (gesture && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    }
    node.addEventListener('pointerdown', start, true);
    node.addEventListener('mousedown', mouseDown, true);
    node.addEventListener('contextmenu', contextMenu);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('wheel', wheel, { capture: true, passive: false });
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', pointerCancel, true);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('blur', cancel);
    return () => {
      release(gesture);
      gesture = null;
      node.removeEventListener('pointerdown', start, true);
      node.removeEventListener('mousedown', mouseDown, true);
      node.removeEventListener('contextmenu', contextMenu);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('wheel', wheel, true);
      document.removeEventListener('pointerup', finish, true);
      document.removeEventListener('pointercancel', pointerCancel, true);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
    };
  }, [container, plot, selection?.enabled]);
  return { zoomBox: box, dragging };
}
