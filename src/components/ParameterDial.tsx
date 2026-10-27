import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Parameter = { name: string; label: string; min: number; max: number; step: number; value: number; unit: string };
type Props = { mode?: 'dials' | 'sliders'; parameter: Parameter; value: number; onBegin: () => void; onChange: (value: number) => void; onCommit: () => void };
const point = (angle: number, radius: number) => {
  const a = angle * Math.PI / 180;
  return [50 + radius * Math.sin(a), 50 - radius * Math.cos(a)];
};
function arc(start: number, end: number) {
  const a = point(start, 41), b = point(end, 41);
  return `M ${a[0]} ${a[1]} A 41 41 0 ${end - start > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
export function ParameterDial({ parameter: p, value, onBegin, onChange, onCommit, mode = 'dials' }: Props) {
  const digits = (p.step.toString().split('.')[1] || '').length;
  const format = (n: number) => n.toFixed(digits);
  const [draft, setDraft] = useState(format(value));
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ id: number; y: number; value: number } | null>(null);
  const keyActive = useRef(false);
  const original = useRef(value);
  useEffect(() => { if (!editing) setDraft(format(value)); }, [value, editing, digits]);
  const clamp = (v: number) => Number(Math.min(p.max, Math.max(p.min, p.min + Math.round((v - p.min) / p.step) * p.step)).toFixed(digits));
  const ratio = Math.max(0, Math.min(1, (value - p.min) / (p.max - p.min)));
  const angle = -135 + ratio * 270;
  function finish() {
    if (!gesture.current) return;
    gesture.current = null;
    setDragging(false);
    onCommit();
  }
  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (!keyActive.current) { keyActive.current = true; onBegin(); }
    const step = p.step * (e.key.startsWith('Page') ? 10 : 1);
    const next = e.key === 'Home' ? p.min : e.key === 'End' ? p.max : value + (['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key) ? step : -step);
    onChange(clamp(next));
  }
  return <div title={`${p.label} · ${p.min}–${p.max} ${p.unit}`} className={`parameter-control-card ${mode === 'dials' ? 'dial-card' : 'slider-card'}${dragging ? ' is-dragging' : ''}`}>
    <div className="dial-name"><strong>{p.name}</strong><span>{p.label}</span></div>
    {mode === 'sliders' ? <input className="parameter-range" type="range" aria-label={p.name}
      min={p.min} max={p.max} step={p.step} value={value} aria-describedby="parameter-instructions"
      onPointerDown={e => { onBegin(); e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerUp={onCommit} onPointerCancel={onCommit} onLostPointerCapture={onCommit}
      onKeyDown={e => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key) && !keyActive.current) { keyActive.current = true; onBegin(); } }}
      onKeyUp={() => { if (keyActive.current) { keyActive.current = false; onCommit(); } }}
      onBlur={() => { keyActive.current = false; onCommit(); }}
      onChange={e => { onBegin(); onChange(clamp(e.target.valueAsNumber)); }}
    /> : <div className="dial-control" role="slider" tabIndex={0} aria-label={p.name}
      aria-valuemin={p.min} aria-valuemax={p.max} aria-valuenow={value} aria-valuetext={`${format(value)} ${p.unit}`}
      aria-orientation="vertical" aria-describedby="parameter-instructions"
      title="Drag up/down · Shift for fine control · Double-click to reset"
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        onBegin(); gesture.current = { id: e.pointerId, y: e.clientY, value }; setDragging(true);
      }}
      onPointerMove={e => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const next = Math.min(p.max, Math.max(p.min, g.value + (g.y - e.clientY) / (e.shiftKey ? 2400 : 240) * (p.max - p.min)));
        g.y = e.clientY; g.value = next; onChange(clamp(next));
      }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onDoubleClick={() => { onBegin(); onChange(p.value); onCommit(); }}
      onKeyDown={keyDown} onKeyUp={() => { if (keyActive.current) { keyActive.current = false; onCommit(); } }}
      onBlur={() => { finish(); if (keyActive.current) { keyActive.current = false; onCommit(); } }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => { const a = -135 + i * 27, x = point(a, 47), y = point(a, 49); return <line key={i} x1={x[0]} y1={x[1]} x2={y[0]} y2={y[1]} className={i / 10 <= ratio ? 'tick active' : 'tick'} />; })}
        <path d={arc(-135, 135)} className="dial-track" />
        {ratio > 0 && <path d={arc(-135, angle)} className="dial-progress" />}
        <line x1={point(-135 + (p.value - p.min) / (p.max - p.min) * 270, 37)[0]} y1={point(-135 + (p.value - p.min) / (p.max - p.min) * 270, 37)[1]} x2={point(-135 + (p.value - p.min) / (p.max - p.min) * 270, 44)[0]} y2={point(-135 + (p.value - p.min) / (p.max - p.min) * 270, 44)[1]} className="dial-baseline" />
      </svg>
      <div className="dial-knob" style={{ transform: `rotate(${angle}deg)` }}><i /></div>
    </div>}
    <div className="dial-readout"><input type="number" aria-label={`${p.name} exact value`} min={p.min} max={p.max} step={p.step} value={draft}
      onFocus={() => { original.current = value; setEditing(true); onBegin(); }}
      onChange={e => { setDraft(e.target.value); const n = e.target.valueAsNumber; if (Number.isFinite(n)) onChange(clamp(n)); }}
      onBlur={() => { setDraft(format(value)); setEditing(false); onCommit(); }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { onChange(original.current); setDraft(format(original.current)); setEditing(false); e.currentTarget.blur(); } }} />
      <span>{p.unit || 'unitless'}</span>
    </div>
    {mode === 'sliders' && <div className="dial-bounds"><span>{p.min}</span><span>{p.max}</span></div>}
  </div>;
}
