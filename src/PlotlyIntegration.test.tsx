import { chooseOption } from './test-select';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { CurveChart } from './ScientificChart';
import type { PlotlyHTMLElement } from 'plotly.js';
import { FitWorkbench } from './FitWorkbench';
import { loadPlotly } from './plotly';
import { FIT_VIEW_KEY } from './fitViews';
import { createFigure, defaultChartView } from './plotData';
import { curvePairAt, projectCurvePair } from './curveHover';

// Use the installed renderer here; component tests use a faster Plotly mock.
vi.unmock('./plotly');
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        measureText: (text: string) => ({ width: text.length * 6 }),
      }) as unknown as CanvasRenderingContext2D,
  );
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 40, height: 12 }),
  });
});

it('resets and changes scales after native zoom in the persisted workbench', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(
    <StrictMode>
      <FitWorkbench shift={0} parameters={null} notify={vi.fn()} />
    </StrictMode>,
  );
  const graph = screen.getByRole('img', { name: /Simulated Transfer/ }) as PlotlyHTMLElement;
  await waitFor(() => expect(graph.layout?.xaxis?.range).toEqual([-0.45, 0.8]));
  const api = await loadPlotly();
  await act(async () => {
    await api.relayout(graph, { 'xaxis.range': [0.3, 0.4], 'yaxis.range': [-8, -5] });
  });
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem(FIT_VIEW_KEY)!).config.plots[0].view.xRange).toEqual([
      0.3, 0.4,
    ]),
  );
  const chart = graph.closest('.scientific-chart')!;
  await user.click(chart.querySelector<HTMLButtonElement>('[aria-label="Reset chart"]')!);
  await waitFor(() => expect(graph.layout.xaxis?.range).toEqual([-0.45, 0.8]));
  await waitFor(() => expect(graph.layout.yaxis?.range).toEqual([-11, -3]));
  await chooseOption(
    user,
    within(chart as HTMLElement).getByRole('combobox', { name: 'Chart scale' }),
    'Linear scale',
  );
  await waitFor(() => expect(graph.layout.yaxis?.range).toEqual([0, 0.0004]));
});
afterEach(cleanup);

it('projects cursor readouts against the real Plotly axes while leaving scientific traces untouched', async () => {
  render(<CurveChart kind="transfer" shift={0.025} />);
  const graph = screen.getByRole('img', { name: /Simulated Transfer/ }) as PlotlyHTMLElement & {
    emit: (name: string, event: unknown) => void;
  };
  await waitFor(() => expect(graph.layout?.yaxis?.type).toBe('log'));
  const rect = graph.querySelector<SVGRectElement>('.nsewdrag')!;
  rect.getBoundingClientRect = () => new DOMRect(100, 80, 400, 200);
  const area = graph.closest('.scientific-plot') as HTMLElement;
  area.getBoundingClientRect = () => new DOMRect(40, 30, 500, 300);
  const before = JSON.stringify({ data: graph.data, x: graph.layout.xaxis, y: graph.layout.yaxis });
  const figure = createFigure('transfer', 0.025, defaultChartView('transfer'), 'black');
  const pair = curvePairAt(figure.data, 1, 0.1, true)!;
  await act(async () =>
    graph.emit('plotly_hover', {
      points: [{ curveNumber: 1, x: pair.x, y: pair.measured }],
      event: new MouseEvent('mousemove', { clientX: 260, clientY: 180 }),
    }),
  );
  const overlay = area.querySelector('.curve-cursor-highlight');
  expect(overlay).toHaveStyle({ left: '60px', top: '50px' });
  const expected = projectCurvePair(
    pair,
    { xRange: graph.layout.xaxis!.range!, yRange: graph.layout.yaxis!.range!, logarithmic: true },
    { width: 400, height: 200 },
  );
  for (const marker of expected) {
    const position = overlay!
      .querySelector(`.cursor-marker-${marker.role}`)!
      .getAttribute('transform')!
      .match(/[-\d.]+/g)!
      .map(Number);
    expect(position[0]).toBeCloseTo(marker.x);
    expect(position[1]).toBeCloseTo(marker.y);
  }
  expect(JSON.stringify({ data: graph.data, x: graph.layout.xaxis, y: graph.layout.yaxis })).toBe(
    before,
  );
  await act(async () => graph.emit('plotly_unhover', {}));
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
});

