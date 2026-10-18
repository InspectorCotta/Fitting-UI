import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { Dialog } from './dialog';
import { Select } from './select';

afterEach(cleanup);

function Picker({ inDialog = false }) {
  const [value, setValue] = useState('transfer');
  const select = (
    <Select
      aria-label="View preset"
      value={value}
      onValueChange={setValue}
      groups={[
        {
          label: 'Built-in views',
          options: [
            { value: 'transfer', label: 'Transfer detail' },
            { value: 'dc', label: 'DC comparison' },
          ],
        },
        { label: 'Your views', options: [{ value: 'saved', label: 'My saved view' }] },
      ]}
    />
  );
  return inDialog ? (
    <Dialog open onOpenChange={() => {}} title="Settings" description="Select a view.">
      {select}
    </Dialog>
  ) : (
    select
  );
}

it('supports grouped options, keyboard selection, typeahead and Escape focus restoration', async () => {
  const user = userEvent.setup();
  render(<Picker />);
  const trigger = screen.getByRole('combobox', { name: 'View preset' });
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('group', { name: 'Built-in views' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Your views' })).toBeInTheDocument();
  await user.keyboard('{End}{Enter}');
  expect(trigger).toHaveTextContent('My saved view');
  expect(trigger).toHaveFocus();
  await user.keyboard('{Enter}dc');
  expect(screen.getByRole('option', { name: 'DC comparison' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveTextContent('My saved view');
});

it('keeps portaled options usable inside a dialog and dismisses on an outside click', async () => {
  const user = userEvent.setup();
  render(<Picker inDialog />);
  const trigger = screen.getByRole('combobox', { name: 'View preset' });
  await user.click(trigger);
  await user.click(screen.getByRole('option', { name: 'DC comparison' }));
  expect(trigger).toHaveTextContent('DC comparison');
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  await user.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(trigger).toHaveTextContent('DC comparison');
});
