import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Columns2,
  Columns3,
  GripHorizontal,
  GripVertical,
  ListFilter,
  LayoutList,
  Maximize2,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { Select } from './components/ui/select';
import { CurveChart } from './Chart';
import { plotInfo, type ChartView, type PlotKind } from './plotData';
import {
  builtInPresets,
  clampHeight,
  cloneConfig,
  FIT_PRESETS_KEY,
  FIT_VIEW_KEY,
  readFitWorkspace,
  readUserPresets,
  sameConfig,
  type FitViewConfig,
  type PlotPanel,
} from './fitViews';

export function FitWorkbench({
  shift,
  parameters,
  notify,
}: {
  shift: number;
  parameters: ReactNode;
  notify: (message: string) => void;
}) {
  const [workspace, setWorkspace] = useState(readFitWorkspace);
  const { config, selectedId } = workspace;
  const [userPresets, setUserPresets] = useState(readUserPresets);
  const [dialog, setDialog] = useState<null | 'arrange' | 'save'>(null);
  const [expanded, setExpanded] = useState<PlotKind | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<PlotKind | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRoot = useRef<HTMLDivElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const resize = useRef<{ id: PlotKind; startY: number; startHeight: number } | null>(null);
  const presets = [...builtInPresets, ...userPresets];
  const selected = presets.find((p) => p.id === selectedId);
  const modified = selected ? !sameConfig(config, selected.config) : true;
  const visible = config.plots.filter((p) => p.visible);
  useEffect(() => {
    localStorage.setItem(FIT_VIEW_KEY, JSON.stringify(workspace));
  }, [workspace]);
  useEffect(() => {
    localStorage.setItem(FIT_PRESETS_KEY, JSON.stringify(userPresets));
  }, [userPresets]);
  function changeConfig(transform: (current: FitViewConfig) => FitViewConfig) {
    setWorkspace((w) => ({ ...w, config: transform(w.config) }));
  }
  useEffect(() => {
    if (!filtersOpen) return;
    filterRoot.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (!filterRoot.current?.contains(event.target as Node)) setFiltersOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
        filterTrigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [filtersOpen]);
  function patchPlot(id: PlotKind, patch: Partial<PlotPanel>) {
    changeConfig((c) => ({
      ...c,
      plots: c.plots.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }
  function togglePlot(id: PlotKind) {
    changeConfig((c) => ({
      ...c,
      plots: c.plots.map((p) =>
        p.id === id && (c.plots.filter((x) => x.visible).length > 1 || !p.visible)
          ? { ...p, visible: !p.visible }
          : p,
      ),
    }));
  }
  function movePlot(id: PlotKind, direction: -1 | 1) {
    changeConfig((c) => {
      const shown = c.plots.filter((p) => p.visible),
        position = shown.findIndex((p) => p.id === id),
        neighbor = shown[position + direction];
      if (!neighbor) return c;
      const plots = [...c.plots],
        a = plots.findIndex((p) => p.id === id),
        b = plots.findIndex((p) => p.id === neighbor.id);
      [plots[a], plots[b]] = [plots[b], plots[a]];
      return { ...c, plots };
    });
  }
  function dropPlot(target: PlotKind) {
    if (!dragging || dragging === target) {
      setDragging(null);
      return;
    }
    const source = dragging;
    changeConfig((c) => {
      const plots = [...c.plots],
        from = plots.findIndex((p) => p.id === source),
        to = plots.findIndex((p) => p.id === target);
      const [plot] = plots.splice(from, 1);
      plots.splice(to, 0, plot);
      return { ...c, plots };
    });
    setDragging(null);
  }
  function choosePreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (preset) setWorkspace({ config: cloneConfig(preset.config), selectedId: id });
  }
  function openSave() {
    setName(selectedId?.startsWith('user-') ? selected?.name || '' : 'My fit view');
    setError('');
    setDialog('save');
  }
  function savePreset(update = false) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this view a name.');
      return;
    }
    if (
      presets.some(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase() && (!update || p.id !== selectedId),
      )
    ) {
      setError('That name is already in use. Choose a different name.');
      return;
    }
    if (!update && userPresets.length >= 30) {
      setError('You have 30 saved views. Update or delete a view before saving another.');
      return;
    }
    const id =
      update && selectedId?.startsWith('user-') ? selectedId : `user-${crypto.randomUUID()}`;
    const preset = { id, name: trimmed, config: cloneConfig(config) };
    setUserPresets((p) =>
      update ? p.map((item) => (item.id === id ? preset : item)) : [...p, preset],
    );
    setWorkspace({ config, selectedId: id });
    setDialog(null);
    notify(`View “${trimmed}” ${update ? 'updated' : 'saved'}.`);
  }
  const expandedPlot = config.plots.find((p) => p.id === expanded);
  return (
    <div className="fit-workbench">
      <div className="workbench-toolbar">
        <div className="view-picker">
          <label htmlFor="fit-view-preset">View</label>
          <Select
            id="fit-view-preset"
            aria-label="View preset"
            value={selected?.id || ''}
            onValueChange={choosePreset}
            placeholder="Custom view"
            onOpenChange={(open) => {
              if (open) setFiltersOpen(false);
            }}
            groups={[
              {
                label: 'Built-in views',
                options: builtInPresets.map((p) => ({
                  value: p.id,
                  label: p.name + (p.id === selectedId && modified ? ' · modified' : ''),
                })),
              },
              ...(userPresets.length
                ? [
                    {
                      label: 'Your views',
                      options: userPresets.map((p) => ({
                        value: p.id,
                        label: p.name + (p.id === selectedId && modified ? ' · modified' : ''),
                      })),
                    },
                  ]
                : []),
            ]}
          />
          <div
            className="view-plot-filter"
            ref={filterRoot}
            onBlur={(event) => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
                setFiltersOpen(false);
            }}
          >
            <button
              className="plot-filter-trigger"
              ref={filterTrigger}
              aria-label="Plot filters"
              aria-expanded={filtersOpen}
              aria-controls={filtersOpen ? 'visible-plot-filters' : undefined}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <ListFilter size={14} />
              <span>Plots</span>
              <span className="plot-filter-count">{visible.length}/3</span>
              <ChevronDown size={12} />
            </button>
            {filtersOpen && (
              <div
                className="menu-surface plot-filter-panel"
                id="visible-plot-filters"
                role="group"
                aria-label="Visible plots"
              >
                <div className="plot-filter-heading">
                  <strong>Measurement plots</strong>
                  <span>{visible.length} of 3 shown</span>
                </div>
                <div className="plot-filter-options">
                  {config.plots.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        aria-label={`Show ${plotInfo[p.id].short} plot`}
                        checked={p.visible}
                        disabled={p.visible && visible.length === 1}
                        onChange={() => togglePlot(p.id)}
                      />
                      <span>
                        <strong>{plotInfo[p.id].short}</strong>
                        <small>
                          {p.id === 'transfer'
                            ? 'Ids–Vgs'
                            : p.id === 'output'
                              ? 'Ids–Vds'
                              : 'Cgg / Cgs / Cgd'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="plot-filter-tuning">
                  <input
                    type="checkbox"
                    checked={config.showParameters}
                    onChange={(event) =>
                      changeConfig((c) => ({ ...c, showParameters: event.target.checked }))
                    }
                  />
                  <span>Parameter tuning</span>
                </label>
                <div className="plot-filter-footer">
                  <span>At least one plot stays visible.</span>
                  <button
                    onClick={() => {
                      setFiltersOpen(false);
                      filterTrigger.current?.focus();
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className={`view-save-state ${modified ? 'is-modified' : ''}`}>
            {modified ? (
              'Modified'
            ) : (
              <>
                <Check size={11} /> Saved
              </>
            )}
          </span>
        </div>
        <div className="workbench-actions">
          <div className="layout-segment" role="group" aria-label="Plot columns">
            {(
              [
                { value: 1, icon: LayoutList },
                { value: 2, icon: Columns2 },
                { value: 3, icon: Columns3 },
              ] as const
            ).map((n) => (
              <button
                key={n.value}
                aria-label={`${n.value} ${n.value === 1 ? 'column' : 'columns'}`}
                title={`${n.value} ${n.value === 1 ? 'column' : 'columns'}`}
                aria-pressed={config.columns === n.value}
                onClick={() => changeConfig((c) => ({ ...c, columns: n.value }))}
              >
                <n.icon size={15} />
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setDialog('arrange')}>
            <Settings2 size={14} /> Configure plots
          </Button>
          <Button variant="outline" size="sm" onClick={openSave}>
            <Save size={14} /> Save view
          </Button>
        </div>
      </div>
      <div className={`fit-workbench-layout ${config.showParameters ? '' : 'without-parameters'}`}>
        <div className="plot-board">
          <div className={`plot-grid plot-columns-${config.columns}`} data-testid="plot-grid">
            {visible.map((p, index) => (
              <section
                key={p.id}
                className={`panel plot-tile ${p.fullWidth ? 'plot-full-width' : ''} ${dragging === p.id ? 'plot-dragging' : ''}`}
                aria-label={`${plotInfo[p.id].short} plot panel`}
                data-plot-id={p.id}
                onDragOver={(event) => {
                  if (dragging) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (dragging) {
                    event.preventDefault();
                    dropPlot(p.id);
                  }
                }}
              >
                <div className="plot-tile-bar">
                  <span
                    className="plot-grip"
                    draggable
                    title="Drag to reorder plot"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', p.id);
                      setDragging(p.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                  >
                    <GripVertical size={13} />
                  </span>
                  <span>
                    {String(index + 1).padStart(2, '0')} <b>/</b> {plotInfo[p.id].short}
                  </span>
                  <div>
                    <button
                      aria-label={`Move ${plotInfo[p.id].short} plot earlier`}
                      title="Move earlier"
                      disabled={index === 0}
                      onClick={() => movePlot(p.id, -1)}
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <button
                      aria-label={`Move ${plotInfo[p.id].short} plot later`}
                      title="Move later"
                      disabled={index === visible.length - 1}
                      onClick={() => movePlot(p.id, 1)}
                    >
                      <ArrowRight size={12} />
                    </button>
                    <button
                      aria-label={`Full width ${plotInfo[p.id].short} plot`}
                      title="Toggle full width"
                      aria-pressed={p.fullWidth}
                      disabled={config.columns === 1}
                      onClick={() => patchPlot(p.id, { fullWidth: !p.fullWidth })}
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      aria-label={`Hide ${plotInfo[p.id].short} plot`}
                      title="Hide plot"
                      disabled={visible.length === 1}
                      onClick={() => togglePlot(p.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <CurveChart
                  kind={p.id}
                  shift={shift}
                  view={p.view}
                  onViewChange={(view: ChartView) => patchPlot(p.id, { view })}
                  height={p.height}
                  onExpand={() => setExpanded(p.id)}
                  notify={notify}
                />
                <div
                  className="plot-resize-handle"
                  role="separator"
                  aria-label={`Resize ${plotInfo[p.id].short} plot`}
                  aria-orientation="horizontal"
                  aria-valuemin={200}
                  aria-valuemax={620}
                  aria-valuenow={p.height}
                  tabIndex={0}
                  title="Drag to resize · arrow keys adjust height"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    resize.current = { id: p.id, startY: e.clientY, startHeight: p.height };
                  }}
                  onPointerMove={(e) => {
                    const current = resize.current;
                    if (current?.id === p.id)
                      patchPlot(p.id, {
                        height: clampHeight(current.startHeight + e.clientY - current.startY),
                      });
                  }}
                  onPointerUp={() => {
                    resize.current = null;
                  }}
                  onPointerCancel={() => {
                    resize.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault();
                      patchPlot(p.id, {
                        height:
                          e.key === 'Home'
                            ? 200
                            : e.key === 'End'
                              ? 620
                              : clampHeight(p.height + (e.key === 'ArrowDown' ? 20 : -20)),
                      });
                    }
                  }}
                >
                  <GripHorizontal size={15} />
                </div>
              </section>
            ))}
          </div>
          <div className="workbench-foot">
            <span>
              <Zap size={12} /> Live model preview <b>·</b> simulated measurements
            </span>
            <span>Drag grips to reorder · drag lower edges to resize</span>
          </div>
        </div>
        {config.showParameters && <div className="workbench-parameters">{parameters}</div>}
      </div>
      <Dialog
        open={dialog === 'arrange'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Configure plots"
        description="Choose what stays in view. Your layout is saved automatically on this device."
      >
        <div className="arrange-plots">
          {config.plots.map((p) => (
            <div className="arrange-plot-row" key={p.id}>
              <label>
                <input
                  type="checkbox"
                  checked={p.visible}
                  disabled={p.visible && visible.length === 1}
                  onChange={() => togglePlot(p.id)}
                />
                <span>
                  <strong>{plotInfo[p.id].short}</strong>
                  <small>{plotInfo[p.id].title}</small>
                </span>
              </label>
              <div>
                <label>
                  Height
                  <input
                    type="number"
                    aria-label={`${plotInfo[p.id].short} plot height`}
                    min="200"
                    max="620"
                    step="10"
                    value={p.height}
                    onChange={(e) =>
                      patchPlot(p.id, { height: clampHeight(Number(e.target.value) || 200) })
                    }
                  />
                </label>
                <label className="full-width-option">
                  <input
                    type="checkbox"
                    checked={p.fullWidth}
                    disabled={config.columns === 1}
                    onChange={(e) => patchPlot(p.id, { fullWidth: e.target.checked })}
                  />{' '}
                  Full width
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="dialog-footer">
          <Button variant="ghost" onClick={() => choosePreset(selected?.id || 'characterization')}>
            <RotateCcw size={14} /> Reset view
          </Button>
          <Button onClick={() => setDialog(null)}>Done</Button>
        </div>
      </Dialog>
      <Dialog
        open={dialog === 'save'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Save view preset"
        description="Keep plot selection, order, sizes, columns, scales, visible traces, and zoom together."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            savePreset(false);
          }}
        >
          <label>
            Preset name
            <input
              required
              maxLength={48}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
          </label>
          <div className="preset-summary">
            {visible.map((p) => (
              <span className="tag" key={p.id}>
                {plotInfo[p.id].short}
              </span>
            ))}
            <span>
              {config.columns} {config.columns === 1 ? 'column' : 'columns'} ·{' '}
              {config.showParameters ? 'with' : 'without'} tuning panel
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer preset-footer">
            {selectedId?.startsWith('user-') && (
              <>
                <Button
                  variant="ghost"
                  type="button"
                  aria-label="Delete view preset"
                  onClick={() => {
                    setUserPresets((p) => p.filter((item) => item.id !== selectedId));
                    setWorkspace((w) => ({ ...w, selectedId: null }));
                    setDialog(null);
                    notify('View preset deleted. Your current layout is still here.');
                  }}
                >
                  <Trash2 size={14} />
                </Button>
                <Button variant="outline" type="button" onClick={() => savePreset(true)}>
                  Update preset
                </Button>
              </>
            )}
            <Button type="submit">
              <Save size={14} /> Save as new
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={expanded !== null}
        onOpenChange={(open) => !open && setExpanded(null)}
        title={expanded ? plotInfo[expanded].title : 'Plot'}
        description="Inspect simulated measurements and the live model. View changes also update the workbench plot."
        fullscreen
      >
        {expandedPlot && (
          <CurveChart
            kind={expandedPlot.id}
            shift={shift}
            view={expandedPlot.view}
            onViewChange={(view) => patchPlot(expandedPlot.id, { view })}
            fill
            notify={notify}
          />
        )}
      </Dialog>
    </div>
  );
}
