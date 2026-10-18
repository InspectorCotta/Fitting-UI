import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  BookOpen,
  Box,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Command,
  Copy,
  Cpu,
  Database,
  Download,
  Ellipsis,
  FileText,
  FlaskConical,
  Folder,
  Globe2,
  Layers3,
  Lightbulb,
  Moon,
  Sun,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Terminal,
  TrendingUp,
  Undo2,
  Redo2,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { Select } from './components/ui/select';
import { CurveChart } from './Chart';
import { FitWorkbench } from './FitWorkbench';
import { WaferArt } from './components/WaferArt';
import { Sidebar, type Theme, type Workspace } from './Sidebar';
import { useWorkspaceNavigation } from './useWorkspaceNavigation';
import { HomePage } from './HomePage';
import { SpiceExport } from './SpiceExport';
import {
  ACTIVE_PROJECT_KEY,
  PROJECTS_KEY,
  openedLabel,
  readProjectLibrary,
  recentProjects,
  templateProject,
  type ProjectSnapshot,
  type SavedProject,
} from './projectLibrary';
import {
  colors,
  initialDatasets,
  initialExperiments,
  initialParameters,
  tabs,
  type Dataset,
  type Experiment,
  type Tab,
} from './data';

type Modal =
  | null
  | 'run'
  | 'edit'
  | 'tags'
  | 'share'
  | 'import'
  | 'search'
  | 'chart'
  | 'settings'
  | 'newProject';