it('renders the selected physical log-axis rectangle and focused candidate using real Plotly', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(<FitWorkbench shift={0.025} parameters={null} notify={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Try an example' }));
  const dialog = within(screen.getByRole('dialog'));
  const graph = dialog.getByRole('img', { name: /Simulated Transfer/ }) as PlotlyHTMLElement;
  await waitFor(() =>
    expect(graph.layout?.shapes?.[0]).toMatchObject({ x0: -0.15, x1: 0.25, y0: 1e-11, y1: 1e-3 }),
  );
  const path = graph.querySelector('.shapelayer path');
  expect(path?.getAttribute('d')).toMatch(/^M/);
  expect(path?.getAttribute('d')).not.toContain('NaN');
  await user.click(dialog.getByRole('button', { name: 'Investigate selection' }));
  await dialog.findByRole('button', { name: 'Run focused demo fit' }, { timeout: 2500 });
  await user.click(dialog.getByRole('button', { name: 'Run focused demo fit' }));
  await waitFor(() => expect(graph.data).toHaveLength(12), { timeout: 2500 });
  expect(graph.layout.shapes?.[0]).toMatchObject({ y0: 1e-11, y1: 1e-3 });
  await chooseOption(user, dialog.getByRole('combobox', { name: 'Chart scale' }), 'Linear scale');
  await waitFor(() => expect(graph.layout.yaxis?.type).toBe('linear'));
  expect(graph.layout.shapes?.[0]).toMatchObject({ y0: 1e-11, y1: 1e-3 });
});

it('zooms at the cursor while holding left pan, then continues panning without reverting the zoom', async () => {
  localStorage.clear();
  render(<FitWorkbench shift={0} parameters={null} notify={vi.fn()} />);
  for (const name of ['Transfer', 'Output']) {
    const graph = screen.getByRole('img', {
      name: new RegExp(`Simulated ${name}`),
    }) as PlotlyHTMLElement;
    await waitFor(() => expect(graph.layout?.xaxis?.range).toBeDefined());
    const rect = graph.querySelector<SVGRectElement>('.nsewdrag')!;
    rect.getBoundingClientRect = () => new DOMRect(100, 100, 200, 200);
    const pointer = (target: EventTarget, type: string, x: number, y: number) => {
      const event = new MouseEvent(type, {
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      act(() => {
        target.dispatchEvent(event);
      });
      return event;
    };
    expect(pointer(rect, 'pointerdown', 150, 150).defaultPrevented).toBe(true);
    // The compatibility mousedown must not create Plotly's page-covering drag overlay.
    fireEvent.mouseDown(rect, { clientX: 150, clientY: 150, button: 0, buttons: 1 });
    expect(document.querySelector('.dragcover')).toBeNull();
    pointer(document, 'pointermove', 170, 170);
    await waitFor(() =>
      expect(graph.layout.xaxis?.range?.[0]).not.toBe(name === 'Transfer' ? -0.45 : 0),
    );
    const x = [...graph.layout.xaxis!.range!] as [number, number];
    const y = [...graph.layout.yaxis!.range!] as [number, number];
    const wheel = new WheelEvent('wheel', {
      clientX: 170,
      clientY: 170,
      deltaY: -120,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(wheel);
    });
    expect(wheel.defaultPrevented).toBe(true);
    await waitFor(() =>
      expect(graph.layout.xaxis!.range![1] - graph.layout.xaxis!.range![0]).toBeLessThan(
        x[1] - x[0],
      ),
    );
    const zoomX = [...graph.layout.xaxis!.range!] as [number, number];
    const zoomY = [...graph.layout.yaxis!.range!] as [number, number];
    expect(zoomX[0] + 0.35 * (zoomX[1] - zoomX[0])).toBeCloseTo(x[0] + 0.35 * (x[1] - x[0]));
    expect(zoomY[0] + 0.65 * (zoomY[1] - zoomY[0])).toBeCloseTo(y[0] + 0.65 * (y[1] - y[0]));
    pointer(document, 'pointermove', 190, 190);
    await waitFor(() => expect(graph.layout.xaxis!.range![0]).toBeLessThan(zoomX[0]));
    expect(graph.layout.xaxis!.range![1] - graph.layout.xaxis!.range![0]).toBeCloseTo(
      zoomX[1] - zoomX[0],
    );
    expect(graph.layout.yaxis!.range![1] - graph.layout.yaxis!.range![0]).toBeCloseTo(
      zoomY[1] - zoomY[0],
    );
    const zoomOut = new WheelEvent('wheel', {
      clientX: 190,
      clientY: 190,
      deltaY: 120,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(zoomOut);
    });
    await waitFor(() =>
      expect(graph.layout.xaxis!.range![1] - graph.layout.xaxis!.range![0]).toBeCloseTo(
        x[1] - x[0],
      ),
    );
    expect(zoomOut.defaultPrevented).toBe(true);
    pointer(document, 'pointerup', 190, 190);
    const pageWheel = new WheelEvent('wheel', {
      clientX: 50,
      clientY: 50,
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(pageWheel);
    });
    expect(pageWheel.defaultPrevented).toBe(false);
    const config = JSON.parse(localStorage.getItem(FIT_VIEW_KEY)!).config;
    expect(
      config.plots.find((p: { id: string }) => p.id === name.toLowerCase()).view.xRange,
    ).toEqual(graph.layout.xaxis!.range);
    expect(
      config.plots.find((p: { id: string }) => p.id === 'capacitance').view.xRange,
    ).toBeUndefined();
  }
});

it('updates the rendered Plotly axes from the toolbar in StrictMode', async () => {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <CurveChart kind="transfer" />
    </StrictMode>,
  );
  const graph = screen.getByRole('img', { name: /Simulated Transfer/ }) as PlotlyHTMLElement;
  await waitFor(() => expect(graph.layout?.xaxis?.range).toEqual([-0.45, 0.8]));
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  await waitFor(() => expect(graph.layout.xaxis?.range?.[0]).toBeCloseTo(-0.2416666667));
  expect(graph.layout.yaxis?.range?.[0]).toBeCloseTo(-9.6666666667);
  expect(graph.layout.yaxis?.range?.[1]).toBeCloseTo(-4.3333333333);
  await user.click(screen.getByRole('button', { name: 'Zoom out' }));
  await waitFor(() => expect(graph.layout.xaxis?.range?.[0]).toBeCloseTo(-0.45));
  expect(graph.layout.yaxis?.range?.[0]).toBeCloseTo(-11);
  expect(graph.layout.yaxis?.range?.[1]).toBeCloseTo(-3);
  await chooseOption(user, screen.getByRole('combobox', { name: 'Chart scale' }), 'Linear scale');
  await waitFor(() => expect(graph.layout.yaxis?.type).toBe('linear'));
  await user.click(screen.getByRole('button', { name: 'Reset chart' }));
  await waitFor(() => expect(graph.layout.xaxis?.range).toEqual([-0.45, 0.8]));
});

it('renders toolbar changes for every plot and expands and exports the selected one', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  const notify = vi.fn();
  render(<FitWorkbench shift={0} parameters={null} notify={notify} />);
  const api = await loadPlotly();
  for (const name of ['Transfer', 'Output', 'Capacitance']) {
    const panel = within(screen.getByRole('region', { name: `${name} plot panel` }));
    const graph = panel.getByRole('img', {
      name: new RegExp(`Simulated ${name}`),
    }) as PlotlyHTMLElement;
    await waitFor(() => expect(graph.layout?.yaxis?.range).toBeDefined());
    const originalX = [...graph.layout.xaxis!.range!];
    const originalY = [...graph.layout.yaxis!.range!];
    const path = () => graph.querySelector('.scatterlayer .js-line')?.getAttribute('d');
    const originalPath = path();
    await user.click(panel.getByRole('button', { name: 'Zoom in' }));
    await waitFor(() => expect(path()).not.toBe(originalPath));
    expect(graph.layout.xaxis?.range).not.toEqual(originalX);
    expect(graph.layout.yaxis?.range).not.toEqual(originalY);
    await user.click(panel.getByRole('button', { name: 'Reset chart' }));
    await waitFor(() => expect(graph.layout.yaxis?.range).toEqual(originalY));
    expect(graph.layout.xaxis?.range).toEqual(originalX);
    await chooseOption(user, panel.getByRole('combobox', { name: 'Chart scale' }), 'Log scale');
    await waitFor(() => expect(graph.layout.yaxis?.type).toBe('log'));
    await chooseOption(user, panel.getByRole('combobox', { name: 'Chart scale' }), 'Linear scale');
    await waitFor(() => expect(graph.layout.yaxis?.type).toBe('linear'));
    await user.click(panel.getByRole('button', { name: 'Expand chart' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName(new RegExp(`${name} Characteristics`));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close dialog' }),
    );
    const download = vi.spyOn(api, 'downloadImage').mockResolvedValue('downloaded');
    await user.click(panel.getByRole('button', { name: 'Export chart' }));
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(graph, expect.objectContaining({ format: 'svg' })),
    );
    expect(notify).toHaveBeenCalledWith('Chart exported as SVG.');
    download.mockRestore();
  }
});
