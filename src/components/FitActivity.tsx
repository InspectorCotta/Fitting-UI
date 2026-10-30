import { useId, useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Square, Zap } from 'lucide-react';
import './fit-activity.css';

type Props = {
  progress: number;
  iterations: number;
  name: string;
  algorithm: string;
  temperature: number;
  onStop: () => void;
  compact?: boolean;
};

const steps = ['Initialize', 'Optimize', 'Refine'];

/** Decorative silicon theatre; the readouts use the existing demo runner's progress. */
export function FitActivity({ progress, iterations, name, algorithm, temperature, onStop, compact = false }: Props) {
  const id = useId().replaceAll(':', '');
  const [expanded, setExpanded] = useState(!compact);
  const percent = Math.min(100, Math.max(0, progress));
  const stage = percent < 20 ? 0 : percent < 80 ? 1 : 2;
  const headlines = ['Waking up the silicon.', 'A little less resistance.', 'Finding that sweet spot.'];
  const descriptions = ['Loading measurements. Giving every electron a job.', 'Tuning parameters, one better curve at a time.', 'Refining the final parameter estimates. Almost there.'];
  const prefix = (key: string) => `${id}-${key}`;
  const path = 'M25 198H106L146 174H222L282 140L350 180H442L488 154H565';
  return <section className={`fit-activity ${expanded ? 'is-expanded' : 'is-compact'}`} aria-label="Fit activity" data-stage={stage}
    style={{ '--fit-progress': `${percent}%` } as CSSProperties}>
    <header className="fit-activity-header">
      <span className="silicon-status" aria-hidden="true"><Zap size={14} /></span>
      <div className="fit-activity-title"><strong>{name}</strong><span>{algorithm} · {temperature} K <b>DEMO RUN</b></span></div>
      <span className="fit-activity-percent" aria-hidden="true">{percent.toFixed(0)}<small>%</small></span>
      <button type="button" className="fit-activity-toggle" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        aria-controls={prefix('scene')} aria-label={expanded ? 'Collapse fit animation' : 'Expand fit animation'}>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <button type="button" className="fit-activity-stop" onClick={onStop}><Square size={11} /> Stop run</button>
    </header>
    <div className="fit-activity-body" id={prefix('scene')} hidden={!expanded}>
      <div className="silicon-scene" aria-hidden="true">
        <div className="silicon-scene-grid" />
        <span className="silicon-coordinate">Si / FIELD OF POSSIBILITIES</span>
        <svg viewBox="0 0 590 320" fill="none" focusable="false">
          <defs>
            <linearGradient id={prefix('wafer')} x1="120" y1="80" x2="440" y2="270" gradientUnits="userSpaceOnUse"><stop stopColor="#214763" /><stop offset=".3" stopColor="#122c36" /><stop offset=".65" stopColor="#242445" /><stop offset="1" stopColor="#0b2528" /></linearGradient>
            <linearGradient id={prefix('rim')}><stop stopColor="#54d5c8" /><stop offset=".45" stopColor="#7695ed" /><stop offset=".7" stopColor="#ad8eeb" /><stop offset="1" stopColor="#54d5c8" /></linearGradient>
            <linearGradient id={prefix('die')} x2="1" y2="1"><stop stopColor="#183d41" /><stop offset="1" stopColor="#10262d" /></linearGradient>
            <linearGradient id={prefix('metal')} x2="0" y2="1"><stop stopColor="#d2e9ef" /><stop offset=".5" stopColor="#5e8d9c" /><stop offset="1" stopColor="#aecbd1" /></linearGradient>
            <radialGradient id={prefix('halo')}><stop stopColor="#45f5b6" stopOpacity=".25" /><stop offset="1" stopColor="#45f5b6" stopOpacity="0" /></radialGradient>
            <pattern id={prefix('dies')} width="27" height="27" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="23" height="23" rx="2" stroke="#81b8d0" strokeOpacity=".27" /><path d="M7 8h13M7 12h13M7 16h8" stroke="#81b8d0" strokeOpacity=".14" /></pattern>
            <clipPath id={prefix('clip')}><ellipse cx="290" cy="189" rx="192" ry="97" /></clipPath>
          </defs>
          <ellipse cx="290" cy="209" rx="246" ry="110" fill={`url(#${prefix('halo')})`} className="silicon-halo" />
          <ellipse cx="290" cy="199" rx="220" ry="110" stroke="#558192" strokeOpacity=".18" strokeDasharray="3 9" />
          <path d="M70 199a220 110 0 0 1 440 0" stroke="#60afbd" strokeOpacity=".35" />
          <ellipse cx="290" cy="196" rx="192" ry="97" fill="#07131c" stroke="#3d6581" />
          <ellipse cx="290" cy="189" rx="192" ry="97" fill={`url(#${prefix('wafer')})`} stroke={`url(#${prefix('rim')})`} strokeWidth="1.5" />
          <g clipPath={`url(#${prefix('clip')})`}>
            <g transform="translate(290 189) scale(1 .505) rotate(-30) translate(-290 -189)"><rect x="0" y="-120" width="600" height="600" fill={`url(#${prefix('dies')})`} /></g>
            <g className="silicon-wafer-scan"><path d="M50 40L470 280" stroke="#72ffcb" strokeOpacity=".09" strokeWidth="65" /><path d="M50 40L470 280" stroke="#9cffdf" strokeOpacity=".6" /></g>
            <path d="M180 142l40-20 22 11-40 20zM355 219l40-20 22 11-40 20zM167 205l20-10 22 11-20 10z" fill="#63f8c0" fillOpacity=".25" className="silicon-die-blink" />
          </g>
          <path d="M281 281l9-5 9 5" stroke="#a1c2d3" strokeWidth="2" />
          <ellipse cx="286" cy="193" rx="85" ry="33" fill="#030e19" fillOpacity=".7" />
          <path d={path} stroke="#346a71" strokeWidth="2" />
          <path d={path} stroke="#75ffd0" strokeWidth="2" className="silicon-current" />
          {[0, 1, 2, 3].map(i => <circle key={i} r="3" fill="#c0ffe9" className="silicon-electron" style={{ '--electron-delay': `${i * -.85}s` } as CSSProperties} />)}
          <g className="silicon-floating-die">
            <path d="M186 115l100 58 100-58v17l-100 58-100-58z" fill="#091b26" stroke="#3c7580" />
            <path d="M286 173v17l100-58v-17" fill="#16343e" />
            <path d="M186 115l100-58 100 58-100 58z" fill={`url(#${prefix('die')})`} stroke="#83d8cc" />
            <g transform="matrix(.866 .5 -.866 .5 286 63)">
              <rect width="108" height="108" rx="3" stroke="#4b928c" />
              <rect x="7" y="7" width="73" height="94" rx="2" fill={`url(#${prefix('metal')})`} />
              {Array.from({ length: 10 }, (_, i) => <g key={i}><path d={`M${12 + i * 6.6} 12v84`} stroke="#163c49" strokeWidth="2.8" /><path d={`M${13 + i * 6.6} 12v84`} stroke="#d1fff3" strokeOpacity=".4" strokeWidth=".6" /></g>)}
              <rect x="86" y="7" width="15" height="20" rx="2" fill="#d6b975" />
              <path d="M93 31v63H84" stroke="#e7cb7e" strokeWidth="3" />
              <path d="M93 31v63H84" stroke="#ffecae" strokeWidth="2" className="silicon-gate" />
              <text x="86" y="21" fill="#42391d" fontSize="8" fontFamily="monospace">G</text>
            </g>
            <path d="M218 124q-31-55-70-2M236 134q-28-56-69-2" stroke={`url(#${prefix('metal')})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M352 104q44-42 81 21" stroke="#d6b975" strokeWidth="2" strokeLinecap="round" />
            <path d="M186 115l100 58 100-58" stroke="#9fffe0" strokeOpacity=".7" />
          </g>
          <g stroke="#70969c" strokeWidth=".7"><path d="M350 71l48-32h60" /><path d="M196 137l-65-44H71" /><path d="M326 230l65 39h66" /></g>
          <g fill="#a3c6c9" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1.5"><text x="402" y="31">GATE / TUNE</text><text x="71" y="85">SOURCE</text><text x="398" y="284">DRAIN / FLOW</text></g>
          <g fill="#96ffdb"><circle cx="350" cy="71" r="2" /><circle cx="196" cy="137" r="2" /><circle cx="326" cy="230" r="2" /></g>
        </svg>
        <span className="silicon-scene-caption"><i /> ELECTRONS IN GOOD HANDS <span>◈ MOSFit</span></span>
      </div>
      <div className="fit-activity-story">
        <span className="fit-activity-eyebrow"><i /> SILICON IN MOTION</span>
        <h3>{headlines[stage]}</h3>
        <p>{descriptions[stage]}</p>
        <ol className="fit-activity-stages" aria-label="Fit stages">{steps.map((step, i) => <li key={step} className={i <= stage ? 'is-reached' : ''} aria-current={i === stage ? 'step' : undefined}><span>{i < stage ? '✓' : `0${i + 1}`}</span>{step}</li>)}</ol>
        <div className="fit-activity-telemetry"><div><span>ITERATION</span><strong>{Math.round(percent / 100 * iterations).toLocaleString()} <small>/ {iterations.toLocaleString()}</small></strong></div><div><span>MODE</span><strong>Demo fit <i /></strong></div></div>
        <span className="fit-activity-note">The silicon is illustrative. Your curves stay within reach.</span>
      </div>
    </div>
    <div className="fit-activity-progress" role="progressbar" aria-label="Fit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent.toFixed(0)} percent, ${steps[stage]}`}><span /></div>
    <span className="sr-only" role="status">{steps[stage]} — demo fit running.</span>
  </section>;
}
