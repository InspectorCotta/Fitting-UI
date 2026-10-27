import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FitWorkbench } from './FitWorkbench';
import App from './App';
import { FIT_VIEW_KEY } from './fitViews';
import { initialParameters } from './data';
import { RegionInvestigation } from './RegionInvestigation';
import {
  snapshotForInvestigation,
  type FitAgent,
  type InvestigationRequest,
} from './fitInvestigation';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const values = initialParameters.map((p) => p.value);
function mount(download = vi.fn()) {
  const result = render(
    <FitWorkbench
      shift={0.025}
      values={values}
      parameters={null}
      notify={vi.fn()}
      download={download}
    />,
  );
  return { ...result, download };
}

function pointer(target: EventTarget, type: string, x: number, y: number, pointerType = 'mouse') {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
  act(() => target.dispatchEvent(event));
}

it('brushes a log plot without changing its zoom and opens the selected physical region', async () => {
  const user = userEvent.setup();
  const { download } = mount();
  await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
  const transfer = within(screen.getByRole('region', { name: 'Transfer plot panel' }));
  await user.click(transfer.getByRole('button', { name: 'Vds = 0.3 V' }));
  await user.click(transfer.getByRole('button', { name: 'Investigate region' }));
  const storedView = localStorage.getItem(FIT_VIEW_KEY);
  const canvas = transfer.getByRole('img', { name: /Simulated Transfer/ });
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('class', 'nsewdrag');
  rect.getBoundingClientRect = () => new DOMRect(100, 100, 200, 200);
  canvas.append(rect);
  pointer(rect, 'pointerdown', 150, 125);
  pointer(document, 'pointerup', 151, 126);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  pointer(rect, 'pointerdown', 150, 125);
  pointer(document, 'pointermove', 220, 250);
  fireEvent.keyDown(document, { key: 'Escape' });
  pointer(document, 'pointerup', 220, 250);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  pointer(rect, 'pointerdown', 150, 125);
  pointer(document, 'pointermove', 220, 250);
  expect(document.querySelector('.plot-region-box')).toBeInTheDocument();
  pointer(document, 'pointerup', 220, 250);
  const dialog = within(screen.getByRole('dialog', { name: 'Transfer region investigation' }));
  expect(dialog.getByText('Demo agent · no LLM connected')).toBeInTheDocument();
  expect(localStorage.getItem(FIT_VIEW_KEY)).toBe(storedView);
  await user.click(dialog.getByRole('button', { name: 'Export investigation' }));
  const report = JSON.parse(download.mock.calls[0][1]);
  expect(report.request.region.series).toEqual([0, 2, 3]);
  expect(report.request.region.xRange[0]).toBeCloseTo(-0.1375);
  const graph = dialog.getByRole('img', { name: /Simulated Transfer/ }) as HTMLElement & {
    plotlyTestFigure?: { layout: { shapes: { y0: number; y1: number }[] } };
  };
  await waitFor(() =>
    expect(graph.plotlyTestFigure?.layout.shapes[0]).toMatchObject({ y0: 1e-9, y1: 1e-4 }),
  );
});

