import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpiceExport } from './SpiceExport';
import { initialDatasets, initialParameters } from './data';
import { compareSpiceArtifact, generateSpice } from './spice';
import { loadPlotly } from './plotly';

const baseline = initialParameters.map((p) => p.value);
const props = {
  projectId: 'test',
  projectName: 'RX90_GAA',
  values: baseline,
  datasets: initialDatasets,
  notify: vi.fn(),
  download: vi.fn(),
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});
const advance = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 850));
  });
const setupUser = () => userEvent.setup();

it('shows the complete highlighted library and downloads the same artifact and comparison samples that are plotted', async () => {
  const user = setupUser();
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<SpiceExport {...props} />);
  const artifact = generateSpice('MF_RX90_GAA', baseline, 9);
  const source = screen.getByLabelText('Full SPICE library');
  expect(
    [...source.querySelectorAll('.spice-line-source')]
      .map((line) => (line.textContent === ' ' ? '' : line.textContent))
      .join('\n') + '\n',
  ).toBe(artifact.source);
  expect(source.querySelectorAll('[data-fitted]')).toHaveLength(5);
  expect(source.querySelectorAll('.spice-token-directive').length).toBeGreaterThan(5);
  expect(source).toHaveClass('highlight-fitted');
  expect(screen.getByRole('button', { name: 'Download .lib' })).toBeDisabled();
  expect(screen.getByText(/No SPICE solver is connected/)).toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: 'Highlight fitted parameters' }));
  expect(source).not.toHaveClass('highlight-fitted');
  await user.click(screen.getByRole('button', { name: 'Collapse library MOSFIT_DEMO' }));
  expect(source.querySelector('[data-fitted="VTH0"]')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Copy library' }));
  expect(writeText).toHaveBeenCalledWith(artifact.source);
  await user.click(screen.getByRole('button', { name: 'Show VTH0 in SPICE library' }));
  expect(source.querySelector('[data-fitted="VTH0"]')).toBeInTheDocument();
  await advance();
  expect(screen.getByRole('status')).toHaveTextContent('Demo comparison passed');
  await user.click(screen.getByRole('button', { name: 'Download .lib' }));
  expect(props.download).toHaveBeenCalledWith(artifact.filename, artifact.source, 'text/plain');
  await user.click(screen.getByRole('button', { name: 'Report' }));
  const report = JSON.parse(props.download.mock.calls.at(-1)![1]);
  expect(report.artifact).toEqual(artifact);
  expect(report.spiceSolverExecuted).toBe(false);
  expect(report.results).toHaveLength(3);
  expect(
    report.results.reduce((n: number, result: { points: number }) => n + result.points, 0),
  ).toBe(319);
  await user.click(
    within(screen.getByRole('tablist', { name: 'Export comparison plots' })).getByRole('tab', {
      name: 'Capacitance',
    }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  const api = await loadPlotly();
  const chart = screen.getByRole('img', { name: /Simulated Capacitance/ });
  const figure = (
    chart as HTMLElement & { plotlyTestFigure: { data: { x: number[]; y: number[] }[] } }
  ).plotlyTestFigure;
  expect(figure.data[0].y).toEqual(report.results[2].series[0].modelY);
  expect(figure.data[1].y).toEqual(report.results[2].series[0].measured);
  expect(api.react).toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Expand library' }));
  expect(screen.getByRole('dialog')).toHaveAccessibleName(artifact.filename);
  expect(within(screen.getByRole('dialog')).getByLabelText('Full SPICE library')).toHaveTextContent(
    '.endl MOSFIT_DEMO',
  );
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('cancels obsolete comparisons and replays the latest fitted values, with honest failed targets', async () => {
  const user = setupUser();
  const { rerender } = render(<SpiceExport {...props} />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  const latest = [0.55, 320, 1.1, 245, 0.065];
  rerender(<SpiceExport {...props} values={latest} />);
  expect(screen.getByRole('button', { name: 'Download .lib' })).toBeDisabled();
  await advance();
  expect(screen.getByRole('status')).toHaveTextContent('Review fit differences');
  expect(screen.getByRole('button', { name: 'Download .lib' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Report' }));
  const report = JSON.parse(props.download.mock.calls.at(-1)![1]);
  expect(report.exportedParameters.VTH0).toBe(0.55);
  expect(report.results[0]).toEqual(
    compareSpiceArtifact(generateSpice('MF_RX90_GAA', latest, 9), 'transfer', initialDatasets),
  );
  const canvas = screen.getByRole('img', { name: /Simulated Transfer/ });
  const figure = (canvas as HTMLElement & { plotlyTestFigure: { data: { y: number[] }[] } })
    .plotlyTestFigure;
  expect(figure.data[0].y).toEqual(report.results[0].series[0].modelY);
  expect(figure.data[0].y).not.toEqual(
    compareSpiceArtifact(generateSpice('MF_RX90_GAA', baseline, 9), 'transfer', initialDatasets)!
      .series[0].modelY,
  );
});

it('invalidates old results when export settings or datasets change and supports manual runs and cancellation', async () => {
  const user = setupUser();
  const { rerender } = render(<SpiceExport {...props} />);
  await advance();
  await user.click(screen.getByRole('checkbox', { name: /Compare automatically/ }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Numeric precision' }), '6');
  expect(screen.getByRole('status')).toHaveTextContent('Comparison pending');
  expect(screen.getByRole('button', { name: 'Download .lib' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Run comparison' }));
  await user.click(screen.getByRole('button', { name: 'Stop comparison' }));
  await advance();
  expect(screen.getByRole('status')).toHaveTextContent('Comparison stopped');
  expect(screen.getByRole('button', { name: 'Report' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Run comparison' }));
  await advance();
  expect(screen.getByRole('status')).toHaveTextContent('Demo comparison passed');
  rerender(<SpiceExport {...props} datasets={[]} />);
  expect(screen.getByRole('button', { name: 'Download .lib' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Run comparison' }));
  await advance();
  expect(screen.getByRole('alert')).toHaveTextContent('No bundled 300 K');
  fireEvent.change(screen.getByRole('textbox', { name: 'Model name' }), {
    target: { value: 'Bad name' },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('letter first');
  expect(screen.getByRole('button', { name: 'Run comparison' })).toBeDisabled();
});
