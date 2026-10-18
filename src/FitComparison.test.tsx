import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FitComparison } from './FitComparison';
import { exampleSavedFits } from './savedFits';
import { chooseOption } from './test-select';
import App from './App';
import { PROJECTS_KEY } from './projectLibrary';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/#/project/model-fit');
});
afterEach(cleanup);
const download = vi.fn();
function mountComparison() {
  return render(
    <FitComparison
      fits={exampleSavedFits()}
      onSaveCurrent={vi.fn()}
      onDelete={vi.fn()}
      notify={vi.fn()}
      download={download}
    />,
  );
}
it('swaps roles, shows parameter deltas, and exports the exact compared snapshots', async () => {
  const user = userEvent.setup();
  mountComparison();
  const a = screen.getByRole('combobox', { name: 'Baseline fit' });
  const b = screen.getByRole('combobox', { name: 'Candidate fit' });
  expect(a).toHaveTextContent('Initial baseline');
  expect(b).toHaveTextContent('Current reference');
  const summary = within(screen.getByRole('region', { name: 'Comparison summary' }));
  expect(summary.getByText('3 improved · 0 worsened')).toBeInTheDocument();
  const parameters = within(screen.getByRole('region', { name: 'Parameter comparison' }));
  expect(parameters.getByRole('row', { name: /VTH0/ })).toHaveTextContent('-0.026');
  await user.click(screen.getByRole('button', { name: 'Swap baseline and candidate' }));
  expect(a).toHaveTextContent('Current reference');
  expect(b).toHaveTextContent('Initial baseline');
  expect(summary.getByText('0 improved · 3 worsened')).toBeInTheDocument();
  expect(parameters.getByRole('row', { name: /VTH0/ })).toHaveTextContent('+0.026');
  await user.click(screen.getByRole('button', { name: 'Export comparison' }));
  const report = JSON.parse(download.mock.calls.at(-1)![1]);
  expect(report.baseline.id).toBe('example-reference');
  expect(report.candidate.id).toBe('example-baseline');
  expect(report.parameterChanges[0].delta).toBeCloseTo(0.026);
});
it('overlays supplied curves, inspects A and B values, and shares fullscreen chart changes', async () => {
  const user = userEvent.setup();
  mountComparison();
  await waitFor(() => expect(screen.queryByText('Loading Plotly…')).not.toBeInTheDocument());
  const graph = screen.getByRole('img', { name: /Simulated Transfer/ });
  const figure = (
    graph as HTMLElement & { plotlyTestFigure: { data: { x: number[]; y: number[] }[] } }
  ).plotlyTestFigure;
  const [candidate, , baseline] = exampleSavedFits();
  expect(figure.data).toHaveLength(12);
  expect(figure.data[0].y).toEqual(baseline.curves.transfer[0].modelY);
  expect(figure.data[8].y).toEqual(candidate.curves.transfer[0].modelY);
  act(() =>
    graph.dispatchEvent(
      new CustomEvent('test-plotly_hover', {
        detail: {
          points: [{ curveNumber: 8, x: 0.3, y: figure.data[8].y[60] }],
          event: { clientX: 100, clientY: 100 },
        },
      }),
    ),
  );
  const tooltip = within(screen.getByRole('tooltip'));
  expect(tooltip.getByText('A · Baseline')).toBeInTheDocument();
  expect(tooltip.getByText('B · Candidate')).toBeInTheDocument();
  await user.click(
    within(screen.getByRole('group', { name: 'Compared measurements' })).getByRole('button', {
      name: 'Output',
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Expand chart' }));
  const expanded = within(screen.getByRole('dialog', { name: 'Output fit comparison' }));
  await chooseOption(user, expanded.getByRole('combobox', { name: 'Chart scale' }), 'Log scale');
  await user.click(expanded.getByRole('button', { name: 'Close dialog' }));
  expect(screen.getByRole('combobox', { name: 'Chart scale' })).toHaveTextContent('Log scale');
});
it('keeps empty libraries empty and blocks overlays for incompatible snapshots', async () => {
  const user = userEvent.setup();
  function Library() {
    const [fits, setFits] = useState(exampleSavedFits);
    return (
      <FitComparison
        fits={fits}
        onSaveCurrent={vi.fn()}
        onDelete={(id) => setFits((current) => current.filter((fit) => fit.id !== id))}
        notify={vi.fn()}
        download={download}
      />
    );
  }
  const view = render(<Library />);
  await user.click(screen.getByText(/Saved fit library/));
  for (const fit of exampleSavedFits())
    await user.click(screen.getByRole('button', { name: `Delete fit ${fit.name}` }));
  expect(screen.getByRole('heading', { name: 'No saved fits yet' })).toBeInTheDocument();
  const fits = exampleSavedFits();
  fits[0].measurementSetId = 'other-measurements';
  view.rerender(
    <FitComparison
      fits={fits}
      onSaveCurrent={vi.fn()}
      onDelete={vi.fn()}
      notify={vi.fn()}
      download={download}
    />,
  );
  expect(screen.getByText(/Choose fits from the same model family/)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Saved fit overlay' })).not.toBeInTheDocument();
});
it('saves frozen snapshots, validates names, persists them, and keeps projects separate', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Save fit' }));
  await user.clear(screen.getByLabelText('Fit name'));
  await user.type(screen.getByLabelText('Fit name'), 'Current reference');
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }));
  expect(screen.getByRole('alert')).toHaveTextContent('already in use');
  await user.clear(screen.getByLabelText('Fit name'));
  await user.type(screen.getByLabelText('Fit name'), 'Saved baseline');
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }));
  const baseline = JSON.parse(localStorage.getItem('mosfit:saved-fits')!)[0];
  fireEvent.change(screen.getByRole('slider', { name: 'VTH0' }), { target: { value: '0.49' } });
  expect(JSON.parse(localStorage.getItem('mosfit:saved-fits')!)[0]).toEqual(baseline);
  await user.click(screen.getByRole('button', { name: 'Save fit' }));
  await user.clear(screen.getByLabelText('Fit name'));
  await user.type(screen.getByLabelText('Fit name'), 'Saved candidate');
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }));
  await user.click(screen.getByRole('button', { name: 'Compare fits' }));
  await chooseOption(
    user,
    screen.getByRole('combobox', { name: 'Baseline fit' }),
    'Saved baseline',
  );
  const row = within(screen.getByRole('region', { name: 'Parameter comparison' })).getByRole(
    'row',
    { name: /VTH0/ },
  );
  expect(row).toHaveTextContent('0.412');
  expect(row).toHaveTextContent('0.49');
  expect(row).toHaveTextContent('+0.078');
  cleanup();
  render(<App />);
  expect(screen.getByRole('combobox', { name: 'Candidate fit' })).toHaveTextContent(
    'Saved candidate',
  );
  await user.click(screen.getByRole('button', { name: 'Home' }));
  await user.click(screen.getByRole('button', { name: 'New project' }));
  await user.type(screen.getByLabelText('Project name'), 'Separate fits');
  await user.type(screen.getByLabelText('Description'), 'Keep these fit snapshots separate.');
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await user.click(screen.getByRole('tab', { name: 'Compare Fits' }));
  await user.click(screen.getByRole('combobox', { name: 'Candidate fit' }));
  expect(screen.queryByRole('option', { name: 'Saved candidate' })).not.toBeInTheDocument();
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: 'Home' }));
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  expect(screen.getByRole('combobox', { name: 'Candidate fit' })).toHaveTextContent(
    'Saved candidate',
  );
  const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY)!);
  expect(
    projects.find((project: { id: string }) => project.id === 'project-demo').snapshot.savedFits,
  ).toHaveLength(5);
});

it('saves directly from the comparison page and handles fits with identical parameter values', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/#/project/compare-fits');
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Save current fit' }));
  await user.clear(screen.getByLabelText('Fit name'));
  await user.type(screen.getByLabelText('Fit name'), 'Reference copy');
  await user.click(screen.getByRole('button', { name: 'Save snapshot' }));
  expect(screen.getByRole('combobox', { name: 'Candidate fit' })).toHaveTextContent(
    'Reference copy',
  );
  await chooseOption(
    user,
    screen.getByRole('combobox', { name: 'Baseline fit' }),
    'Current reference',
  );
  await user.click(screen.getByRole('checkbox', { name: 'Changed only' }));
  expect(screen.getByText('No parameter changes between these fits.')).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Comparison summary' })).getByText('No change'),
  ).toBeInTheDocument();
});