it('runs the demo investigation and focused fit, exports the exact result, and invalidates stale previews', async () => {
  const user = userEvent.setup();
  const { download } = mount();
  await user.click(screen.getByRole('button', { name: 'Try an example' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Investigate selection' }));
  expect(dialog.getByText('Inspecting captured samples…')).toBeInTheDocument();
  await dialog.findByRole('region', { name: 'Agent investigation' }, { timeout: 2500 });
  expect(dialog.getByRole('heading', { name: 'Error by bias' })).toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Run focused demo fit' }));
  const outcome = await dialog.findByRole(
    'region',
    { name: 'Focused demo fit results' },
    { timeout: 2500 },
  );
  expect(outcome).toHaveTextContent('Outside selection');
  await user.click(dialog.getByRole('button', { name: 'Export investigation' }));
  const payload = JSON.parse(download.mock.calls[0][1]);
  expect(payload.mode).toBe('demo-no-llm');
  expect(payload.focusedFit.regionAfter.rms).toBeLessThan(payload.focusedFit.regionBefore.rms);
  expect(payload.focusedFit.outsideAfter.rms).toBeCloseTo(payload.focusedFit.outsideBefore.rms, 10);
  expect(payload.request.source.parameters.map((p: { value: number }) => p.value)).toEqual(values);
  fireEvent.change(dialog.getByRole('slider', { name: 'Region weight' }), {
    target: { value: '7' },
  });
  expect(
    dialog.queryByRole('region', { name: 'Focused demo fit results' }),
  ).not.toBeInTheDocument();
  fireEvent.change(dialog.getByRole('textbox', { name: 'What should the next fit improve?' }), {
    target: { value: 'Inspect parameter sensitivity.' },
  });
  expect(dialog.queryByRole('region', { name: 'Agent investigation' })).not.toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: 'Close dialog' }));
  expect(screen.getByRole('button', { name: 'Review investigation' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Review investigation' }));
  expect(screen.getByRole('textbox', { name: 'What should the next fit improve?' })).toHaveValue(
    'Inspect parameter sensitivity.',
  );
});

it('keeps the App live parameters and saved-fit library unchanged after a focused demo run', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/#/project/model-fit?project=project-demo');
  render(<App />);
  const parameters = initialParameters.map((p) =>
    screen.getByRole('slider', { name: p.name }).getAttribute('aria-valuenow'),
  );
  const saved = localStorage.getItem('mosfit:saved-fits');
  await user.click(screen.getByRole('button', { name: 'Try an example' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Investigate selection' }));
  await dialog.findByRole('button', { name: 'Run focused demo fit' }, { timeout: 2500 });
  await user.click(dialog.getByRole('button', { name: 'Run focused demo fit' }));
  await dialog.findByRole('region', { name: 'Focused demo fit results' }, { timeout: 2500 });
  await user.click(dialog.getByRole('button', { name: 'Close dialog' }));
  expect(
    initialParameters.map((p) =>
      screen.getByRole('slider', { name: p.name }).getAttribute('aria-valuenow'),
    ),
  ).toEqual(parameters);
  expect(localStorage.getItem('mosfit:saved-fits')).toBe(saved);
  await user.click(screen.getByRole('tab', { name: 'Compare Fits' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
  expect(screen.queryByRole('button', { name: 'Review investigation' })).not.toBeInTheDocument();
});

it('supports keyboard range selection, editable bounds, empty-region recovery and touch brushing', async () => {
  const user = userEvent.setup();
  mount();
  const output = within(screen.getByRole('region', { name: 'Output plot panel' }));
  await user.click(output.getByRole('button', { name: 'Investigate region' }));
  await user.click(output.getByRole('button', { name: 'Use visible range' }));
  let dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByText('Selection & captured source'));
  await user.click(dialog.getByRole('button', { name: 'Edit bounds & traces' }));
  fireEvent.change(dialog.getByRole('spinbutton', { name: 'Y minimum' }), {
    target: { value: '20' },
  });
  fireEvent.change(dialog.getByRole('spinbutton', { name: 'Y maximum' }), {
    target: { value: '30' },
  });
  await user.click(dialog.getByRole('button', { name: 'Update selection' }));
  dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText(/No measured points in this box/)).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Investigate selection' })).toBeDisabled();
  await user.click(dialog.getByRole('button', { name: 'Reselect' }));
  dialog = within(screen.getByRole('dialog', { name: /Output Characteristics/ }));
  const canvas = dialog.getByRole('img', { name: /Simulated Output/ });
  await waitFor(() => expect(dialog.queryByText('Loading Plotly…')).not.toBeInTheDocument());
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('class', 'nsewdrag');
  rect.getBoundingClientRect = () => new DOMRect(100, 100, 200, 200);
  canvas.append(rect);
  pointer(rect, 'pointerdown', 125, 125, 'touch');
  pointer(document, 'pointermove', 275, 275, 'touch');
  pointer(document, 'pointerup', 275, 275, 'touch');
  expect(screen.getByRole('dialog', { name: 'Output region investigation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Investigate selection' })).toBeEnabled();
});

it('ignores late agent responses after Stop and exposes a retryable integration error', async () => {
  const user = userEvent.setup();
  const input: InvestigationRequest = {
    schemaVersion: 1,
    id: 'late',
    source: snapshotForInvestigation(0),
    region: { kind: 'output', xRange: [0, 0.8], yRange: [0, 1], series: [0] },
    prompt: 'Improve this region.',
  };
  let resolve: (value: unknown) => void = () => {};
  const agent = {
    investigate: vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
    runFocusedFit: vi.fn(),
  } as unknown as FitAgent;
  render(
    <RegionInvestigation
      request={input}
      open
      onOpenChange={vi.fn()}
      onReselect={vi.fn()}
      onRegionChange={vi.fn()}
      agent={agent}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Investigate selection' }));
  await user.click(screen.getByRole('button', { name: 'Stop' }));
  await act(async () =>
    resolve({ summary: 'stale', request: input, blocks: [], suggestedWeight: 4 }),
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  vi.mocked(agent.investigate).mockRejectedValueOnce(new Error('Demo connection interrupted.'));
  await user.click(screen.getByRole('button', { name: 'Investigate selection' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Demo connection interrupted.');
  expect(screen.getByRole('button', { name: 'Investigate selection' })).toBeEnabled();
});
