import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useLayoutEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { plotInfo, type PlotKind } from './plotData';

/** A non-modal, themed information popover that also works inside expanded plots. */
export function PlotInfo({
  kind,
  metadata,
  visibleSeries,
  totalPoints,
  visiblePoints,
  selecting,
}: {
  kind: PlotKind;
  metadata: string;
  visibleSeries: number;
  totalPoints: number;
  visiblePoints: number;
  selecting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const info = plotInfo[kind];
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    function place() {
      if (!trigger.current || !content) return;
      const anchor = trigger.current.getBoundingClientRect();
      const width = content.offsetWidth || Math.min(280, window.innerWidth - 24);
      const height = content.offsetHeight;
      const left = Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12));
      const below = anchor.bottom + 8;
      const top = Math.max(
        12,
        Math.min(
          below + height <= window.innerHeight - 12 ? below : anchor.top - height - 8,
          window.innerHeight - height - 12,
        ),
      );
      setPosition((current) =>
        current?.left === left && current?.top === top ? current : { left, top },
      );
    }
    place();
    const observer = new ResizeObserver(place);
    if (content) observer.observe(content);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, content]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <DialogPrimitive.Trigger asChild>
        <Button
          ref={trigger}
          variant="outline"
          size="icon"
          aria-label="Plot information"
          title="Plot information"
        >
          <Info size={15} />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={setContent}
          className="menu-surface plot-info-popover"
          style={{
            left: position?.left ?? 12,
            top: position?.top ?? 12,
            visibility: position ? 'visible' : 'hidden',
          }}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <div className="plot-info-heading">
            <DialogPrimitive.Title>{info.short} plot information</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close plot information">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description>{metadata}</DialogPrimitive.Description>
          <div className="plot-info-counts">
            <p>
              {visibleSeries} of {info.series.length}{' '}
              {kind === 'capacitance' ? 'capacitances' : 'bias conditions'} visible
            </p>
            <p>
              {totalPoints} measured points <span>· {visiblePoints} on visible traces</span>
            </p>
          </div>
          <p className="plot-info-help">
            {selecting
              ? 'Drag a box to select reference points. Escape cancels a drag.'
              : 'Left-drag to pan. Right-drag to zoom. Use the wheel to zoom around the cursor.'}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
