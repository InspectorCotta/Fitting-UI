import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { CurveChart } from './ScientificChart';
import { plotInfo } from './plotData';
import { loadPlotly } from './plotly';

afterEach(cleanup);
const samples = plotInfo.output.series.map((name) => ({
  name,
  x: [0, 0.8],
  measured: [0.2, 0.6],
  modelX: [0, 0.8],
  modelY: [0.3, 0.7],
}));

async function setup(comparison = false) {
  const result = render(
    <CurveChart
      kind="output"
      samples={samples}
      comparison={
        comparison
          ? { label: 'Candidate', samples: samples.map((s) => ({ ...s, modelY: [0.4, 0.8] })) }
          : undefined
      }
    />,
  );
  await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
  const graph = screen.getByRole('img', { name: /Simulated Output/ });
  const area = graph.closest('.scientific-plot') as HTMLElement;
  area.getBoundingClientRect = () => new DOMRect(40, 30, 500, 300);
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('class', 'nsewdrag');
  rect.getBoundingClientRect = () => new DOMRect(100, 80, 400, 200);
  graph.append(rect);
  function hover(x = 0.4, curveNumber = 1) {
    act(() =>
      graph.dispatchEvent(
        new CustomEvent('test-plotly_hover', {
          detail: {
            points: [{ curveNumber, x, y: 0.4 }],
            event: new MouseEvent('mousemove', { clientX: 300, clientY: 180 }),
          },
        }),
      ),
    );
  }
  return { ...result, graph, area, rect, hover };
}

function coords(element: Element | null) {
  return element
    ?.getAttribute('transform')
    ?.match(/[-\d.]+/g)
    ?.map(Number);
}

it('highlights the exact tooltip pair without redrawing data, and clears on unhover/leave', async () => {
  const { graph, area, hover } = await setup();
  const api = await loadPlotly();
  const renders = vi.mocked(api.react).mock.calls.length;
  hover();
  const overlay = area.querySelector('.curve-cursor-highlight');
  expect(overlay).toHaveAttribute('aria-hidden', 'true');
  expect(overlay).toHaveStyle({ left: '60px', top: '50px' });
  const model = coords(overlay!.querySelector('.cursor-marker-model'))!;
  const measured = coords(overlay!.querySelector('.cursor-marker-measured'))!;
  expect(model[0]).toBeCloseTo(200);
  expect(model[1]).toBeCloseTo(100);
  expect(measured[1]).toBeCloseTo(120);
  expect(screen.getByRole('tooltip')).toHaveTextContent('0.4 mA/µm');
  expect(screen.getByRole('tooltip')).toHaveTextContent('0.5 mA/µm');
  hover(0.2);
  const next = coords(area.querySelector('.cursor-marker-model'))!;
  expect(next[0]).toBeCloseTo(100);
  expect(next[1]).toBeCloseTo(120);
  expect(vi.mocked(api.react).mock.calls.length).toBe(renders);
  act(() => graph.dispatchEvent(new CustomEvent('test-plotly_unhover')));
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
  hover();
  fireEvent.mouseLeave(area);
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
});

it('marks the comparison candidate and reprojects after rendered plot bounds change', async () => {
  const { area, rect, hover } = await setup(true);
  hover(0.4, 8);
  expect(coords(area.querySelector('.cursor-marker-candidate'))![1]).toBeCloseTo(80);
  rect.getBoundingClientRect = () => new DOMRect(100, 80, 600, 300);
  await act(async () => {
    rect.setAttribute('width', '600');
  });
  await waitFor(() =>
    expect(coords(area.querySelector('.cursor-marker-model'))![0]).toBeCloseTo(300),
  );
  expect(coords(area.querySelector('.cursor-marker-candidate'))![1]).toBeCloseTo(120);
});

it('removes cursor effects when dragging, changing the view or activating region selection', async () => {
  const user = userEvent.setup();
  const { area, rect, hover, rerender } = await setup();
  hover();
  const event = new MouseEvent('pointerdown', {
    clientX: 200,
    clientY: 180,
    button: 0,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  act(() => rect.dispatchEvent(event));
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
  fireEvent.keyDown(document, { key: 'Escape' });
  hover();
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
  hover();
  rerender(
    <CurveChart
      kind="output"
      samples={samples}
      selecting
      onSelectRegion={vi.fn()}
      onSelectingChange={vi.fn()}
    />,
  );
  hover();
  expect(area.querySelector('.curve-cursor-highlight')).toBeNull();
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
