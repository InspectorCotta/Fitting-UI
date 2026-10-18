import { defaultChartView, plotKinds, type ChartView, type PlotKind } from './plotData';

export type PlotPanel = {
  id: PlotKind;
  visible: boolean;
  fullWidth: boolean;
  height: number;
  view: ChartView;
};
export type FitViewConfig = { columns: 1 | 2 | 3; showParameters: boolean; plots: PlotPanel[] };
export type ViewPreset = { id: string; name: string; config: FitViewConfig };
export const FIT_VIEW_KEY = 'mosfit:fit-view';
export const FIT_PRESETS_KEY = 'mosfit:fit-presets';
export const builtInPresets: ViewPreset[] = [
  {
    id: 'characterization',
    name: 'Full characterization',
    config: {
      columns: 3,
      showParameters: true,
      plots: plotKinds.map((id) => ({
        id,
        visible: true,
        fullWidth: false,
        height: 255,
        view: defaultChartView(id),
      })),
    },
  },
  {
    id: 'dc-comparison',
    name: 'DC comparison',
    config: {
      columns: 2,
      showParameters: true,
      plots: plotKinds.map((id) => ({
        id,
        visible: id !== 'capacitance',
        fullWidth: false,
        height: 310,
        view: defaultChartView(id),
      })),
    },
  },
  {
    id: 'transfer-detail',
    name: 'Transfer detail',
    config: {
      columns: 1,
      showParameters: true,
      plots: plotKinds.map((id) => ({
        id,
        visible: id === 'transfer',
        fullWidth: false,
        height: 370,
        view: defaultChartView(id),
      })),
    },
  },
];
export const cloneConfig = (config: FitViewConfig): FitViewConfig => structuredClone(config);
export const sameConfig = (a: FitViewConfig, b: FitViewConfig) =>
  JSON.stringify(a) === JSON.stringify(b);
export const clampHeight = (height: number) => Math.max(200, Math.min(620, Math.round(height)));

function isRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(Number.isFinite) &&
    value[0] < value[1]
  );
}
/** Read only supported settings so an older or malformed saved view can recover. */
export function normalizeConfig(value: unknown): FitViewConfig {
  if (!value || typeof value !== 'object') return cloneConfig(builtInPresets[0].config);
  const raw = value as Partial<FitViewConfig>;
  const ordered = Array.isArray(raw.plots)
    ? raw.plots.filter((p) => p && plotKinds.includes(p.id))
    : [];
  const plots = [...new Set([...ordered.map((p) => p.id), ...plotKinds])].map((id) => {
    const item = ordered.find((p) => p.id === id);
    const view = item?.view;
    return {
      id,
      visible: item ? item.visible !== false : true,
      fullWidth: item?.fullWidth === true,
      height:
        typeof item?.height === 'number' && Number.isFinite(item.height)
          ? clampHeight(item.height)
          : 255,
      view: {
        scale:
          view?.scale === 'linear' || view?.scale === 'log'
            ? view.scale
            : defaultChartView(id).scale,
        hidden: Array.isArray(view?.hidden)
          ? [
              ...new Set(
                view.hidden.filter(
                  (n) => Number.isInteger(n) && n >= 0 && n < (id === 'capacitance' ? 3 : 4),
                ),
              ),
            ]
          : [],
        ...(isRange(view?.xRange) ? { xRange: view.xRange } : {}),
        ...(isRange(view?.yRange) ? { yRange: view.yRange } : {}),
      },
    } satisfies PlotPanel;
  });
  if (!plots.some((p) => p.visible)) plots[0].visible = true;
  return {
    columns: raw.columns === 1 || raw.columns === 2 ? raw.columns : 3,
    showParameters: raw.showParameters !== false,
    plots,
  };
}
export function readFitWorkspace(): { config: FitViewConfig; selectedId: string | null } {
  try {
    const value = JSON.parse(localStorage.getItem(FIT_VIEW_KEY) || 'null');
    return {
      config: normalizeConfig(value?.config),
      selectedId:
        value?.selectedId === null
          ? null
          : typeof value?.selectedId === 'string'
            ? value.selectedId
            : 'characterization',
    };
  } catch {
    return { config: cloneConfig(builtInPresets[0].config), selectedId: 'characterization' };
  }
}
export function readUserPresets(): ViewPreset[] {
  try {
    const saved = JSON.parse(localStorage.getItem(FIT_PRESETS_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (p) =>
          typeof p?.id === 'string' &&
          p.id.startsWith('user-') &&
          typeof p.name === 'string' &&
          p.name.trim(),
      )
      .slice(0, 30)
      .map((p) => ({
        id: p.id,
        name: p.name.trim().slice(0, 48),
        config: normalizeConfig(p.config),
      }));
  } catch {
    return [];
  }
}
