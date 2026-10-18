import {
  initialDatasets,
  initialExperiments,
  initialParameters,
  tabs,
  type Dataset,
  type Experiment,
  type Tab,
} from './data';
import { exampleSavedFits, normalizeSavedFits, type SavedFit } from './savedFits';

export const PROJECTS_KEY = 'mosfit:projects';
export const ACTIVE_PROJECT_KEY = 'mosfit:active-project';
export type ProjectSnapshot = {
  project: { name: string; description: string; owner: string };
  datasets: Dataset[];
  experiments: Experiment[];
  parameters: number[];
  notes: string;
  tags: string[];
  favorite: boolean;
  savedFits?: SavedFit[];
};
export type SavedProject = {
  id: string;
  lastOpenedAt: number | null;
  lastTab: Tab;
  snapshot: ProjectSnapshot;
};

export function templateProject(name: string, description: string): ProjectSnapshot {
  return structuredClone({
    project: { name, description, owner: 'John Doe' },
    datasets: initialDatasets,
    experiments: initialExperiments,
    parameters: initialParameters.map((p) => p.value),
    notes: '',
    tags: ['GAA', '3 nm', 'BSIM-CMG'],
    favorite: false,
    savedFits: exampleSavedFits(),
  });
}

export function readProjectLibrary(): SavedProject[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((entry): entry is SavedProject => {
        const data = entry?.snapshot;
        return (
          typeof entry?.id === 'string' &&
          typeof data?.project?.name === 'string' &&
          typeof data.project.description === 'string' &&
          typeof data.project.owner === 'string' &&
          typeof data.notes === 'string' &&
          typeof data.favorite === 'boolean' &&
          Array.isArray(data.tags) &&
          data.tags.every((tag: unknown) => typeof tag === 'string') &&
          Array.isArray(data.parameters) &&
          data.parameters.length === initialParameters.length &&
          data.parameters.every(Number.isFinite) &&
          Array.isArray(data.datasets) &&
          data.datasets.every(
            (d: Dataset) =>
              typeof d?.id === 'string' && typeof d.name === 'string' && Number.isFinite(d.curves),
          ) &&
          Array.isArray(data.experiments) &&
          data.experiments.length > 0 &&
          data.experiments.every(
            (e: Experiment) => e?.status === 'Completed' && Number.isFinite(e.error),
          ) &&
          (entry.lastOpenedAt === null ||
            (typeof entry.lastOpenedAt === 'number' && Number.isFinite(entry.lastOpenedAt))) &&
          tabs.includes(entry.lastTab)
        );
      })
      .filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index)
      .map((entry) => ({
        ...entry,
        snapshot: { ...entry.snapshot, savedFits: normalizeSavedFits(entry.snapshot.savedFits) },
      }));
  } catch {
    return [];
  }
}

export function recentProjects(projects: SavedProject[]) {
  return [...projects].sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
}

export function openedLabel(timestamp: number | null) {
  if (timestamp === null) return 'Example project';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
