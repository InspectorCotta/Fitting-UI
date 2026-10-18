import {
  ArrowRight,
  Clock3,
  Database,
  FlaskConical,
  FolderOpen,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  FileCode2,
} from 'lucide-react';
import { Button } from './components/ui/button';
import { openedLabel, recentProjects, type SavedProject } from './projectLibrary';
import type { Tab } from './data';
import type { Workspace } from './Sidebar';

export function HomePage({
  projects,
  activeId,
  onOpenProject,
  onNewProject,
  onBrowse,
  onNavigate,
  onSearch,
}: {
  projects: SavedProject[];
  activeId: string;
  onOpenProject: (id: string, tab?: Tab) => void;
  onNewProject: () => void;
  onBrowse: () => void;
  onNavigate: (workspace: Workspace) => void;
  onSearch: () => void;
}) {
  const ordered = recentProjects(projects);
  const [latest, ...others] = ordered;
  const active = projects.find((p) => p.id === activeId) || latest;
  const datasets = projects.reduce((count, p) => count + p.snapshot.datasets.length, 0);
  const experiments = projects.reduce((count, p) => count + p.snapshot.experiments.length, 0);
  return (
    <div className="studio-home">
      <header className="home-heading">
        <div>
          <span className="eyebrow">LOCAL WORKSPACE</span>
          <h1>
            MOSFit Studio<span className="home-beta">BETA</span>
          </h1>
          <p>Fit compact models, inspect measurements, and compare experiments.</p>
        </div>
        <Button onClick={onNewProject}>
          <Plus size={15} /> New project
        </Button>
      </header>

      <div className="home-columns">
        <section className="home-recents" aria-labelledby="recent-projects-heading">
          <div className="home-section-heading">
            <div>
              <h2 id="recent-projects-heading">Recently opened</h2>
              <p>Continue where you left off.</p>
            </div>
            <button className="link-button" onClick={onBrowse}>
              All projects <ArrowRight size={13} />
            </button>
          </div>
          {latest && (
            <button
              className="home-featured-project"
              aria-label={`Open ${latest.snapshot.project.name}`}
              onClick={() => onOpenProject(latest.id)}
            >
              <div className="home-project-copy">
                <span className="home-project-time">
                  <Clock3 size={12} />
                  {openedLabel(latest.lastOpenedAt)}
                </span>
                <h3>{latest.snapshot.project.name}</h3>
                <p>{latest.snapshot.project.description}</p>
                <div className="home-project-tags">
                  <span>GAA nanosheet</span>
                  <span>BSIM-CMG</span>
                </div>
                <span className="home-resume">
                  {latest.lastOpenedAt
                    ? `Resume ${latest.lastTab === 'Overview' ? 'project' : latest.lastTab.toLowerCase()}`
                    : 'Explore demo project'}
                  <ArrowRight size={16} />
                </span>
              </div>
              <div className="home-device-preview">
                <img src="/device.svg" alt="GAA nanosheet device cross-section" />
                <span>GATE-ALL-AROUND · 3 nm</span>
              </div>
            </button>
          )}
          <div className="home-recent-list">
            {others.slice(0, 5).map((p) => (
              <button
                key={p.id}
                aria-label={`Open ${p.snapshot.project.name}`}
                onClick={() => onOpenProject(p.id)}
              >
                <span className="home-folder">
                  <FolderOpen size={18} />
                </span>
                <span>
                  <strong>{p.snapshot.project.name}</strong>
                  <small>
                    {p.snapshot.datasets.length} datasets · {p.snapshot.experiments.length}{' '}
                    experiments
                  </small>
                </span>
                <time
                  dateTime={p.lastOpenedAt ? new Date(p.lastOpenedAt).toISOString() : undefined}
                >
                  {openedLabel(p.lastOpenedAt)}
                </time>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          <div className="home-storage-note">
            <ShieldCheck size={13} />
            <span>Projects, parameters, and notes are saved in this browser.</span>
          </div>
        </section>

        <aside className="home-tool-overview" aria-label="Tool overview">
          <div className="home-section-heading">
            <div>
              <h2>Inside the studio</h2>
              <p>From measurements to a fitted model.</p>
            </div>
          </div>
          <div className="home-workflow">
            <button onClick={() => onNavigate('datasets')}>
              <span className="home-workflow-icon">
                <Database size={19} />
              </span>
              <span>
                <strong>Measurement library</strong>
                <small>Import and inspect DC and capacitance datasets.</small>
              </span>
              <ArrowRight size={14} />
            </button>
            <button onClick={() => active && onOpenProject(active.id, 'Model Fit')}>
              <span className="home-workflow-icon">
                <SlidersHorizontal size={19} />
              </span>
              <span>
                <strong>Model workbench</strong>
                <small>Tune parameters with linked plots and saved views.</small>
              </span>
              <ArrowRight size={14} />
            </button>
            <button onClick={() => onNavigate('experiments')}>
              <span className="home-workflow-icon">
                <FlaskConical size={19} />
              </span>
              <span>
                <strong>Experiments & results</strong>
                <small>Run extractions and compare fit quality.</small>
              </span>
              <ArrowRight size={14} />
            </button>
            <button onClick={() => active && onOpenProject(active.id, 'SPICE Export')}>
              <span className="home-workflow-icon">
                <FileCode2 size={19} />
              </span>
              <span>
                <strong>SPICE export</strong>
                <small>Inspect the library and compare exported curves with measurements.</small>
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
          <dl className="home-library-summary">
            <div>
              <dt>Projects</dt>
              <dd>{projects.length}</dd>
            </div>
            <div>
              <dt>Datasets</dt>
              <dd>{datasets}</dd>
            </div>
            <div>
              <dt>Experiments</dt>
              <dd>{experiments}</dd>
            </div>
          </dl>
          <p className="home-demo-note">
            <i className="tiny-dot" />
            Interactive demo · simulated measurements
          </p>
        </aside>
      </div>

      <footer className="home-footer">
        <button onClick={onSearch}>
          <Search size={14} />
          <span>Find a screen or action</span>
          <kbd>Ctrl K</kbd>
        </button>
        <span>BSIM-CMG · Local fitting workspace</span>
      </footer>
    </div>
  );
}
