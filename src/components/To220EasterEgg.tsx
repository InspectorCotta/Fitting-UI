import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MosfetMark } from './MosfetMark';

/** A local-only surprise. It never touches project or fitting state. */
export function To220EasterEgg({ onHome }: { onHome: () => void }) {
  const [open, setOpen] = useState(false);
  const [smoke, setSmoke] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);

  function dismiss() {
    if (card.current?.contains(document.activeElement)) trigger.current?.focus();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // Let any modal opened above the surprise handle its own Escape key.
      if (document.querySelector('[role="dialog"]')) return;
      if (card.current?.contains(document.activeElement)) trigger.current?.focus();
      setOpen(false);
    }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        className="sidebar-brand"
        onClick={() => {
          onHome();
          setSmoke(false);
          setOpen(true);
        }}
        aria-label="MOSFit Studio home"
        title="MOSFit Studio · Beta"
      >
        <MosfetMark />
      </button>
      {open &&
        createPortal(
          <section
            ref={card}
            className={`to220-surprise ${smoke ? 'to220-smoked' : ''}`}
            aria-label="TO-220 secret lab"
          >
            <div className="to220-surprise-header">
              <span>Secret lab · Device 220</span>
              <button
                className="btn btn-ghost btn-icon"
                aria-label="Dismiss transistor"
                onClick={dismiss}
              >
                <X size={16} />
              </button>
            </div>
            <div className="to220-stage" aria-hidden="true">
              <span className="to220-orbit to220-orbit-one" />
              <span className="to220-orbit to220-orbit-two" />
              <div className="to220-smoke">
                <i />
                <i />
                <i />
              </div>
              <svg className="to220-friend" viewBox="0 0 120 142" fill="none">
                <path
                  className="to220-metal"
                  fillRule="evenodd"
                  d="M42 12H78L86 20V63H34V20ZM68 31A8 8 0 1 0 52 31A8 8 0 1 0 68 31Z"
                />
                <g className="to220-legs" strokeWidth="8" strokeLinecap="round">
                  <path className="to220-wave" d="M39 100L25 115L12 101" />
                  <path d="M60 100V133M81 100L95 131" />
                </g>
                <path className="to220-package" d="M26 60L34 52H86L94 60V106H26Z" strokeWidth="2" />
                <path className="to220-package-edge" d="M27 61H84L93 60M84 61V105" />
                <g className="to220-face">
                  <circle cx="45" cy="77" r="3" />
                  <circle cx="70" cy="77" r="3" />
                  {smoke ? (
                    <ellipse cx="57.5" cy="91" rx="4" ry="5" />
                  ) : (
                    <path d="M47 88Q57.5 100 68 88" strokeWidth="2.5" strokeLinecap="round" />
                  )}
                </g>
              </svg>
              <span className="to220-stage-label">G · D · S</span>
            </div>
            <div className="to220-message" role="status" aria-live="polite" aria-atomic="true">
              <strong>{smoke ? 'There goes the magic smoke.' : 'Ohm sweet ohm.'}</strong>
              <p>
                {smoke
                  ? 'No real transistors were harmed.'
                  : 'Three pins. A surprisingly big personality.'}
              </p>
            </div>
            <button className="btn btn-outline to220-action" onClick={() => setSmoke(!smoke)}>
              {smoke ? 'Install a fresh one' : 'Release magic smoke'}
            </button>
          </section>,
          document.body,
        )}
    </>
  );
}
