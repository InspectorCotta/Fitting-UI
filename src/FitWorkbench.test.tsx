import { chooseOption } from './test-select';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FitWorkbench } from './FitWorkbench';
import { FIT_PRESETS_KEY, FIT_VIEW_KEY, normalizeConfig } from './fitViews';
import { createFigure, defaultChartView, plotKinds, sampleCurve } from './plotData';
import { loadPlotly } from './plotly';
import { plotConfig } from './PlotlySurface';
import { curvePairAt, formatCurveValue } from './curveHover';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const notify = vi.fn();
function mount() {
  return render(
    <FitWorkbench
      shift={0.025}
      parameters={<section>Parameter controls</section>}
      notify={notify}
    />,
  );
}
const stored = () => JSON.parse(localStorage.getItem(FIT_VIEW_KEY)!).config;
describe('configurable Plotly workbench', () => {
  it('shows only the nearest measured/model pair in a cursor tooltip without reserving space', async () => {
    mount();
    const output = within(screen.getByRole('region', { name: 'Output plot panel' }));
    await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
    expect(plotConfig.displayModeBar).toBe(false);
    expect(plotConfig.showLink).toBe(false);
    const figure = createFigure('output', 0, defaultChartView('output'), 'white');
    expect(figure.layout.hovermode).toBe('closest');
    expect(figure.data.every((trace) => 'hoverinfo' in trace && trace.hoverinfo === 'none')).toBe(
      true,
    );
    const canvas = output.getByRole('img', { name: /Simulated Output/ });
    expect(output.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByText('Hover a curve to inspect values')).not.toBeInTheDocument();
    act(() =>
      canvas.dispatchEvent(
        new CustomEvent('test-plotly_hover', {
          detail: {
            points: [{ curveNumber: 1, x: 0.35, y: 0.867 }],
            event: new MouseEvent('mousemove', { clientX: 100, clientY: 80 }),
          },
        }),
      ),
    );
    const tooltip = output.getByRole('tooltip', { name: 'Output cursor values' });
    expect(tooltip).toHaveTextContent('Vgs = 0.7 V');
    expect(tooltip).not.toHaveTextContent('Vgs = 0.6 V');
    expect(tooltip).toHaveTextContent('Measured');
    expect(tooltip).toHaveTextContent('Model');
    expect(tooltip).toHaveTextContent('0.350 V');
    const expected = curvePairAt(
      createFigure('output', 0.025, defaultChartView('output'), 'white').data,
      1,
      0.35,
      false,
    )!;
    expect(tooltip).toHaveTextContent(`${formatCurveValue(expected.measured)} mA/µm`);
    expect(tooltip).toHaveTextContent(`${formatCurveValue(expected.model)} mA/µm`);
    fireEvent.mouseMove(canvas, { clientX: 80, clientY: 90 });
    expect(tooltip.style.left).toBe('92px');
    act(() => canvas.dispatchEvent(new CustomEvent('test-plotly_unhover')));
    expect(output.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pan tool' })).not.toBeInTheDocument();
    expect(figure.layout.dragmode).toBe('pan');
  });
  it('keeps plot filters collapsed beside View and supports multiple selections and keyboard dismissal', async () => {
    const user = userEvent.setup();
    mount();
    const trigger = screen.getByRole('button', { name: 'Plot filters' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Visible plots' })).not.toBeInTheDocument();
    expect(document.querySelector('.plot-selection-bar')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('checkbox', { name: 'Show Transfer plot' })).toHaveFocus();
    await user.click(screen.getByRole('checkbox', { name: 'Show Output plot' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show Capacitance plot' }));
    expect(screen.getByRole('checkbox', { name: 'Show Transfer plot' })).toBeDisabled();
    expect(trigger).toHaveTextContent('1/3');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(screen.getByRole('checkbox', { name: 'Show Output plot' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '2 columns' }));
    expect(screen.queryByRole('group', { name: 'Visible plots' })).not.toBeInTheDocument();
  });
  it('shows transfer, output and capacitance plots, with distinct axes and responsive traces', async () => {
    mount();
    for (const name of ['Transfer', 'Output', 'Capacitance'])
      expect(screen.getByRole('region', { name: `${name} plot panel` })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
    const output = createFigure('output', 0, defaultChartView('output'), 'white');
    expect(output.layout.xaxis?.range).toEqual([0, 0.8]);
    expect(output.layout.xaxis?.title).toMatchObject({ text: 'Vds [V]' });
    expect(output.layout.yaxis?.type).toBe('linear');
    const caps = createFigure('capacitance', 0, defaultChartView('capacitance'), 'black');
    expect(caps.data).toHaveLength(6);
    expect(caps.layout.yaxis?.title).toMatchObject({ text: 'C [fF/µm]' });
    for (const kind of plotKinds)
      expect(sampleCurve(kind, 0.4, 0, 0.05)).not.toBe(sampleCurve(kind, 0.4, 0, 0));
    expect(sampleCurve('output', 0, 0)).toBe(0);
    expect(sampleCurve('output', 0.7, 0)).toBeGreaterThan(sampleCurve('output', 0.1, 0));
    expect(sampleCurve('capacitance', 0.3, 0)).toBeCloseTo(
      sampleCurve('capacitance', 0.3, 1) + sampleCurve('capacitance', 0.3, 2),
    );
  });
  it('persists columns, visibility, order, sizes and tuning-panel visibility', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: '2 columns' }));
    await user.click(screen.getByRole('button', { name: 'Plot filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Show Output plot' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('region', { name: 'Output plot panel' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move Capacitance plot earlier' }));
    expect(screen.getAllByRole('region', { name: /plot panel$/ })[0]).toHaveAccessibleName(
      'Capacitance plot panel',
    );
    await user.click(screen.getByRole('button', { name: 'Full width Capacitance plot' }));
    const grip = screen.getByRole('separator', { name: 'Resize Capacitance plot' });
    grip.focus();
    await user.keyboard('{ArrowDown}');
    expect(grip).toHaveAttribute('aria-valuenow', '275');
    await user.click(screen.getByRole('button', { name: 'Plot filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Parameter tuning' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Parameter controls')).not.toBeInTheDocument();
    cleanup();
    mount();
    expect(screen.getByRole('button', { name: '2 columns' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('region', { name: 'Output plot panel' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Capacitance plot panel' })).toHaveClass(
      'plot-full-width',
    );
    expect(screen.getByRole('separator', { name: 'Resize Capacitance plot' })).toHaveAttribute(
      'aria-valuenow',
      '275',
    );
    expect(stored().plots[0].id).toBe('capacitance');
  });
  it('saves, restores, updates and deletes named view presets including trace and zoom settings', async () => {
    const user = userEvent.setup();
    mount();
    const output = within(screen.getByRole('region', { name: 'Output plot panel' }));
    await chooseOption(user, output.getByRole('combobox', { name: 'Chart scale' }), 'Log scale');
    await user.click(output.getByRole('button', { name: 'Vgs = 0.4 V' }));
    await user.click(output.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Save view' }));
    await user.clear(screen.getByLabelText('Preset name'));
    await user.type(screen.getByLabelText('Preset name'), 'DC and caps review');
    await user.click(screen.getByRole('button', { name: 'Save as new' }));
    const saved = JSON.parse(localStorage.getItem(FIT_PRESETS_KEY)!)[0];
    expect(saved.config.plots.find((p: { id: string }) => p.id === 'output').view).toMatchObject({
      scale: 'log',
      hidden: [3],
      xRange: expect.any(Array),
    });
    await chooseOption(
      user,
      screen.getByRole('combobox', { name: 'View preset' }),
      'Transfer detail',
    );
    expect(screen.queryByRole('region', { name: 'Output plot panel' })).not.toBeInTheDocument();
    await chooseOption(
      user,
      screen.getByRole('combobox', { name: 'View preset' }),
      'DC and caps review',
    );
    expect(
      within(screen.getByRole('region', { name: 'Output plot panel' })).getByRole('combobox', {
        name: 'Chart scale',
      }),
    ).toHaveTextContent('Log scale');
    await user.click(screen.getByRole('button', { name: '1 column' }));
    await user.click(screen.getByRole('button', { name: 'Save view' }));
    await user.click(screen.getByRole('button', { name: 'Update preset' }));
    expect(JSON.parse(localStorage.getItem(FIT_PRESETS_KEY)!)[0].config.columns).toBe(1);
    cleanup();
    mount();
    expect(screen.getByRole('combobox', { name: 'View preset' })).toHaveTextContent(
      'DC and caps review',
    );
    await user.click(screen.getByRole('button', { name: 'Save view' }));
    await user.click(screen.getByRole('button', { name: 'Delete view preset' }));
    expect(JSON.parse(localStorage.getItem(FIT_PRESETS_KEY)!)).toEqual([]);
    expect(screen.getByRole('region', { name: 'Output plot panel' })).toBeInTheDocument();
    cleanup();
    mount();
    expect(screen.getByRole('combobox', { name: 'View preset' })).toHaveTextContent('Custom view');
  });
  it('captures native Plotly pan and zoom ranges and expands the chosen plot', async () => {
    const user = userEvent.setup();
    mount();
    const caps = within(screen.getByRole('region', { name: 'Capacitance plot panel' }));
    await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
    const canvas = caps.getByRole('img', { name: /Simulated Capacitance/ });
    act(() =>
      canvas.dispatchEvent(
        new CustomEvent('test-plotly_relayout', {
          detail: {
            'xaxis.range[0]': -0.1,
            'xaxis.range[1]': 0.5,
            'yaxis.range[0]': 0.2,
            'yaxis.range[1]': 1.3,
            dragmode: 'pan',
          },
        }),
      ),
    );
    expect(stored().plots.find((p: { id: string }) => p.id === 'capacitance').view).toMatchObject({
      xRange: [-0.1, 0.5],
      yRange: [0.2, 1.3],
    });
    expect(
      stored().plots.find((p: { id: string }) => p.id === 'transfer').view.xRange,
    ).toBeUndefined();
    expect(
      stored().plots.find((p: { id: string }) => p.id === 'output').view.xRange,
    ).toBeUndefined();
    await user.click(caps.getByRole('button', { name: 'Expand chart' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Capacitance Characteristics (C–V)');
    const expanded = within(screen.getByRole('dialog'));
    await user.click(expanded.getByRole('button', { name: 'Cgd' }));
    await user.click(expanded.getByRole('button', { name: 'Close dialog' }));
    expect(caps.getByRole('button', { name: 'Cgd' })).toHaveAttribute('aria-pressed', 'false');
    const api = await loadPlotly();
    expect(api.react).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining({ scrollZoom: true }),
    );
  });
  it('right-drags a zoom box only on the selected plot while preserving left-button pan and wheel zoom', async () => {
    mount();
    await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
    const output = screen.getByRole('region', { name: 'Output plot panel' });
    const canvas = within(output).getByRole('img', { name: /Simulated Output/ });
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'nsewdrag');
    rect.getBoundingClientRect = () => new DOMRect(100, 100, 200, 200);
    canvas.append(rect);
    const pointer = (target: EventTarget, type: string, x: number, y: number, button = 2) => {
      const event = new MouseEvent(type, {
        clientX: x,
        clientY: y,
        button,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      act(() => target.dispatchEvent(event));
      return event;
    };
    for (const button of [3, 4])
      expect(pointer(rect, 'pointerdown', 150, 150, button).defaultPrevented).toBe(false);
    expect(pointer(rect, 'pointerdown', 150, 150).defaultPrevented).toBe(true);
    pointer(document, 'pointermove', 250, 250);
    expect(output.querySelector('.plot-right-zoom-box')).toHaveStyle({
      width: '100px',
      height: '100px',
    });
    pointer(document, 'pointerup', 250, 250);
    expect(output.querySelector('.plot-right-zoom-box')).not.toBeInTheDocument();
    const view = stored().plots.find((p: { id: string }) => p.id === 'output').view;
    expect(view.xRange[0]).toBeCloseTo(0.2);
    expect(view.xRange[1]).toBeCloseTo(0.6);
    expect(view.yRange).toEqual([0.25, 0.75]);
    expect(
      stored().plots.find((p: { id: string }) => p.id === 'transfer').view.xRange,
    ).toBeUndefined();
    expect(plotConfig.scrollZoom).toBe(true);
    expect(createFigure('output', 0, view, 'black').layout.dragmode).toBe('pan');
    const saved = stored();
    pointer(rect, 'pointerdown', 150, 150);
    pointer(document, 'pointerup', 152, 151);
    expect(stored()).toEqual(saved);
    pointer(rect, 'pointerdown', 150, 150);
    pointer(document, 'pointermove', 260, 260);
    fireEvent.keyDown(document, { key: 'Escape' });
    pointer(document, 'pointerup', 260, 260);
    expect(output.querySelector('.plot-right-zoom-box')).not.toBeInTheDocument();
    expect(stored()).toEqual(saved);
    expect(fireEvent.contextMenu(rect, { clientX: 150, clientY: 150 })).toBe(false);
    expect(fireEvent.contextMenu(canvas, { clientX: 50, clientY: 50 })).toBe(true);
  });
  it('ignores saved drag modes while preserving plot ranges and layout', () => {
    const config = normalizeConfig({
      columns: 2,
      plots: [
        {
          id: 'output',
          height: 300,
          view: { dragMode: 'zoom', xRange: [0.1, 0.6], yRange: [0.2, 0.8] },
        },
      ],
    });
    expect(config.columns).toBe(2);
    expect(config.plots[0].height).toBe(300);
    expect(config.plots[0].view).toMatchObject({ xRange: [0.1, 0.6], yRange: [0.2, 0.8] });
    expect(createFigure('output', 0, config.plots[0].view, 'black').layout.dragmode).toBe('pan');
  });
  it('validates preset names and recovers malformed layouts', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Save view' }));
    fireEvent.change(screen.getByLabelText('Preset name'), { target: { value: 'DC comparison' } });
    await user.click(screen.getByRole('button', { name: 'Save as new' }));
    expect(screen.getByRole('alert')).toHaveTextContent('already in use');
    const config = normalizeConfig({
      columns: 99,
      plots: [
        {
          id: 'output',
          visible: false,
          height: -100,
          view: { scale: 'bogus', hidden: [99], xRange: [5, 1] },
        },
      ],
    });
    expect(config.columns).toBe(3);
    expect(config.plots).toHaveLength(3);
    expect(config.plots[0].height).toBe(200);
    expect(config.plots[0].view.hidden).toEqual([]);
    expect(config.plots[0].view.xRange).toBeUndefined();
    expect(config.plots.some((p) => p.visible)).toBe(true);
  });
});
