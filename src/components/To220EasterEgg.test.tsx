import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { To220EasterEgg } from './To220EasterEgg';

afterEach(cleanup);

it('reveals the surprise from the Home logo and lets you release and reset the smoke', async () => {
  const user = userEvent.setup();
  const onHome = vi.fn();
  render(<To220EasterEgg onHome={onHome} />);
  expect(screen.queryByRole('region', { name: 'TO-220 secret lab' })).not.toBeInTheDocument();

  const logo = screen.getByRole('button', { name: 'MOSFit Studio home' });
  await user.click(logo);
  expect(onHome).toHaveBeenCalledOnce();
  expect(logo).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Ohm sweet ohm.');
  await user.click(screen.getByRole('button', { name: 'Release magic smoke' }));
  expect(screen.getByRole('status')).toHaveTextContent('No real transistors were harmed.');
  await user.click(screen.getByRole('button', { name: 'Install a fresh one' }));
  expect(screen.getByRole('status')).toHaveTextContent('Ohm sweet ohm.');

  await user.click(screen.getByRole('button', { name: 'Dismiss transistor' }));
  expect(screen.queryByRole('region', { name: 'TO-220 secret lab' })).not.toBeInTheDocument();
  expect(logo).toHaveFocus();
});

it('supports keyboard activation, Escape dismissal and reopening with a fresh transistor', async () => {
  const user = userEvent.setup();
  render(<To220EasterEgg onHome={vi.fn()} />);
  const logo = screen.getByRole('button', { name: 'MOSFit Studio home' });
  logo.focus();
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('button', { name: 'Release magic smoke' }));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('region', { name: 'TO-220 secret lab' })).not.toBeInTheDocument();
  expect(logo).toHaveFocus();
  await user.keyboard(' ');
  expect(screen.getByRole('status')).toHaveTextContent('Ohm sweet ohm.');
});

it('lets a modal above the surprise own Escape', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<To220EasterEgg onHome={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'MOSFit Studio home' }));
  rerender(
    <>
      <To220EasterEgg onHome={vi.fn()} />
      <div role="dialog" aria-label="Another tool" />
    </>,
  );
  await user.keyboard('{Escape}');
  expect(screen.getByRole('region', { name: 'TO-220 secret lab' })).toBeInTheDocument();
});
