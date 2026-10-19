import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CurveChart } from './ScientificChart';
import { FitWorkbench } from './FitWorkbench';
import { plotInfo } from './plotData';
import { chooseOption } from './test-select';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('puts metadata in the workbench titles and moves live counts and gestures into the popover', async () => {
  const user = userEvent.setup();
  render(<FitWorkbench shift={0} parameters={null} notify={vi.fn()} />);
  const output = within(screen.getByRole('region', { name: 'Output plot panel' }));
  const caps = screen.getByRole('region', { name: 'Capacitance plot panel' });
  expect(output.getByTitle('Output · Vgs sweep · 300 K')).toHaveTextContent(
    '02 / Output · Vgs sweep · 300 K',
  );
  expect(caps.querySelector('.plot-tile-title')).toHaveTextContent(
    'Capacitance · Vds = 0.05 V · 1 MHz · 300 K',
  );
  expect(screen.queryByText(/GAA nanosheet/)).not.toBeInTheDocument();
  expect(document.querySelector('.chart-heading p')).toBeNull();
  expect(document.querySelector('.chart-foot')).toBeNull();
  expect(screen.queryByText(/measured points/)).not.toBeInTheDocument();
  await user.click(output.getByRole('button', { name: 'Vgs = 0.4 V' }));
  const trigger = output.getByRole('button', { name: 'Plot information' });
  await user.click(trigger);
  const popover = within(screen.getByRole('dialog', { name: 'Output plot information' }));
  expect(popover.getByText('3 of 4 bias conditions visible')).toBeVisible();
  expect(popover.getByText(/116 measured points/)).toHaveTextContent('87 on visible traces');
  expect(popover.getByText(/Left-drag to pan/)).toBeVisible();
  expect(popover.getByRole('button', { name: 'Close plot information' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.click(output.getByRole('button', { name: 'Reset chart' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(trigger);
  expect(screen.getByText('4 of 4 bias conditions visible')).toBeInTheDocument();
});

it('counts supplied measurement arrays and uses short scale choices while retaining axis behavior', async () => {
  const user = userEvent.setup();
  const samples = plotInfo.capacitance.series.map((name) => ({
    name,
    x: [0, 0.5],
    measured: [0.2, 0.8],
    modelX: [0, 0.5],
    modelY: [0.3, 0.9],
  }));
  render(<CurveChart kind="capacitance" samples={samples} />);
  expect(
    screen.getByRole('heading', { name: 'Capacitance · Vds = 0.05 V · 1 MHz · 300 K' }),
  ).toBeInTheDocument();
  const scale = screen.getByRole('combobox', { name: 'Chart scale' });
  expect(scale).toHaveTextContent('lin');
  await chooseOption(user, scale, 'log');
  expect(scale).toHaveTextContent('log');
  await user.click(screen.getByRole('button', { name: 'Cgd' }));
  await user.click(screen.getByRole('button', { name: 'Plot information' }));
  expect(screen.getByText('2 of 3 capacitances visible')).toBeInTheDocument();
  expect(screen.getByText(/6 measured points/)).toHaveTextContent('4 on visible traces');
});

it('dismisses only the information popover with Escape inside an expanded plot', async () => {
  const user = userEvent.setup();
  render(<FitWorkbench shift={0} parameters={null} notify={vi.fn()} />);
  const transfer = within(screen.getByRole('region', { name: 'Transfer plot panel' }));
  await user.click(transfer.getByRole('button', { name: 'Expand chart' }));
  const expanded = screen.getByRole('dialog', { name: 'Transfer Characteristics (Ids–Vgs)' });
  const trigger = within(expanded).getByRole('button', { name: 'Plot information' });
  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Transfer plot information' })).toBeVisible();
  await user.keyboard('{Escape}');
  expect(
    screen.queryByRole('dialog', { name: 'Transfer plot information' }),
  ).not.toBeInTheDocument();
  expect(expanded).toBeVisible();
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Close plot information' }));
  expect(expanded).toBeVisible();
});
