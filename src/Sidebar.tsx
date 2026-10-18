import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Box,
  Check,
  ChevronRight,
  Cpu,
  Database,
  Download,
  FlaskConical,
  FolderOpen,
  Home,
  Moon,
  Search,
  Settings2,
  Sun,
} from 'lucide-react';
import type { Experiment } from './data';
import { MosfetMark } from './components/MosfetMark';

export type Workspace =
  | 'home'
  | 'project'
  | 'projects'
  | 'datasets'
  | 'experiments'
  | 'models'
  | 'compute';
export type Theme = 'black' | 'white';

const destinations = [
  { name: 'Projects', icon: FolderOpen, id: 'projects' },
  { name: 'Datasets', icon: Database, id: 'datasets' },
  { name: 'Experiments', icon: FlaskConical, id: 'experiments' },
  { name: 'Models', icon: Box, id: 'models' },
  { name: 'Compute', icon: Cpu, id: 'compute' },
] as const;

export function Sidebar({
  workspace,
  theme,
  onNavigate,
  onSearch,
  onPreferences,
  onThemeChange,
  onExport,
  latestExperiment,
}: {
  workspace: Workspace;
  theme: Theme;
  onNavigate: (workspace: Workspace) => void;
  onSearch: () => void;
  onPreferences: () => void;
  onThemeChange: (theme: Theme) => void;
  onExport: () => void;
  latestExperiment: Experiment;
}) {
  const [menu, setMenu] = useState<null | 'notifications' | 'profile'>(null);
  const [readExperiment, setReadExperiment] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => setMenu(null), [workspace]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  function navigate(destination: Workspace) {
    setMenu(null);
    onNavigate(destination);
  }
  return (
    <aside className="sidebar" aria-label="Workspace sidebar" ref={root}>
      <button
        className="sidebar-brand"
        onClick={() => navigate('home')}
        aria-label="MOSFit Studio home"
        title="MOSFit Studio · Beta"
      >
        <MosfetMark />
      </button>
      <button
        className="sidebar-button sidebar-search"
        aria-label="Search workspace"
        title="Search workspace (Ctrl / ⌘ K)"
        onClick={() => {
          setMenu(null);
          onSearch();
        }}
      >
        <Search size={19} />
        <span className="sidebar-tooltip">
          Search <kbd>Ctrl K</kbd>
        </span>
      </button>
      <div className="sidebar-divider" />
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        <button
          className={`sidebar-button ${workspace === 'home' ? 'active' : ''}`}
          aria-label="Home"
          aria-current={workspace === 'home' ? 'page' : undefined}
          title="Home"
          onClick={() => navigate('home')}
        >
          <Home size={20} />
          <span className="sidebar-tooltip">Home</span>
        </button>
        {destinations.map((n) => (
          <button
            key={n.id}
            className={`sidebar-button ${workspace === n.id || (n.id === 'projects' && workspace === 'project') ? 'active' : ''}`}
            aria-label={n.name}
            aria-current={workspace === n.id ? 'page' : undefined}
            title={n.name}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={20} />
            <span className="sidebar-tooltip">{n.name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <div className="dropdown-anchor">
          <button
            className="sidebar-button"
            aria-label="Notifications"
            title="Notifications"
            aria-expanded={menu === 'notifications'}
            aria-controls={menu === 'notifications' ? 'sidebar-notifications' : undefined}
            onClick={() => setMenu(menu === 'notifications' ? null : 'notifications')}
          >
            <Bell size={19} />
            {readExperiment !== latestExperiment.id && <i className="notification-dot" />}
            <span className="sidebar-tooltip">Notifications</span>
          </button>
          {menu === 'notifications' && (
            <div className="dropdown notification-menu sidebar-popover" id="sidebar-notifications">
              <div className="dropdown-title">
                <strong>Activity</strong>
                <button
                  className="link-button"
                  onClick={() => setReadExperiment(latestExperiment.id)}
                >
                  Mark read
                </button>
              </div>
              <button
                onClick={() => {
                  setReadExperiment(latestExperiment.id);
                  navigate('experiments');
                }}
              >
                <span className="notification-check">
                  <Check size={16} />
                </span>
                <span>
                  <strong>Your fit has converged</strong>
                  <small>
                    {latestExperiment.id} finished with {latestExperiment.error.toFixed(1)}% RMS
                    error.
                  </small>
                  <em>{latestExperiment.date}</em>
                </span>
              </button>
              <div className="notification-footer">A quiet lab is a happy lab.</div>
            </div>
          )}
        </div>
        <button
          className="sidebar-button"
          title="Preferences"
          aria-label="Preferences"
          onClick={() => {
            setMenu(null);
            onPreferences();
          }}
        >
          <Settings2 size={19} />
          <span className="sidebar-tooltip">Preferences</span>
        </button>
        <button
          className="sidebar-button"
          aria-label={theme === 'black' ? 'Switch to white mode' : 'Switch to black mode'}
          title={theme === 'black' ? 'Switch to white mode' : 'Switch to black mode'}
          onClick={() => onThemeChange(theme === 'black' ? 'white' : 'black')}
        >
          {theme === 'black' ? <Sun size={19} /> : <Moon size={19} />}
          <span className="sidebar-tooltip">{theme === 'black' ? 'White mode' : 'Black mode'}</span>
        </button>
        <div className="dropdown-anchor">
          <button
            className="sidebar-button sidebar-profile"
            aria-label="John Doe account"
            title="John Doe · account"
            aria-expanded={menu === 'profile'}
            aria-controls={menu === 'profile' ? 'sidebar-account' : undefined}
            onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
          >
            <span className="avatar avatar-main">JD</span>
            <span className="sidebar-tooltip">John Doe</span>
          </button>
          {menu === 'profile' && (
            <div className="dropdown profile-menu sidebar-popover" id="sidebar-account">
              <strong>John Doe</strong>
              <small>Modeling team · local workspace</small>
              <button
                onClick={() => {
                  setMenu(null);
                  onPreferences();
                }}
              >
                <Settings2 size={15} /> Preferences <ChevronRight size={12} />
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  onExport();
                }}
              >
                <Download size={15} /> Export workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