type Values = number[];
function readSaved<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function Badge({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={`badge ${muted ? 'badge-muted' : ''}`}>
      <i />
      {children}
    </span>
  );
}
function IconTile({ children, color = 'green' }: { children: ReactNode; color?: string }) {
  return <div className={`icon-tile ${color}`}>{children}</div>;
}
function Avatar({ children, main = false }: { children: ReactNode; main?: boolean }) {
  return <span className={`avatar ${main ? 'avatar-main' : ''}`}>{children}</span>;
}
export default function App() {
  const {
    tab,
    workspace,
    projectId: routeProjectId,
    goToTab,
    goToWorkspace,
  } = useWorkspaceNavigation();
  const [modal, setModal] = useState<Modal>(null);
  const [menu, setMenu] = useState<null | 'actions'>(null);
  const actionsTrigger = useRef<HTMLButtonElement>(null);
  const [favorite, setFavorite] = useState(() => readSaved('mosfit:favorite', true));
  const [project, setProject] = useState(() =>
    readSaved('mosfit:project', {
      name: 'RX90_GAA',
      description: 'Compact-model fitting for GAA nanosheet devices using BSIM-CMG.',
      owner: 'John Doe',
    }),
  );
  const [tags, setTags] = useState<string[]>(() =>
    readSaved('mosfit:tags', ['GAA', '3 nm', 'BSIM-CMG', 'Compact model', 'R&D']),
  );
  const [notes, setNotes] = useState(() =>
    readSaved(
      'mosfit:notes',
      '# Extraction notes\n\nBaseline DC fit looks good across all four bias conditions.\n\n• Revisit mobility and Vth correlation before the next release.\n• Add 200–400 K measurements for temperature validation.\n• C–V fit needs a closer look at high gate bias.\n\nNext milestone: temperature sweep and model review.',
    ),
  );
  const [datasets, setDatasets] = useState<Dataset[]>(() =>
    readSaved('mosfit:datasets', initialDatasets),
  );
  const [experiments, setExperiments] = useState<Experiment[]>(() =>
    readSaved('mosfit:experiments', initialExperiments),
  );
  const [values, setValues] = useState<Values>(() =>
    readSaved(
      'mosfit:parameters',
      initialParameters.map((p) => p.value),
    ),
  );
  const [history, setHistory] = useState<Values[]>([]);
  const [future, setFuture] = useState<Values[]>([]);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All datasets');
  const [inspector, setInspector] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [runName, setRunName] = useState('Full DC sweep');
  const [temperature, setTemperature] = useState(300);
  const [iterations, setIterations] = useState(240);
  const [algorithm, setAlgorithm] = useState('Levenberg–Marquardt');
  const [runDatasets, setRunDatasets] = useState(['DS-001', 'DS-002']);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description);
  const [tagText, setTagText] = useState(tags.join(', '));
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [importType, setImportType] = useState('Transfer');
  const [selectedExp, setSelectedExp] = useState('EXP-1023');
  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 1]);
  const [theme, setTheme] = useState<Theme>(() =>
    readSaved<Theme>('mosfit:theme', 'black') === 'white' ? 'white' : 'black',
  );
  const [activeProjectId, setActiveProjectId] = useState(() =>
    readSaved<string>(ACTIVE_PROJECT_KEY, 'project-demo'),
  );
  const snapshot = useMemo<ProjectSnapshot>(
    () => ({
      project,
      datasets,
      experiments: experiments.filter((e) => e.status === 'Completed'),
      parameters: values,
      notes,
      tags,
      favorite,
    }),
    [project, datasets, experiments, values, notes, tags, favorite],
  );
  const [projectLibrary, setProjectLibrary] = useState<SavedProject[]>(() => {
    const saved = readProjectLibrary();
    return saved.some((p) => p.id === activeProjectId)
      ? saved
      : [
          ...saved,
          {
            id: activeProjectId,
            lastOpenedAt: localStorage.getItem('mosfit:project') ? Date.now() : null,
            lastTab: 'Overview',
            snapshot,
          },
        ];
  });
  useEffect(() => {
    if (workspace === 'project' && routeProjectId && routeProjectId !== activeProjectId) return;
    setProjectLibrary((library) =>
      library.map((p) =>
        p.id === activeProjectId
          ? { ...p, snapshot, lastTab: workspace === 'project' ? tab : p.lastTab }
          : p,
      ),
    );
  }, [snapshot, activeProjectId, workspace, tab, routeProjectId]);
  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projectLibrary));
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(activeProjectId));
  }, [projectLibrary, activeProjectId]);
  useEffect(() => {
    if (workspace !== 'project' || (routeProjectId && routeProjectId !== activeProjectId)) return;
    setProjectLibrary((library) =>
      library.map((p) => (p.id === activeProjectId ? { ...p, lastOpenedAt: Date.now() } : p)),
    );
  }, [workspace, activeProjectId, routeProjectId]);
  useEffect(() => {
    if (workspace !== 'project' || !routeProjectId || routeProjectId === activeProjectId) return;
    const saved = projectLibrary.find((p) => p.id === routeProjectId);
    if (saved && progress === null) restoreProject(saved);
    else {
      goToTab(tab, activeProjectId);
      notify(
        saved
          ? 'Stop the current experiment before switching projects.'
          : 'That project is not available in this browser.',
      );
    }
  }, [workspace, routeProjectId, activeProjectId, projectLibrary, progress, tab, goToTab]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'white' ? '#ffffff' : '#000000');
    localStorage.setItem('mosfit:theme', JSON.stringify(theme));
  }, [theme]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderStart = useRef<Values | null>(null);
  const shift =
    (values[0] - 0.412) * 1.5 +
    (320 - values[1]) / 5500 +
    (values[2] - 1.1) * 0.045 +
    (values[3] - 245) / 15000 +
    (values[4] - 0.065) * 0.15;
  const bestExperiment = experiments
    .filter((e) => e.status === 'Completed')
    .reduce((a, b) => (a.error < b.error ? a : b));
  const bestError = bestExperiment.error;
  const activeExp = experiments.find((e) => e.id === selectedExp) || experiments[0];
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4200);
  }
  function navigate(t: Tab) {
    goToTab(t, activeProjectId);
    setMenu(null);
  }
  function navigateWorkspace(destination: Workspace) {
    if (destination === 'project') {
      navigate('Overview');
      return;
    }
    goToWorkspace(destination);
    setMenu(null);
    if (destination === 'datasets') setFilter('All datasets');
  }
  function restoreProject(saved: SavedProject) {
    const data = structuredClone(saved.snapshot);
    setActiveProjectId(saved.id);
    setProject(data.project);
    setDatasets(data.datasets);
    setExperiments(data.experiments);
    setValues(data.parameters);
    setNotes(data.notes);
    setTags(data.tags);
    setFavorite(data.favorite);
    setHistory([]);
    setFuture([]);
    sliderStart.current = null;
    setSelectedExp(data.experiments[0].id);
    setRunDatasets(data.datasets.slice(0, 2).map((d) => d.id));
    setFilter('All datasets');
  }
  function openSavedProject(id: string, target?: Tab) {
    const saved = projectLibrary.find((p) => p.id === id);
    if (!saved) return;
    if (progress !== null && id !== activeProjectId) {
      notify('Stop the current experiment before switching projects.');
      return;
    }
    if (id !== activeProjectId) restoreProject(saved);
    goToTab(target || saved.lastTab, id);
    setMenu(null);
  }
  function newProject() {
    if (progress !== null) {
      notify('Stop the current experiment before creating a project.');
      return;
    }
    setEditName('');
    setEditDescription('');
    setModal('newProject');
  }
  useEffect(() => {
    setMenu(null);
    setModal(null);
  }, [workspace, tab]);
  function changeValue(i: number, value: number) {
    setValues((v) => v.map((x, j) => (i === j ? value : x)));
  }
  function commitSlider() {
    if (sliderStart.current) {
      const before = sliderStart.current;
      setHistory((h) => [...h, before]);
      setFuture([]);
      sliderStart.current = null;
    }
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [...f, values]);
    setValues(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, values]);
    setValues(future[future.length - 1]);
    setFuture((f) => f.slice(0, -1));
  }
  useEffect(() => {
    localStorage.setItem('mosfit:parameters', JSON.stringify(values));
  }, [values]);
  useEffect(() => {
    localStorage.setItem('mosfit:project', JSON.stringify(project));
  }, [project]);
  useEffect(() => {
    document.title =
      workspace === 'home' ? 'MOSFit Studio — Home' : `MOSFit Studio — ${project.name}`;
  }, [workspace, project.name]);
  useEffect(() => {
    localStorage.setItem('mosfit:favorite', JSON.stringify(favorite));
  }, [favorite]);
  useEffect(() => {
    localStorage.setItem('mosfit:tags', JSON.stringify(tags));
  }, [tags]);
  useEffect(() => {
    localStorage.setItem('mosfit:notes', JSON.stringify(notes));
  }, [notes]);
  useEffect(() => {
    localStorage.setItem('mosfit:datasets', JSON.stringify(datasets));
  }, [datasets]);
  useEffect(() => {
    localStorage.setItem(
      'mosfit:experiments',
      JSON.stringify(experiments.filter((e) => e.status === 'Completed')),
    );
  }, [experiments]);
  useEffect(() => {
    if (!menu) return;
    const anchor = actionsTrigger.current?.closest('.dropdown-anchor');
    const closeMenu = (event: PointerEvent) => {
      if (!anchor?.contains(event.target as Node)) setMenu(null);
    };
    const blur = (event: FocusEvent) => {
      if (!anchor?.contains(event.target as Node)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null);
        actionsTrigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('focusin', blur);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('focusin', blur);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModal((m) => (m === 'search' ? null : 'search'));
        setQuery('');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        notify('Workspace saved. Everything is right where you left it.');
      }
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function startRun() {
    setModal(null);
    setProgress(0);
    navigate('Experiments');
    const next = `EXP-${Math.max(...experiments.map((e) => Number(e.id.split('-')[1]))) + 1}`;
    const error = Math.max(4.2, bestError - 1.3);
    setExperiments((e) => [
      {
        id: next,
        name: runName,
        status: 'Running',
        error,
        date: 'Just now',
        iterations,
        temperature,
      },
      ...e,
    ]);
    setSelectedExp(next);
    let n = 0;
    timer.current = setInterval(() => {
      n += 2;
      setProgress(n);
      if (n >= 100) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setProgress(null);
        setExperiments((e) => e.map((x) => (x.id === next ? { ...x, status: 'Completed' } : x)));
        notify(`Fit converged. ${error.toFixed(1)}% RMS error — looking sharp.`);
      }
    }, 160);
  }
  function cancelRun() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(null);
    setExperiments((e) => e.filter((x) => x.status !== 'Running'));
    setSelectedExp(experiments.find((e) => e.status === 'Completed')?.id || 'EXP-1023');
    notify('Experiment stopped. Your previous results are safe.');
  }
  function download(name: string, content: string, type = 'application/json') {
    const u = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    a.click();
    URL.revokeObjectURL(u);
  }
  function exportProject() {
    download(
      `${project.name}-workspace.json`,
      JSON.stringify(
        {
          project,
          datasets,
          experiments,
          parameters: initialParameters.map((p, i) => ({ ...p, value: values[i] })),
          notes,
          tags,
        },
        null,
        2,
      ),
    );
    setMenu(null);
    notify('Workspace exported with parameters and results.');
  }
  async function importDataset() {
    if (!importFile) return;
    const contents = await importFile.text();
    const rows = contents.trim().split(/\r?\n/);
    const first = rows[0]?.split(/[,;\t]/);
    if (rows.length < 3 || first.length < 2) {
      setImportError('Use a CSV with a header, at least two columns, and two data rows.');
      return;
    }
    if (
      !rows.slice(1).every((row) =>
        row
          .split(/[,;\t]/)
          .slice(0, 2)
          .every((v) => v.trim() !== '' && Number.isFinite(Number(v))),
      )
    ) {
      setImportError('The first two columns must contain numeric measurement values.');
      return;
    }
    const count = rows.length - 1;
    setDatasets((d) => [
      ...d,
      {
        id: `DS-${String(d.length + 1).padStart(3, '0')}`,
        name: importFile.name.replace(/\.csv$/i, ''),
        type: importType,
        curves: count,
        points: count.toLocaleString(),
        color: colors[d.length % 4],
        temperature: `${temperature} K`,
        file: importFile.name,
      },
    ]);
    setModal(null);
    navigate('Datasets');
    setImportFile(null);
    setImportError('');
    notify(`Imported ${count.toLocaleString()} rows from ${importFile.name}.`);
  }
  const commands = [
    {
      title: 'Home',
      description: 'Recently opened projects and studio overview',
      icon: Folder,
      action: () => navigateWorkspace('home'),
    },
    {
      title: 'New project',
      description: 'Create a local modeling project',
      icon: Plus,
      action: newProject,
    },
    ...tabs.map((t) => ({
      title: t,
      description: `Open ${t.toLowerCase()} in ${project.name}`,
      icon: t === 'Datasets' ? Database : t === 'Experiments' ? FlaskConical : Folder,
      action: () => navigate(t),
    })),
    {
      title: 'Run experiment',
      description: 'Configure a new model fit',
      icon: Play,
      action: () => setModal('run'),
    },
    {
      title: 'Import dataset',
      description: 'Add CSV measurement data',
      icon: Upload,
      action: () => setModal('import'),
    },
    {
      title: 'Export workspace',
      description: 'Download project data as JSON',
      icon: Download,
      action: exportProject,
    },
    {
      title: 'Preferences',
      description: 'Workspace appearance and motion',
      icon: Settings2,
      action: () => setModal('settings'),
    },
  ];
  function openEdit() {
    setEditName(project.name);
    setEditDescription(project.description);
    setModal('edit');
  }
  function runButton() {
    return (
      <Button onClick={() => setModal('run')} disabled={progress !== null}>
        <Play size={14} fill="currentColor" />
        {progress !== null ? 'Experiment running' : 'Run experiment'}
      </Button>
    );
  }
  function Parameters({ full = false }: { full?: boolean }) {
    return (
      <div className={full ? 'parameter-sliders' : 'fitted-table'}>
        {full ? (
          <>
            {initialParameters.map((p, i) => (
              <div className="parameter-row" key={p.name}>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.label}</span>
                  <output>
                    {values[i].toFixed(p.step < 0.01 ? 3 : p.step < 1 ? 2 : 0)}{' '}
                    <small>{p.unit}</small>
                  </output>
                </div>
                <input
                  aria-label={p.name}
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={values[i]}
                  onPointerDown={() => {
                    sliderStart.current = [...values];
                  }}
                  onPointerUp={commitSlider}
                  onBlur={commitSlider}
                  onKeyDown={() => {
                    if (!sliderStart.current) sliderStart.current = [...values];
                  }}
                  onKeyUp={commitSlider}
                  onChange={(e) => changeValue(i, +e.target.value)}
                />
                <div className="range-bounds">
                  <span>
                    {p.min} {p.unit}
                  </span>
                  <span>
                    {p.max} {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Rel. sensitivity</th>
              </tr>
            </thead>
            <tbody>
              {initialParameters.map((p, i) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>
                    {values[i]} <span className="muted">{p.unit}</span>
                  </td>
                  <td>
                    <div className="sensitivity">
                      <span>{p.sensitivity}</span>
                      <i>
                        <b
                          style={{
                            width: `${p.sensitivity * 270}%`,
                            background: i < 2 ? 'var(--green)' : 'var(--blue)',
                          }}
                        />
                      </i>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  function Results() {
    return (
      <div className="results-panel">
        <h4>
          Key results <span>(selected bias)</span>
        </h4>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Target</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[
              ['RMS error (Ids–Vgs)', `${bestError.toFixed(1)}%`, '< 10%'],
              ['RMS error (Ids–Vds)', '9.4%', '< 10%'],
              ['R² score', '0.982', '> 0.98'],
              ['Max error', '6.1%', '< 15%'],
            ].map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td>
                <td className="green-text">{r[1]}</td>
                <td className="muted">{r[2]}</td>
                <td>
                  <Check size={11} className="check-icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="results-subtitle">
          <h4>
            Fitted parameters <span>(top contributors)</span>
          </h4>
          <button onClick={() => navigate('Model Fit')} aria-label="Edit fitted parameters">
            <SlidersHorizontal size={13} />
          </button>
        </div>
        {Parameters({})}
        <button className="link-button results-link" onClick={() => navigate('Model Fit')}>
          Explore model fit <ArrowRight size={13} />
        </button>
      </div>
    );
  }
  function Overview() {
    return (
      <>
        <div className="summary-grid">
          <section className="panel summary-panel metric-panel">
            <div className="summary-heading">
              <IconTile>
                <TrendingUp size={23} />
              </IconTile>
              <div>
                <h3>Best fit metrics</h3>
                <p>
                  From {bestExperiment.id}{' '}
                  <span>· {experiments[0].date === 'Just now' ? 'just now' : '2h ago'}</span>
                </p>
              </div>
              <span className="mini-spark">
                <Sparkles size={13} />
              </span>
            </div>
            <div className="metrics">
              {[
                [`${bestError.toFixed(1)}%`, 'RMS error', '↓ 28%'],
                ['0.982', 'R² score', '↑ 0.04'],
                ['6.1%', 'Max error', '↓ 41%'],
              ].map((m) => (
                <div key={m[1]}>
                  <strong>{m[0]}</strong>
                  <span>{m[1]}</span>
                  <em>{m[2]}</em>
                </div>
              ))}
            </div>
            <div className="metric-caption">
              <CheckCheck size={12} /> All targets met. A good day for curves.
            </div>
          </section>
          <section className="panel summary-panel">
            <div className="summary-heading">
              <IconTile color="blue">
                <Activity size={23} />
              </IconTile>
              <div>
                <h3>Latest experiment</h3>
                <p>
                  {experiments[0].id} · {experiments[0].name}
                </p>
              </div>
            </div>
            <div className="experiment-status">
              <Badge>{experiments[0].status}</Badge>
              <span>{experiments[0].date === 'Just now' ? 'Just now' : '2h ago'}</span>
            </div>
            <dl className="compact-details">
              <dt>Type</dt>
              <dd>Ids–Vgs, Ids–Vds</dd>
              <dt>Temperature</dt>
              <dd>{experiments[0].temperature} K</dd>
              <dt>Bias conditions</dt>
              <dd>Vds = 0.05–0.7 V</dd>
              <dt>Parameters</dt>
              <dd>24 fitted / 2 fixed</dd>
            </dl>
            <button
              className="stretch-link"
              aria-label="View latest experiment"
              onClick={() => {
                setSelectedExp(experiments[0].id);
                navigate('Experiments');
              }}
            />
          </section>
          <section className="panel summary-panel">
            <div className="summary-heading">
              <IconTile color="purple">
                <Database size={23} />
              </IconTile>
              <div>
                <h3>Active datasets</h3>
                <p>{datasets.length} measurement groups</p>
              </div>
              <button className="link-button top-link" onClick={() => navigate('Datasets')}>
                View all
              </button>
            </div>
            <div className="dataset-mini">
              {datasets.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setFilter(d.type);
                    navigate('Datasets');
                  }}
                >
                  <i style={{ background: d.color }} />
                  <span>{d.name}</span>
                  <small>
                    {d.curves >= 1000 ? `${(d.curves / 1000).toFixed(1)}k` : d.curves} curves
                  </small>
                </button>
              ))}
            </div>
          </section>
          <section className="panel summary-panel recommendation-panel">
            <div className="summary-heading">
              <IconTile color="amber">
                <Lightbulb size={23} />
              </IconTile>
              <div>
                <h3>Recommended next steps</h3>
                <p>A little direction for your next fit</p>
              </div>
            </div>
            {[
              ['Run a temperature sweep', 'Add 200–400 K data for a steadier model.', 'run'],
              ['Check C–V fit accuracy', 'A small mismatch at high gate bias.', 'fit'],
              ['Refine mobility parameters', 'Vth and mobility are correlated (ρ = 0.87).', 'corr'],
            ].map((r, i) => (
              <button
                className="recommendation"
                key={r[0]}
                onClick={() => {
                  if (r[2] === 'run') {
                    setRunName('Temperature sweep');
                    setTemperature(400);
                    setModal('run');
                  } else navigate(r[2] === 'fit' ? 'Model Fit' : 'Correlation Matrix');
                }}
              >
                <span className="step-number">{i + 1}</span>
                <span>
                  <strong>{r[0]}</strong>
                  <small>{r[1]}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </section>
        </div>
        <div className="panel analysis-panel">
          <CurveChart shift={shift} onExpand={() => setModal('chart')} notify={notify} />
          {Results()}
        </div>
        <div className="workspace-footer">
          <span>
            <ShieldCheck size={13} /> Workspace saved locally
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd> Jump to anything <span className="footer-divider">/</span> All data in this
            demo is simulated
          </span>
        </div>
      </>
    );
  }
  function DatasetView() {
    const shown = datasets.filter((d) => filter === 'All datasets' || d.type === filter);
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MEASUREMENT LIBRARY</span>
            <h2>Datasets</h2>
            <p>
              {datasets.length} datasets ·{' '}
              {datasets.reduce((n, d) => n + d.curves, 0).toLocaleString()} curves ready for fitting
            </p>
          </div>
          <Button
            onClick={() => {
              setImportError('');
              setModal('import');
            }}
          >
            <Upload size={15} /> Import dataset
          </Button>
        </div>
        <div className="filter-bar">
          <div className="segmented">
            {['All datasets', 'Transfer', 'Output', 'Capacitance'].map((f) => (
              <button
                className={filter === f ? 'selected' : ''}
                key={f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <span>
            <ShieldCheck size={13} /> Validated measurements
          </span>
        </div>
        <div className="panel data-table">
          <table>
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Type</th>
                <th>Curves</th>
                <th>Data points</th>
                <th>Temperature</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="dataset-name">
                      <IconTile
                        color={
                          d.type === 'Transfer' ? 'green' : d.type === 'Output' ? 'blue' : 'purple'
                        }
                      >
                        <Database size={18} />
                      </IconTile>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.id} · {d.file}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{d.type}</span>
                  </td>
                  <td>{d.curves.toLocaleString()}</td>
                  <td>{d.points}</td>
                  <td>{d.temperature}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Preview ${d.name}`}
                      onClick={() => {
                        setFilter(d.type);
                        navigate('Model Fit');
                        notify(`${d.name} selected for preview.`);
                      }}
                    >
                      <ArrowRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel dataset-preview">
          <div className="preview-label">
            <Activity size={16} />
            <span>Measurement preview</span>
            <Badge>Ready to fit</Badge>
          </div>
          <CurveChart
            kind={
              filter === 'Output' ? 'output' : filter === 'Capacitance' ? 'capacitance' : 'transfer'
            }
            compact
            notify={notify}
          />
        </div>
      </div>
    );
  }
  function ExperimentsView() {
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPERIMENT LOG</span>
            <h2>Experiments</h2>
            <p>Compare fits and follow your model’s progress.</p>
          </div>
          {runButton()}
        </div>
        {progress !== null && (
          <section className="panel run-progress">
            <div className="run-progress-heading">
              <div className="running-icon">
                <Activity size={21} />
              </div>
              <div>
                <h3>{runName}</h3>
                <p>
                  {algorithm} · {temperature} K · iteration{' '}
                  {Math.round((progress / 100) * iterations)} / {iterations}
                </p>
              </div>
              <strong>{progress}%</strong>
              <Button variant="outline" onClick={cancelRun}>
                <Square size={13} /> Stop run
              </Button>
            </div>
            <div className="progress-track">
              <motion.div animate={{ width: `${progress}%` }} />
            </div>
            <div className="run-log">
              <Terminal size={13} />
              <span>
                {progress < 20
                  ? 'Initializing parameters and loading measurement groups…'
                  : progress < 70
                    ? `Optimizing loss… RMS ${(24 - progress * 0.19).toFixed(2)}% · gradient norm ${(1 / (progress + 1)).toExponential(2)}`
                    : 'Almost there. Refining the final parameter estimates…'}
              </span>
              <span className="live-dot">LIVE</span>
            </div>
          </section>
        )}
        <div className="panel data-table">
          <table>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Status</th>
                <th>RMS error</th>
                <th>Iterations</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {experiments.map((e) => (
                <tr
                  className={e.id === selectedExp ? 'selected-row' : ''}
                  key={e.id}
                  onClick={() => setSelectedExp(e.id)}
                >
                  <td>
                    <div className="dataset-name">
                      <IconTile color="blue">
                        <FlaskConical size={18} />
                      </IconTile>
                      <div>
                        <strong>{e.name}</strong>
                        <small>
                          {e.id} · {e.temperature} K
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge muted={e.status === 'Running'}>{e.status}</Badge>
                  </td>
                  <td className={e.error < 10 ? 'green-text' : ''}>
                    {e.status === 'Running' ? '—' : `${e.error.toFixed(1)}%`}
                  </td>
                  <td>{e.iterations}</td>
                  <td className="muted">{e.date}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Inspect ${e.id}`}
                      onClick={() => setSelectedExp(e.id)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel convergence-panel">
          <div className="chart-heading">
            <div>
              <h3>
                Convergence history <span className="muted">/ {activeExp.id}</span>
              </h3>
              <p>
                {activeExp.name} · {activeExp.iterations} iterations
              </p>
            </div>
            <span className="tag">
              <i className="tiny-dot" /> RMS loss
            </span>
          </div>
          <svg viewBox="0 0 1000 210" role="img" aria-label="Simulated loss convergence chart">
            <defs>
              <linearGradient id="convergence-fill" x2="0" y2="1">
                <stop stopColor="var(--green)" stopOpacity=".15" />
                <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <line
                  x1="45"
                  x2="975"
                  y1={25 + i * 45}
                  y2={25 + i * 45}
                  stroke="var(--chart-grid)"
                />
                <text
                  x="30"
                  y={29 + i * 45}
                  textAnchor="end"
                  fill="var(--chart-label)"
                  fontSize="11"
                >
                  {30 - i * 7}%
                </text>
              </g>
            ))}
            <path
              d={`M45 25 ${Array.from({ length: 100 }, (_, i) => `L${45 + i * 9.3},${25 + 125 * (1 - Math.exp(-i / 18)) + Math.sin(i * 2) * (5 - i / 25)}`).join(' ')} L966 180 L45 180Z`}
              fill="url(#convergence-fill)"
            />
            <path
              d={`M45 25 ${Array.from({ length: progress === null ? 100 : Math.max(2, progress) }, (_, i) => `L${45 + i * 9.3},${25 + 125 * (1 - Math.exp(-i / 18)) + Math.sin(i * 2) * (5 - i / 25)}`).join(' ')}`}
              fill="none"
              stroke="var(--green)"
              strokeWidth="2"
            />
            {[0, 60, 120, 180, 240].map((n, i) => (
              <text key={n} x={45 + i * 230} y="200" fill="var(--chart-label)" fontSize="11">
                {Math.round((n / 240) * activeExp.iterations)}
              </text>
            ))}
          </svg>
          <div className="convergence-bottom">
            <span>
              <CheckCheck size={15} />
              {activeExp.status === 'Completed'
                ? 'Converged within tolerance'
                : 'Fitting in progress'}
            </span>
            <span>
              Final RMS{' '}
              <strong>
                {activeExp.status === 'Completed' ? `${activeExp.error.toFixed(1)}%` : '…'}
              </strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate('Model Fit');
              }}
            >
              Open fit <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  function FitView() {
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MODEL WORKBENCH</span>
            <h2>Model fit</h2>
            <p>Inspect transfer, output, and capacitance fits. Arrange plots and save a view.</p>
          </div>
          <div className="inline-actions">
            <Button
              variant="outline"
              size="icon"
              aria-label="Undo parameter change"
              disabled={!history.length}
              onClick={undo}
            >
              <Undo2 size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Redo parameter change"
              disabled={!future.length}
              onClick={redo}
            >
              <Redo2 size={16} />
            </Button>
            {runButton()}
          </div>
        </div>
        <FitWorkbench
          shift={shift}
          notify={notify}
          parameters={
            <section className="panel parameters-panel">
              <div className="panel-heading">
                <h3>Parameter tuning</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHistory((h) => [...h, values]);
                    setFuture([]);
                    setValues(initialParameters.map((p) => p.value));
                    notify('Parameters reset to the fitted baseline.');
                  }}
                >
                  Reset
                </Button>
              </div>
              {Parameters({ full: true })}
              <div className="parameter-hint">
                <Lightbulb size={15} />
                <p>VTH0 and U0 have the most influence. Try a small change first.</p>
              </div>
            </section>
          }
        />
        <div className="panel fit-results">
          {Results()}
          <div className="fit-note">
            <IconTile>
              <CheckCheck size={23} />
            </IconTile>
            <h3>Your baseline is in a good place.</h3>
            <p>
              All four fit targets are met. Use the live preview to explore sensitivity before
              starting another extraction.
            </p>
            <Button variant="outline" onClick={() => navigate('Correlation Matrix')}>
              Inspect correlations <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  function TrendsView() {
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PARAMETER TRENDS</span>
            <h2>Parameter trends</h2>
            <p>Fitted values across your last four experiments.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              download(
                'parameter-history.csv',
                'Experiment,VTH0,U0,TOX,RDSW,ETA0\nEXP-1020,0.46,285,1.28,278,0.081\nEXP-1021,0.435,302,1.19,263,0.074\nEXP-1022,0.421,313,1.14,252,0.068\nEXP-1023,0.412,320,1.1,245,0.065',
                'text/csv',
              );
              notify('Parameter history exported.');
            }}
          >
            <Download size={14} /> Export history
          </Button>
        </div>
        <div className="trend-grid">
          {initialParameters.slice(0, 4).map((p, i) => (
            <section className="panel trend-panel" key={p.name}>
              <div>
                <span className="eyebrow">{p.label}</span>
                <h3>
                  {p.name}{' '}
                  <strong>
                    {values[i]} <small>{p.unit}</small>
                  </strong>
                </h3>
              </div>
              <svg viewBox="0 0 440 180" role="img" aria-label={`${p.name} parameter trend`}>
                <line x1="20" x2="420" y1="140" y2="140" stroke="var(--chart-grid)" />
                {[35, 70, 105].map((y) => (
                  <line key={y} x1="20" x2="420" y1={y} y2={y} stroke="var(--chart-grid)" />
                ))}
                <path
                  d={
                    i === 1
                      ? 'M30 125 C90 125 110 80 160 80 S245 50 290 50 S350 35 410 35'
                      : 'M30 32 C90 32 110 80 160 80 S245 110 290 110 S350 126 410 126'
                  }
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth="2.5"
                />
                {[30, 160, 290, 410].map((x, j) => (
                  <g key={x}>
                    <circle
                      cx={x}
                      cy={i === 1 ? [125, 80, 50, 35][j] : [32, 80, 110, 126][j]}
                      r="4"
                      fill="var(--chart-bg)"
                      stroke={colors[i]}
                      strokeWidth="2"
                    />
                    <text x={x} y="166" textAnchor="middle" fill="var(--chart-label)" fontSize="11">
                      {1020 + j}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="trend-foot">
                <span>Experiment ID</span>
                <span className="green-text">
                  <ArrowDownLeft size={13} />
                  {i === 1 ? '+12.3%' : '−10.4%'} from baseline
                </span>
              </div>
            </section>
          ))}
        </div>
        <div className="inline-callout">
          <Lightbulb size={20} />
          <div>
            <strong>Small changes. Steadier fits.</strong>
            <p>
              Parameter movement is slowing across recent experiments, a useful sign of convergence.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('Experiments')}>
            Review experiments <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    );
  }
  const correlation = [
    [1, 0.87, -0.32, 0.18, -0.61],
    [0.87, 1, -0.45, 0.29, -0.54],
    [-0.32, -0.45, 1, 0.12, 0.24],
    [0.18, 0.29, 0.12, 1, -0.08],
    [-0.61, -0.54, 0.24, -0.08, 1],
  ];
  function CorrelationView() {
    const [a, b] = selectedCell;
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CORRELATION MATRIX</span>
            <h2>Parameter correlations</h2>
            <p>Pearson correlation across the fitted parameter ensemble.</p>
          </div>
          <span className="tag">EXP-1023 · 240 iterations</span>
        </div>
        <div className="correlation-layout">
          <section className="panel matrix-panel">
            <div className="matrix">
              <div />
              {initialParameters.map((p) => (
                <span className="matrix-label" key={p.name}>
                  {p.name}
                </span>
              ))}
              {initialParameters.map((p, i) => (
                <div className="matrix-row" key={p.name}>
                  <span className="matrix-label">{p.name}</span>
                  {correlation[i].map((v, j) => (
                    <button
                      key={j}
                      className={`${a === i && b === j ? 'cell-selected' : ''}`}
                      style={{
                        background:
                          v >= 0
                            ? `rgba(45, 213, 171, ${0.08 + Math.abs(v) * 0.55})`
                            : `rgba(111, 123, 246, ${0.1 + Math.abs(v) * 0.6})`,
                      }}
                      onClick={() => setSelectedCell([i, j])}
                      aria-label={`${p.name} and ${initialParameters[j].name}: ${v}`}
                    >
                      {v.toFixed(2)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="matrix-scale">
              <span>−1 · negative</span>
              <i />
              <span>+1 · positive</span>
            </div>
          </section>
          <section className="panel correlation-detail">
            <IconTile color="blue">
              <Layers3 size={24} />
            </IconTile>
            <span className="eyebrow">SELECTED PAIR</span>
            <h2>
              {initialParameters[a].name} <span>×</span> {initialParameters[b].name}
            </h2>
            <div className="correlation-number">
              {correlation[a][b].toFixed(2)}
              <small>Pearson coefficient</small>
            </div>
            <p>
              {a === b
                ? 'A parameter is perfectly correlated with itself. Select another cell to explore relationships.'
                : Math.abs(correlation[a][b]) > 0.7
                  ? 'These parameters are strongly coupled. Consider fixing one while fitting the other to improve extraction stability.'
                  : 'This pair shows a weaker relationship. Independent tuning is less likely to destabilize the fit.'}
            </p>
            <Button variant="outline" onClick={() => navigate('Model Fit')}>
              Tune parameters <ArrowRight size={14} />
            </Button>
          </section>
        </div>
      </div>
    );
  }
  function NotesView() {
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LAB NOTEBOOK</span>
            <h2>Project notes</h2>
            <p>Extraction observations, open questions, and the next good idea.</p>
          </div>
          <span className="saved-label">
            <CheckCheck size={15} /> Saved on this device
          </span>
        </div>
        <div className="panel notes-panel">
          <div className="notes-toolbar">
            <span>
              <FileText size={16} /> Project notes
            </span>
            <span>Plain text · auto-saved</span>
          </div>
          <textarea
            aria-label="Project notes"
            spellCheck={false}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="notes-footer">
            <span>{notes.split(/\s+/).filter(Boolean).length} words</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                download(`${project.name}-notes.txt`, notes, 'text/plain');
                notify('Lab notes exported.');
              }}
            >
              <Download size={13} /> Export notes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function WorkspaceView() {
    if (workspace === 'datasets') return DatasetView();
    if (workspace === 'experiments') return ExperimentsView();
    if (workspace === 'projects')
      return (
        <div className="view-stack">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h2>Projects</h2>
              <p>From measurements to models. Pick up where you left off.</p>
            </div>
            <Button onClick={newProject}>
              <Plus size={15} /> New project
            </Button>
          </div>
          <div className="project-library-list">
            {recentProjects(projectLibrary).map((saved) => (
              <button
                key={saved.id}
                className="panel project-card"
                onClick={() => openSavedProject(saved.id)}
                aria-label={`Open ${saved.snapshot.project.name}`}
              >
                <img src="/device.svg" alt="GAA nanosheet device schematic" />
                <div>
                  <Badge muted={saved.id !== activeProjectId}>
                    {saved.id === activeProjectId
                      ? 'Current project'
                      : openedLabel(saved.lastOpenedAt)}
                  </Badge>
                  <h2>{saved.snapshot.project.name}</h2>
                  <p>{saved.snapshot.project.description}</p>
                  <span>
                    {saved.snapshot.datasets.length} datasets <b>·</b>{' '}
                    {saved.snapshot.experiments.length} experiments <b>·</b> BSIM-CMG
                  </span>
                </div>
                <ArrowRight size={22} />
              </button>
            ))}
          </div>
          <div className="inline-callout">
            <BookOpen size={20} />
            <div>
              <strong>Your next good fit starts here.</strong>
              <p>Open a project to explore datasets, tune parameters, and run extractions.</p>
            </div>
          </div>
        </div>
      );
    if (workspace === 'models')
      return (
        <div className="view-stack">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MODEL LIBRARY</span>
              <h2>Model library</h2>
              <p>Compact models available in this workspace.</p>
            </div>
            <span className="tag">1 active model</span>
          </div>
          <section className="panel model-card">
            <IconTile color="blue">
              <Box size={28} />
            </IconTile>
            <div>
              <Badge>In use</Badge>
              <h2>BSIM-CMG</h2>
              <p>
                Common multi-gate compact model for advanced FinFET and gate-all-around devices.
              </p>
              <div className="model-facts">
                <span>
                  <small>VERSION</small>111.0
                </span>
                <span>
                  <small>PARAMETERS</small>26 configured
                </span>
                <span>
                  <small>DEVICE</small>GAA nanosheet
                </span>
              </div>
              <Button variant="outline" onClick={() => navigate('Model Fit')}>
                Open model workbench <ArrowRight size={15} />
              </Button>
            </div>
          </section>
        </div>
      );
    return (
      <div className="view-stack">
        <div className="section-heading">
          <div>
            <span className="eyebrow">COMPUTE</span>
            <h2>Your local fitting engine.</h2>
            <p>A lightweight simulation runner for this interactive demo.</p>
          </div>
          <Badge>{progress !== null ? 'Computing' : 'Ready'}</Badge>
        </div>
        <section className="panel compute-panel">
          <div className="compute-orb">
            <Cpu size={40} />
            <span />
          </div>
          <div>
            <h2>Browser runtime</h2>
            <p>Simulated optimization · no server required</p>
          </div>
          <div className="compute-stats">
            <span>
              <small>QUEUE</small>
              {progress === null ? 'Idle' : '1 running'}
            </span>
            <span>
              <small>ALGORITHM</small>
              {algorithm}
            </span>
            <span>
              <small>MODE</small>Local demo
            </span>
          </div>
          {progress === null ? (
            runButton()
          ) : (
            <Button variant="outline" onClick={cancelRun}>
              <Pause size={15} /> Stop computation
            </Button>
          )}
        </section>
        <div className="inline-callout">
          <Terminal size={19} />
          <div>
            <strong>Ready for a scientific core.</strong>
            <p>
              This prototype runs simulated curves locally. A FastAPI service can later connect your
              Python fitting engine.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div
        className={`app-shell ${reduceMotion ? 'reduce-motion' : ''} ${!inspector || workspace !== 'project' ? 'without-inspector' : ''}`}
      >
        <Sidebar
          workspace={workspace}
          theme={theme}
          onThemeChange={setTheme}
          onNavigate={navigateWorkspace}
          onSearch={() => {
            setQuery('');
            setModal('search');
          }}
          onPreferences={() => setModal('settings')}
          onExport={exportProject}
          latestExperiment={experiments.find((e) => e.status === 'Completed') || bestExperiment}
        />
        <main className="main-workspace">
          {workspace === 'home' ? (
            <HomePage
              projects={projectLibrary}
              activeId={activeProjectId}
              onOpenProject={openSavedProject}
              onNewProject={newProject}
              onBrowse={() => navigateWorkspace('projects')}
              onNavigate={navigateWorkspace}
              onSearch={() => {
                setQuery('');
                setModal('search');
              }}
            />
          ) : workspace === 'project' ? (
            <>
              <section className="project-header">
                <WaferArt />
                <div className="breadcrumb">
                  <button onClick={() => navigateWorkspace('projects')}>Projects</button>
                  <ChevronRight size={12} />
                  <span>{project.name}</span>
                </div>
                <div className="project-title">
                  <h1>{project.name}</h1>
                  <button
                    className={`favorite ${favorite ? 'is-favorite' : ''}`}
                    aria-label={favorite ? 'Unstar project' : 'Star project'}
                    onClick={() => {
                      setFavorite(!favorite);
                      notify(
                        favorite
                          ? 'Project removed from favorites.'
                          : 'Project added to favorites.',
                      );
                    }}
                  >
                    <Star size={23} fill={favorite ? 'currentColor' : 'none'} />
                  </button>
                  <Badge>Active</Badge>
                  {tab === 'Overview' && <div className="overview-action">{runButton()}</div>}
                </div>
                <p className="project-description">{project.description}</p>
                <div className="project-metadata">
                  {[
                    {
                      icon: Database,
                      value: `${datasets.length} datasets`,
                      label: 'Measurements',
                      action: () => navigate('Datasets'),
                    },
                    {
                      icon: Layers3,
                      value: 'GAA nanosheet',
                      label: 'Device type',
                      action: openEdit,
                    },
                    {
                      icon: Database,
                      value: 'BSIM-CMG',
                      label: 'Model family',
                      action: () => navigateWorkspace('models'),
                    },
                    {
                      icon: Users,
                      value: project.owner,
                      label: 'Owner',
                      action: () => setModal('share'),
                    },
                    {
                      icon: Users,
                      value: 'Modeling',
                      label: 'Team',
                      action: () => setModal('share'),
                    },
                    {
                      icon: Clock3,
                      value: experiments[0].date === 'Just now' ? 'Just now' : '2h ago',
                      label: 'Last activity',
                      action: () => navigate('Experiments'),
                    },
                  ].map((m) => (
                    <button key={m.label} onClick={m.action}>
                      <span className="meta-icon">
                        <m.icon size={16} />
                      </span>
                      <span>
                        <strong>{m.value}</strong>
                        <small>{m.label}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="project-tabs" role="tablist" aria-label="Project sections">
                {tabs.map((t) => (
                  <button
                    id={`tab-${t.replaceAll(' ', '-')}`}
                    role="tab"
                    aria-selected={t === tab}
                    aria-controls="project-tabpanel"
                    key={t}
                    className={t === tab ? 'active' : ''}
                    onClick={() => navigate(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const next =
                          tabs[
                            (tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) %
                              tabs.length
                          ];
                        navigate(next);
                        document.getElementById(`tab-${next.replaceAll(' ', '-')}`)?.focus();
                      }
                    }}
                  >
                    {t}
                    {t === 'Experiments' && progress !== null && <i className="tiny-dot" />}
                  </button>
                ))}
                <button
                  className="inspector-toggle"
                  aria-label="Toggle project details"
                  title="Toggle project details"
                  onClick={() => setInspector((v) => !v)}
                >
                  <SlidersHorizontal size={15} />
                </button>
              </div>
              <motion.div
                key={tab}
                id="project-tabpanel"
                role="tabpanel"
                aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.23 }}
                className="tab-content"
              >
                {tab === 'Overview' ? (
                  Overview()
                ) : tab === 'Datasets' ? (
                  DatasetView()
                ) : tab === 'Experiments' ? (
                  ExperimentsView()
                ) : tab === 'Model Fit' ? (
                  FitView()
                ) : tab === 'Parameter Trends' ? (
                  TrendsView()
                ) : tab === 'Correlation Matrix' ? (
                  CorrelationView()
                ) : tab === 'SPICE Export' ? (
                  <SpiceExport
                    key={activeProjectId}
                    projectId={activeProjectId}
                    projectName={project.name}
                    values={values}
                    datasets={datasets}
                    notify={notify}
                    download={download}
                  />
                ) : (
                  NotesView()
                )}
              </motion.div>
            </>
          ) : (
            <div className="global-content">{WorkspaceView()}</div>
          )}
        </main>
        {inspector && workspace === 'project' && (
          <aside className="inspector">
            <div className="inspector-actions">
              <div className="dropdown-anchor">
                <Button
                  variant="outline"
                  aria-expanded={menu === 'actions'}
                  ref={actionsTrigger}
                  aria-controls={menu === 'actions' ? 'project-actions' : undefined}
                  onClick={() => setMenu(menu === 'actions' ? null : 'actions')}
                >
                  <Ellipsis size={16} />
                  <span>More</span>
                </Button>
                {menu === 'actions' && (
                  <div className="menu-surface dropdown actions-menu" id="project-actions">
                    <button onClick={exportProject}>
                      <Download size={15} /> Export workspace
                    </button>
                    <button
                      onClick={() => {
                        download(
                          `${project.name}_COPY.json`,
                          JSON.stringify(
                            {
                              project: { ...project, name: `${project.name}_COPY` },
                              datasets,
                              experiments,
                              parameters: values,
                              notes,
                              tags,
                            },
                            null,
                            2,
                          ),
                        );
                        setMenu(null);
                        notify('Project copy downloaded.');
                      }}
                    >
                      <Copy size={15} /> Download project copy
                    </button>
                    <button
                      onClick={() => {
                        setModal('share');
                        setMenu(null);
                      }}
                    >
                      <Users size={15} /> Sharing settings
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="inspector-section">
              <div className="inspector-heading">
                <h3>Project details</h3>
                <button className="link-button" onClick={openEdit}>
                  Edit
                </button>
              </div>
              <img
                className="device-image"
                src="/device.svg"
                alt="Cross-section schematic of a stacked GAA nanosheet device with a 50 nanometer scale bar"
              />
              <dl className="project-details">
                <dt>Name</dt>
                <dd>{project.name}</dd>
                <dt>Description</dt>
                <dd>{project.description}</dd>
                <dt>Model family</dt>
                <dd>BSIM-CMG</dd>
                <dt>Device type</dt>
                <dd>GAA nanosheet</dd>
                <dt>Node</dt>
                <dd>3 nm (R&D)</dd>
                <dt>Owner</dt>
                <dd>{project.owner}</dd>
                <dt>Team</dt>
                <dd>Modeling</dd>
                <dt>Status</dt>
                <dd className="green-text">
                  <i className="tiny-dot" /> Active
                </dd>
                <dt>Created</dt>
                <dd>Oct 14, 2026</dd>
                <dt>Last modified</dt>
                <dd>{experiments[0].date === 'Just now' ? 'Just now' : '2h ago'}</dd>
                <dt>Datasets</dt>
                <dd>{datasets.length} (shared)</dd>
                <dt>Experiments</dt>
                <dd>{experiments.length}</dd>
                <dt>Storage</dt>
                <dd>2.4 GB</dd>
              </dl>
            </div>
            <div className="inspector-section">
              <div className="inspector-heading">
                <h3>Tags</h3>
                <button
                  className="link-button"
                  onClick={() => {
                    setTagText(tags.join(', '));
                    setModal('tags');
                  }}
                >
                  Edit
                </button>
              </div>
              <div className="tags">
                {tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="inspector-section sharing-section">
              <div className="inspector-heading">
                <h3>Sharing</h3>
                <button className="link-button" onClick={() => setModal('share')}>
                  Manage
                </button>
              </div>
              <button className="sharing-people" onClick={() => setModal('share')}>
                <div className="avatar-stack">
                  <Avatar main>JD</Avatar>
                  <Avatar>SK</Avatar>
                  <Avatar>ML</Avatar>
                  <Avatar>+2</Avatar>
                </div>
                <span>
                  <Globe2 size={13} /> Team workspace
                </span>
              </button>
            </div>
            <div className="inspector-bottom">
              <span className="connection-dot" /> Local demo <span>v0.1</span>
            </div>
          </aside>
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <span>
                <Check size={15} />
              </span>
              {toast}
              <button aria-label="Dismiss notification" onClick={() => setToast('')}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <Dialog
          open={modal === 'run'}
          onOpenChange={(v) => !v && setModal(null)}
          title="New experiment"
          description="Configure a simulated extraction. A good fit is worth the wait."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startRun();
            }}
          >
            <label>
              Experiment name
              <input
                required
                maxLength={60}
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Algorithm
                <Select
                  aria-label="Algorithm"
                  value={algorithm}
                  onValueChange={setAlgorithm}
                  groups={[
                    {
                      options: ['Levenberg–Marquardt', 'Differential evolution', 'Adam'].map(
                        (value) => ({ value, label: value }),
                      ),
                    },
                  ]}
                />
              </label>
              <label>
                Temperature (K)
                <input
                  type="number"
                  min="100"
                  max="600"
                  value={temperature}
                  onChange={(e) => setTemperature(+e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Maximum iterations
              <input
                type="number"
                min="50"
                max="2000"
                step="10"
                value={iterations}
                onChange={(e) => setIterations(+e.target.value)}
                required
              />
            </label>
            <fieldset>
              <legend>Measurement groups</legend>
              {datasets.map((d) => (
                <label className="checkbox-label" key={d.id}>
                  <input
                    type="checkbox"
                    checked={runDatasets.includes(d.id)}
                    onChange={(e) =>
                      setRunDatasets((r) =>
                        e.target.checked ? [...r, d.id] : r.filter((x) => x !== d.id),
                      )
                    }
                  />
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {d.curves.toLocaleString()} curves · {d.temperature}
                    </small>
                  </span>
                  <i style={{ background: d.color }} />
                </label>
              ))}
            </fieldset>
            <div className="form-note">
              <Cpu size={15} /> Runs locally with simulated data. Takes about 8 seconds.
            </div>
            <div className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                disabled={progress !== null || !runDatasets.length || !runName.trim()}
                type="submit"
              >
                <Play size={14} fill="currentColor" /> Start experiment
              </Button>
            </div>
          </form>
        </Dialog>
        <Dialog
          open={modal === 'edit' || modal === 'newProject'}
          onOpenChange={(v) => !v && setModal(null)}
          title={modal === 'newProject' ? 'New project' : 'Project details'}
          description={
            modal === 'newProject'
              ? 'Create a project using the demo’s GAA measurement template.'
              : 'Update the project name and description.'
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modal === 'newProject') {
                if (progress !== null) {
                  notify('Stop the current experiment before creating a project.');
                  return;
                }
                const saved: SavedProject = {
                  id: `project-${crypto.randomUUID()}`,
                  lastOpenedAt: Date.now(),
                  lastTab: 'Overview',
                  snapshot: templateProject(editName.trim(), editDescription),
                };
                setProjectLibrary((library) => [...library, saved]);
                restoreProject(saved);
                goToTab('Overview', saved.id);
              } else {
                setProject((p) => ({ ...p, name: editName.trim(), description: editDescription }));
                navigate('Overview');
              }
              setModal(null);
              notify(
                modal === 'newProject'
                  ? 'Project created. Your other projects are saved in the library.'
                  : 'Project details saved.',
              );
            }}
          >
            <label>
              Project name
              <input
                required
                maxLength={35}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                required
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Device type
                <input value="GAA nanosheet" readOnly />
              </label>
              <label>
                Model family
                <input value="BSIM-CMG" readOnly />
              </label>
            </div>
            <div className="dialog-footer">
              <Button variant="outline" type="button" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editName.trim()}>
                <Check size={15} /> Save project
              </Button>
            </div>
          </form>
        </Dialog>
        <Dialog
          open={modal === 'tags'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Edit project tags"
          description="Separate project tags with commas."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTags(
                [
                  ...new Set(
                    tagText
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  ),
                ].slice(0, 10),
              );
              setModal(null);
              notify('Project tags updated.');
            }}
          >
            <label>
              Tags
              <input value={tagText} onChange={(e) => setTagText(e.target.value)} />
            </label>
            <div className="dialog-footer">
              <Button type="submit">Save tags</Button>
            </div>
          </form>
        </Dialog>
        <Dialog
          open={modal === 'share'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Better models, together."
          description="Preview team access for this demo workspace."
        >
          <div className="team-list">
            {[
              ['JD', 'John Doe', 'Owner'],
              ['SK', 'Sarah Kim', 'Can edit'],
              ['ML', 'Max Liu', 'Can edit'],
              ['AP', 'Alex Park', 'Can view'],
              ['RN', 'Robin Nguyen', 'Can view'],
            ].map(([initials, name, role]) => (
              <div key={initials}>
                <Avatar main={initials === 'JD'}>{initials}</Avatar>
                <span>{name}</span>
                <small>{role}</small>
              </div>
            ))}
          </div>
          <div className="form-note">
            <ShieldCheck size={16} /> Team access is illustrative. This demo stays on your device.
          </div>
          <div className="dialog-footer">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.origin);
                  notify('Demo link copied. Workspace edits stay on this device.');
                } catch {
                  notify('Clipboard is unavailable in this browser. Copy the address bar URL.');
                }
              }}
            >
              <Copy size={15} /> Copy demo link
            </Button>
            <Button onClick={() => setModal(null)}>Done</Button>
          </div>
        </Dialog>
        <Dialog
          open={modal === 'import'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Import measurements"
          description="Import a CSV for the measurement library. Charts remain illustrative in this demo."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void importDataset();
            }}
          >
            <label className="upload-zone">
              <Upload size={28} />
              <strong>{importFile ? importFile.name : 'Choose a CSV file'}</strong>
              <span>Header row + two or more numeric columns</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportError('');
                }}
              />
            </label>
            <div className="form-grid">
              <label>
                Measurement type
                <Select
                  aria-label="Measurement type"
                  value={importType}
                  onValueChange={setImportType}
                  groups={[
                    {
                      options: ['Transfer', 'Output', 'Capacitance'].map((value) => ({
                        value,
                        label: value,
                      })),
                    },
                  ]}
                />
              </label>
              <label>
                Temperature (K)
                <input
                  type="number"
                  min="100"
                  max="600"
                  value={temperature}
                  onChange={(e) => setTemperature(+e.target.value)}
                />
              </label>
            </div>
            {importError && (
              <p role="alert" className="form-error">
                {importError}
              </p>
            )}
            <div className="dialog-footer">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  download(
                    'sample-transfer.csv',
                    'Vgs,Ids\n-0.4,1.4e-11\n-0.2,3.0e-10\n0.0,2.6e-8\n0.2,1.8e-6\n0.4,3.3e-5\n0.6,1.2e-4\n0.8,2.3e-4',
                    'text/csv',
                  );
                }}
              >
                <Download size={14} /> Sample CSV
              </Button>
              <Button disabled={!importFile} type="submit">
                <Upload size={14} /> Import dataset
              </Button>
            </div>
          </form>
        </Dialog>
        <Dialog
          open={modal === 'search'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Jump to anything."
          description="Your workspace, one shortcut away."
          wide
        >
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Search workspace"
              placeholder="Search screens, actions, datasets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="command-results">
            {commands
              .filter((c) =>
                `${c.title} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.title}
                  onClick={() => {
                    setModal(null);
                    c.action();
                  }}
                >
                  <span>
                    <c.icon size={19} />
                  </span>
                  <div>
                    <strong>{c.title}</strong>
                    <small>{c.description}</small>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))}
            {!commands.some((c) =>
              `${c.title} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <div className="empty-state">
                <Search size={30} />
                <h3>No matches yet.</h3>
                <p>Try “fit”, “datasets”, or “experiment”.</p>
              </div>
            )}
          </div>
          <div className="command-footer">
            <Command size={12} /> Ctrl / ⌘ K to open <span>Tab to navigate · Enter to select</span>
          </div>
        </Dialog>
        <Dialog
          open={modal === 'chart'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Transfer characteristics"
          description="Simulated measurements and model response across four drain biases."
          wide
        >
          <CurveChart shift={shift} notify={notify} />
        </Dialog>
        <Dialog
          open={modal === 'settings'}
          onOpenChange={(v) => !v && setModal(null)}
          title="Make yourself at home."
          description="A few preferences for your workspace."
        >
          <div className="appearance-settings">
            <div>
              <strong>Appearance</strong>
              <p>Choose your workspace canvas.</p>
            </div>
            <div className="theme-options" role="group" aria-label="Appearance">
              <button
                className={theme === 'black' ? 'selected' : ''}
                aria-pressed={theme === 'black'}
                onClick={() => setTheme('black')}
              >
                <span className="theme-preview theme-preview-black">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <Moon size={14} /> True black {theme === 'black' && <Check size={14} />}
                </span>
              </button>
              <button
                className={theme === 'white' ? 'selected' : ''}
                aria-pressed={theme === 'white'}
                onClick={() => setTheme('white')}
              >
                <span className="theme-preview theme-preview-white">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <Sun size={14} /> White {theme === 'white' && <Check size={14} />}
                </span>
              </button>
            </div>
          </div>
          <label className="settings-row">
            <div>
              <strong>Project inspector</strong>
              <p>Keep device and project details in view.</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={inspector}
              onChange={(e) => setInspector(e.target.checked)}
            />
          </label>
          <label className="settings-row">
            <div>
              <strong>Reduce motion</strong>
              <p>Use quieter transitions across the workspace.</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
            />
          </label>
          <div className="shortcuts">
            <h4>Keep your hands on the keyboard.</h4>
            <span>
              Command palette <kbd>Ctrl / ⌘ K</kbd>
            </span>
            <span>
              Save workspace <kbd>Ctrl / ⌘ S</kbd>
            </span>
            <span>
              Close dialog <kbd>Esc</kbd>
            </span>
          </div>
          <div className="dialog-footer">
            <Button onClick={() => setModal(null)}>All set</Button>
          </div>
        </Dialog>
      </div>
    </MotionConfig>
  );
}
