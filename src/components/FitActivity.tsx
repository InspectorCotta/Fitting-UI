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

/** Illustrative low-side MOSFET switching circuit; the readouts use the existing demo runner's progress. */
export function FitActivity({ progress, iterations, name, algorithm, temperature, onStop, compact = false }: Props) {
  const id = useId().replaceAll(':', '');
  const [expanded, setExpanded] = useState(!compact);
  const percent = Math.min(100, Math.max(0, progress));
  const stage = percent < 20 ? 0 : percent < 80 ? 1 : 2;
  const headlines = ['Waking up the silicon.', 'A little less error.', 'Finding that sweet spot.'];
  const descriptions = ['Loading measurements and initializing the fit.', 'Tuning parameters, one better curve at a time.', 'Refining the final parameter estimates. Almost there.'];
  const prefix = (key: string) => `${id}-${key}`;
  const currentPath = 'M108 156V72Q108 62 118 62H446Q456 62 456 72V198H424V242H456V292Q456 302 446 302H118Q108 302 108 292V208';
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
        <div className="power-stage-heading"><span>01 / THE POWER STAGE</span><span>N-MOS · LOW-SIDE SWITCH</span></div>
        <svg viewBox="0 0 620 430" fill="none" focusable="false">
          <defs>
            <radialGradient id={prefix('field')}><stop stopColor="#43ffd1" stopOpacity=".22" /><stop offset="1" stopColor="#43ffd1" stopOpacity="0" /></radialGradient>
            <linearGradient id={prefix('copper')} x1="90" y1="60" x2="490" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#639d9e" /><stop offset=".45" stopColor="#345c69" /><stop offset="1" stopColor="#76aab0" /></linearGradient>
            <linearGradient id={prefix('load')} x1="446" y1="92" x2="466" y2="132" gradientUnits="userSpaceOnUse"><stop stopColor="#233c42" /><stop offset=".5" stopColor="#42595b" /><stop offset="1" stopColor="#172d35" /></linearGradient>
          </defs>
          {/* A complete, closed circuit. Animated dashes follow conventional current,
              through the load and D–S channel, only during the gate's high phase. */}
          <rect x="65" y="37" width="485" height="291" rx="18" stroke="#29424f" strokeOpacity=".45" />
          {[[77,49],[538,49],[77,316],[538,316]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="3.5" fill="#0b1720" stroke="#36535b" /><path d={`M${x-1.5} ${y}h3`} stroke="#597780" /></g>)}
          <ellipse className="switch-high power-field" cx="440" cy="220" rx="122" ry="110" fill={`url(#${prefix('field')})`} />
          {/* Supply, load and return. There are no ambiguous wire crossings. */}
          <g stroke={`url(#${prefix('copper')})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M108 156V72Q108 62 118 62H446Q456 62 456 72V92M456 132V164M456 280V292Q456 302 446 302H118Q108 302 108 292V208" />
            <circle cx="108" cy="182" r="26" fill="#0b1a22" />
            <path d="M103 171h10M108 166v10M103 194h10" stroke="#b8d3d9" strokeWidth="1.5" />
            <rect x="446" y="92" width="20" height="40" rx="3" fill={`url(#${prefix('load')})`} />
          </g>
          <rect className="switch-high load-heat" x="443" y="89" width="26" height="46" rx="6" fill="#adffe0" fillOpacity=".12" stroke="#86ffca" strokeWidth="1" />
          <g className="power-svg-label"><text x="148" y="184">V<tspan dy="3" fontSize="8">DC</tspan></text><text x="479" y="114">LOAD</text><text x="125" y="282">RETURN</text></g>
          {/* Gate driver referenced to the same source/return node. Its output
              terminates on the insulated gate electrode, not the channel. */}
          <path d="M262 250V302" stroke="#52727c" strokeWidth="1.5" />
          <circle cx="262" cy="302" r="3" fill="#8ab3bb" />
          <rect x="210" y="195" width="104" height="55" rx="9" fill="#122026" stroke="#806d46" />
          <path d="M224 230h10v-18h17v18h17v-18h17v18h15" stroke="#c6a66a" strokeWidth="1.5" />
          <text x="210" y="180" className="power-svg-label">GATE DRIVER</text>
          <path d="M314 222H407M407 196V248" stroke="#8c7851" strokeWidth="2.5" />
          <path className="switch-high gate-voltage" d="M314 222H407M407 196V248" stroke="#f7ce80" strokeWidth="2.5" />
          {/* Enhancement-mode NMOS: segmented channel, body tied to source,
              body arrow into the N channel. Intrinsic diode: anode S, cathode D. */}
          <circle cx="445" cy="222" r="52" stroke="#3c5964" strokeWidth="1" strokeDasharray="2 5" />
          <g stroke="#8cadb7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M456 164V198H424M424 196V208M424 216V228M424 236V248M424 242H456V280M456 242V222H432" />
            <path d="M456 164H508V216M508 235V280H456" stroke="#4c6e7a" strokeWidth="1.5" />
            <path d="M500 216h16M508 218l-8 17h16z" stroke="#7498a4" strokeWidth="1.5" fill="#13262e" />
          </g>
          <path d="M430 217l-8 5 8 5z" fill="#8cadb7" />
          <path className="switch-high power-channel-glow" d="M424 198V242" stroke="#81ffcf" strokeWidth="8" strokeLinecap="round" />
          <path className="switch-high" d="M424 198V242" stroke="#c6ffe8" strokeWidth="2.5" strokeLinecap="round" />
          <g className="switch-high"><path d={currentPath} className="power-current" /><path d="M330 56l7 6-7 6M462 288l-6 7-6-7M184 296l-7 6 7 6" stroke="#98ffda" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></g>
          {/* Labels and pad rings share the exact terminal coordinates. */}
          <g className="power-terminal"><circle cx="370" cy="222" r="5" fill="#122026" stroke="#f7ce80" /><circle cx="456" cy="164" r="5" fill="#102128" stroke="#9adccf" /><circle cx="456" cy="280" r="5" fill="#102128" stroke="#9adccf" /></g>
          <g className="power-terminal-label"><text x="370" y="207" textAnchor="middle" fill="#f7ce80">G</text><text x="440" y="168" textAnchor="end">D</text><text x="440" y="284" textAnchor="end">S</text></g>
          <text x="551" y="227" className="power-svg-label" textAnchor="middle">Q1</text>
          <g transform="translate(225 92)"><rect width="124" height="30" rx="15" fill="#11232a" stroke="#36535b" /><g className="switch-low"><circle cx="17" cy="15" r="3" fill="#6a8590" /><text x="30" y="19" className="power-state-text" fill="#91aab2">CHANNEL OFF</text></g><g className="switch-high"><circle cx="17" cy="15" r="3" fill="#86ffd1" /><text x="30" y="19" className="power-state-text" fill="#aaffdc">CHANNEL ON</text></g></g>
          {/* Both idealized traces share one time cursor and the switch's clock.
              The static waveforms and CSS transitions use the same 22%/72% edges. */}
          <rect x="65" y="344" width="485" height="64" rx="9" fill="#07141b" stroke="#263d48" />
          <g stroke="#29414c" strokeWidth=".6"><path d="M150 363h375M150 389h375M180 351v49M270 351v49M360 351v49M450 351v49" /></g>
          <text x="85" y="366" className="power-scope-label" fill="#e9c480">V<tspan dy="3" fontSize="7">GS</tspan></text>
          <text x="85" y="392" className="power-scope-label" fill="#81f4c7">I<tspan dy="3" fontSize="7">D</tspan></text>
          <path d="M150 370H232.5V356H420V370H525" stroke="#e9c480" strokeWidth="1.5" />
          <path d="M150 396H232.5V382H420V396H525" stroke="#81f4c7" strokeWidth="1.5" />
          <g className="power-scope-cursor"><path d="M150 350v52" stroke="#e5ffff" strokeOpacity=".5" /><circle cx="150" cy="351" r="2" fill="#e5ffff" /></g>
        </svg>
        <div className="power-stage-footer"><span><i /> CONVENTIONAL CURRENT · D → S</span><span>ILLUSTRATIVE LOOP</span></div>
      </div>
      <div className="fit-activity-story">
        <span className="fit-activity-eyebrow"><i /> POWERING THROUGH THE FIT</span>
        <h3>{headlines[stage]}</h3>
        <p>{descriptions[stage]}</p>
        <ol className="fit-activity-stages" aria-label="Fit stages">{steps.map((step, i) => <li key={step} className={i <= stage ? 'is-reached' : ''} aria-current={i === stage ? 'step' : undefined}><span>{i < stage ? '✓' : `0${i + 1}`}</span>{step}</li>)}</ol>
        <div className="fit-activity-telemetry"><div><span>ITERATION</span><strong>{Math.round(percent / 100 * iterations).toLocaleString()} <small>/ {iterations.toLocaleString()}</small></strong></div><div><span>MODE</span><strong>Demo fit <i /></strong></div></div>
        <span className="fit-activity-note">Gate pulses control the channel. Green marks current.</span>
      </div>
    </div>
    <div className="fit-activity-progress" role="progressbar" aria-label="Fit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent.toFixed(0)} percent, ${steps[stage]}`}><span /></div>
    <span className="sr-only" role="status">{steps[stage]} — demo fit running.</span>
  </section>;
}
