import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { SpiceCode } from './SpiceCode';
import { generateSpice } from './spice';
import { initialParameters } from './data';

afterEach(cleanup);
const artifact = generateSpice(
  'MF_TEST',
  initialParameters.map((p) => p.value),
  9,
);

it('shows scope guides and matching boundaries, supports keyboard folding and reveals hidden parameter targets', async () => {
  const user = userEvent.setup();
  const onCopy = vi.fn(async () => true);
  const { rerender } = render(<SpiceCode artifact={artifact} highlight onCopy={onCopy} />);
  const pane = screen.getByLabelText('Full SPICE library');
  expect(pane.querySelectorAll('.spice-block-boundary')).toHaveLength(4);
  expect(
    pane.querySelector('[data-fitted="VTH0"]')!.querySelectorAll('.spice-scope-guide'),
  ).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Code structure' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  const fold = screen.getByRole('button', { name: 'Collapse subcircuit MF_TEST' });
  fold.focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('button', { name: 'Expand subcircuit MF_TEST' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(pane.querySelector('[data-fitted="VTH0"]')).toBeNull();
  expect(pane.querySelector('.spice-fold-summary')).toHaveTextContent('lines folded');
  expect(pane).toHaveTextContent('.ends MF_TEST');
  await user.click(screen.getByRole('button', { name: 'Collapse library MOSFIT_DEMO' }));
  expect(pane).not.toHaveTextContent('.subckt MF_TEST');
  expect(pane).toHaveTextContent('.endl MOSFIT_DEMO');
  await user.click(screen.getByRole('button', { name: 'Code structure' }));
  const outline = within(screen.getByRole('navigation', { name: 'SPICE code blocks' }));
  await user.click(outline.getByRole('button', { name: /Go to subcircuit MF_TEST, lines/ }));
  expect(pane).toHaveTextContent('.subckt MF_TEST');
  expect(pane.querySelector('[data-fitted="VTH0"]')).toBeNull();
  rerender(
    <SpiceCode
      artifact={artifact}
      highlight
      onCopy={onCopy}
      selection={{ parameter: 'VTH0', request: 1 }}
    />,
  );
  expect(pane.querySelector('[data-fitted="VTH0"]')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Expand all' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Collapse library MOSFIT_DEMO' }));
  await user.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(pane.querySelectorAll('[data-fitted]')).toHaveLength(5);
});

it('resets folds for a changed artifact and keeps folding available in the expanded reader', async () => {
  const user = userEvent.setup();
  const onCopy = vi.fn(async () => true);
  const { rerender } = render(<SpiceCode artifact={artifact} highlight onCopy={onCopy} />);
  await user.click(screen.getByRole('button', { name: 'Collapse library MOSFIT_DEMO' }));
  const changed = generateSpice('MF_NEXT', [0.5, 320, 1.1, 245, 0.065], 6);
  rerender(<SpiceCode artifact={changed} highlight onCopy={onCopy} />);
  expect(
    screen.getByLabelText('Full SPICE library').querySelector('[data-fitted="VTH0"]'),
  ).toHaveTextContent('0.5');
  expect(screen.queryByRole('button', { name: 'Expand all' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Expand library' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Collapse subcircuit MF_NEXT' }));
  expect(
    dialog.getByLabelText('Full SPICE library').querySelector('[data-fitted="VTH0"]'),
  ).toBeNull();
  await user.click(dialog.getByRole('button', { name: 'Expand all' }));
  expect(
    dialog.getByLabelText('Full SPICE library').querySelector('[data-fitted="VTH0"]'),
  ).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
