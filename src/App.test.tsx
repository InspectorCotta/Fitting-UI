import { chooseOption } from './test-select';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/#/project/overview');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('MOSFit workbench', () => {
  it('dismisses workspace menus consistently and returns keyboard focus to their triggers', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const name of ['Notifications', 'John Doe account', 'More']) {
      const trigger = screen.getByRole('button', { name });
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await user.tab();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveFocus();
      await user.click(trigger);
      await user.click(screen.getByRole('tab', { name: 'Notes' }));
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  });
  it('opens all project sections and global workspaces', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'RX90_GAA', level: 1 })).toBeVisible();
    for (const name of [
      'Datasets',
      'Experiments',
      'Model Fit',
      'Parameter Trends',
      'Correlation Matrix',
      'SPICE Export',
      'Notes',
      'Overview',
    ]) {
      await user.click(screen.getByRole('tab', { name }));
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    }
    for (const name of ['Projects', 'Datasets', 'Experiments', 'Models', 'Compute']) {
      await user.click(
        within(screen.getByRole('navigation', { name: 'Workspace navigation' })).getByRole(
          'button',
          { name },
        ),
      );
      expect(screen.getByRole('main')).not.toBeEmptyDOMElement();
    }
  });
  it('keeps dial inputs mounted while editing and supports undo and redo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
    const slider = screen.getByRole('spinbutton', { name: 'VTH0 exact value' });
    fireEvent.focus(slider);
    fireEvent.change(slider, { target: { value: '.49' } });
    expect(screen.getByRole('spinbutton', { name: 'VTH0 exact value' })).toBe(slider);
    fireEvent.blur(slider);
    expect(slider).toHaveValue(0.49);
    await user.click(screen.getByRole('button', { name: 'Undo parameter change' }));
    expect(slider).toHaveValue(0.412);
    await user.click(screen.getByRole('button', { name: 'Redo parameter change' }));
    expect(slider).toHaveValue(0.49);
    expect(JSON.parse(localStorage.getItem('mosfit:parameters')!)[0]).toBe(0.49);
  });
  it('switches control styles without losing values or undo history and remembers the choice', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
    expect(screen.getByRole('button', { name: 'Dials' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(screen.getByRole('slider', { name: 'VTH0' }), { key: 'ArrowUp' });
    fireEvent.keyUp(screen.getByRole('slider', { name: 'VTH0' }));
    await user.click(screen.getByRole('button', { name: 'Sliders' }));
    const slider = screen.getByRole('slider', { name: 'VTH0' });
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('0.413');
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '0.47' } });
    fireEvent.pointerUp(slider);
    await user.click(screen.getByRole('button', { name: 'Dials' }));
    expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveAttribute('aria-valuenow', '0.47');
    await user.click(screen.getByRole('button', { name: 'Undo parameter change' }));
    expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveAttribute('aria-valuenow', '0.413');
    await user.click(screen.getByRole('button', { name: 'Redo parameter change' }));
    expect(screen.getByRole('spinbutton', { name: 'VTH0 exact value' })).toHaveValue(0.47);
    await user.click(screen.getByRole('button', { name: 'Sliders' }));
    expect(JSON.parse(localStorage.getItem('mosfit:parameter-control')!)).toBe('sliders');
    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Sliders' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveValue('0.47');
  });
  it('expands one tile, restores real earlier values with undo, and keeps details when switching styles', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
    await user.click(screen.getByRole('button', { name: 'Expand VTH0 details' }));
    const dial = screen.getByRole('slider', { name: 'VTH0' });
    for (let i = 0; i < 2; i++) {
      fireEvent.keyDown(dial, { key: 'ArrowUp' }); fireEvent.keyUp(dial);
    }
    expect(dial).toHaveAttribute('aria-valuenow', '0.414');
    await user.click(screen.getByRole('button', { name: 'Restore VTH0 to 0.413 V' }));
    expect(dial).toHaveAttribute('aria-valuenow', '0.413');
    await user.click(screen.getByRole('button', { name: 'Undo parameter change' }));
    expect(dial).toHaveAttribute('aria-valuenow', '0.414');
    await user.click(screen.getByRole('button', { name: 'Reset VTH0 to baseline' }));
    expect(dial).toHaveAttribute('aria-valuenow', '0.412');
    await user.click(screen.getByRole('button', { name: 'Expand U0 details' }));
    expect(screen.queryByRole('region', { name: 'VTH0 details' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'U0 details' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sliders' }));
    expect(screen.getByRole('region', { name: 'U0 details' })).toBeVisible();
    expect(screen.getByRole('slider', { name: 'U0' })).toHaveAttribute('type', 'range');
    await user.click(screen.getByRole('button', { name: 'Collapse U0 details' }));
    expect(screen.queryByRole('region', { name: 'U0 details' })).not.toBeInTheDocument();
  });
  it('runs and cancels an experiment, then completes a new extraction', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Run experiment' }));
    fireEvent.change(screen.getByLabelText('Experiment name'), {
      target: { value: 'Test extraction' },
    });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Start experiment' }));
    expect(screen.getByText('Running')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole('button', { name: 'Stop run' }));
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Run experiment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Start experiment' }));
    act(() => vi.advanceTimersByTime(8500));
    expect(screen.queryByRole('button', { name: 'Stop run' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Fit converged. 7.4%');
    expect(JSON.parse(localStorage.getItem('mosfit:experiments')!)[0].status).toBe('Completed');
  });
  it('saves notes and navigates with the command palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('textbox', { name: 'Search workspace' }), 'notes');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Notes.*Open notes/ }),
    );
    const notes = screen.getByRole('textbox', { name: 'Project notes' });
    fireEvent.change(notes, { target: { value: 'Check mobility at 400 K.' } });
    expect(JSON.parse(localStorage.getItem('mosfit:notes')!)).toBe('Check mobility at 400 K.');
    cleanup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue(
      'Check mobility at 400 K.',
    );
  });
  it('validates measurement CSVs and imports numeric rows', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Datasets' }));
    await user.click(screen.getByRole('button', { name: 'Import dataset' }));
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    const invalid = new File(['Vgs,Ids\nnot,data\n1,2'], 'invalid.csv', { type: 'text/csv' });
    Object.defineProperty(invalid, 'text', { value: async () => 'Vgs,Ids\nnot,data\n1,2' });
    await user.upload(input, invalid);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Import dataset' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('numeric measurement');
    const valid = new File(['Vgs,Ids\n0,1e-9\n.5,1e-4'], 'new-transfer.csv', { type: 'text/csv' });
    Object.defineProperty(valid, 'text', { value: async () => 'Vgs,Ids\n0,1e-9\n.5,1e-4' });
    await user.upload(input, valid);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Import dataset' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('new-transfer')).toBeInTheDocument();
  });
  it('toggles chart series and switches the chart scale', async () => {
    const user = userEvent.setup();
    render(<App />);
    const bias = screen.getByRole('button', { name: 'Vds = 0.7 V' });
    await user.click(bias);
    expect(bias).toHaveAttribute('aria-pressed', 'false');
    await user.click(bias);
    expect(bias).toHaveAttribute('aria-pressed', 'true');
    await chooseOption(user, screen.getByRole('combobox', { name: 'Chart scale' }), 'lin');
    expect(screen.getByRole('combobox', { name: 'Chart scale' })).toHaveTextContent('lin');
    await user.click(screen.getByRole('button', { name: 'Reset chart' }));
    expect(screen.getByRole('combobox', { name: 'Chart scale' })).toHaveTextContent('log');
  });
  it('consolidates workspace navigation and tools in the sidebar', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelector('.topbar')).not.toBeInTheDocument();
    const sidebar = within(screen.getByRole('complementary', { name: 'Workspace sidebar' }));
    for (const name of ['Projects', 'Datasets', 'Experiments', 'Models', 'Compute']) {
      expect(sidebar.getByRole('button', { name })).toBeInTheDocument();
    }
    await user.click(sidebar.getByRole('button', { name: 'Models' }));
    expect(screen.getByRole('heading', { name: 'Model library' })).toBeInTheDocument();
    await user.click(sidebar.getByRole('button', { name: 'Compute' }));
    expect(screen.getByRole('heading', { name: 'Browser runtime' })).toBeInTheDocument();
    await user.click(sidebar.getByRole('button', { name: 'Search workspace' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Jump to anything.');
    await user.keyboard('{Escape}');
    await user.click(sidebar.getByRole('button', { name: 'Notifications' }));
    expect(sidebar.getByText('EXP-1023 finished with 8.7% RMS error.')).toBeInTheDocument();
    await user.click(sidebar.getByRole('button', { name: 'John Doe account' }));
    expect(sidebar.getByRole('button', { name: 'Export workspace' })).toBeInTheDocument();
  });
  it('applies and persists white mode from preferences without losing workspace state', async () => {
    const user = userEvent.setup();
    localStorage.setItem('mosfit:parameters', JSON.stringify([0.47, 350, 1.2, 250, 0.07]));
    localStorage.setItem('mosfit:notes', JSON.stringify('Keep the 400 K measurements.'));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Appearance' })).getByRole('button', {
        name: 'White',
      }),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'white');
    expect(JSON.parse(localStorage.getItem('mosfit:theme')!)).toBe('white');
    await user.click(screen.getByRole('button', { name: 'All set' }));
    await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
    expect(screen.getByRole('spinbutton', { name: 'VTH0 exact value' })).toHaveValue(0.47);
    cleanup();
    render(<App />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'white');
    await user.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue(
      'Keep the 400 K measurements.',
    );
    await user.click(screen.getByRole('button', { name: 'Switch to black mode' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'black');
    await user.click(screen.getByRole('button', { name: 'Switch to white mode' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'white');
  });
  it('keeps the experiment action in the main workspace and out of the inspector', async () => {
    const user = userEvent.setup();
    render(<App />);
    const inspector = document.querySelector('.inspector') as HTMLElement;
    expect(
      within(inspector).queryByRole('button', { name: 'Run experiment' }),
    ).not.toBeInTheDocument();
    for (const tab of ['Overview', 'Model Fit', 'Experiments']) {
      await user.click(screen.getByRole('tab', { name: tab }));
      expect(screen.getAllByRole('button', { name: 'Run experiment' })).toHaveLength(1);
      expect(
        within(screen.getByRole('main')).getByRole('button', { name: 'Run experiment' }),
      ).toBeInTheDocument();
    }
  });
  it('restores project tabs and sidebar screens through native back and forward history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
    const slider = screen.getByRole('spinbutton', { name: 'VTH0 exact value' });
    fireEvent.change(slider, { target: { value: '0.47' } });
    const navigation = within(screen.getByRole('navigation', { name: 'Workspace navigation' }));
    await user.click(navigation.getByRole('button', { name: 'Datasets' }));
    await user.click(navigation.getByRole('button', { name: 'Models' }));
    expect(window.location.hash).toBe('#/models');

    async function traverse(direction: 'back' | 'forward') {
      await act(async () => {
        await new Promise<void>((resolve) => {
          window.addEventListener('popstate', () => resolve(), { once: true });
          window.history[direction]();
        });
      });
    }
    await traverse('back');
    expect(navigation.getByRole('button', { name: 'Datasets' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    await traverse('back');
    expect(screen.getByRole('tab', { name: 'Model Fit' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('spinbutton', { name: 'VTH0 exact value' })).toHaveValue(0.47);
    await traverse('back');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await traverse('forward');
    expect(screen.getByRole('tab', { name: 'Model Fit' })).toHaveAttribute('aria-selected', 'true');
    await traverse('forward');
    expect(navigation.getByRole('button', { name: 'Datasets' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await traverse('forward');
    expect(screen.getByRole('heading', { name: 'Model library' })).toBeInTheDocument();
    await traverse('back');
    await user.click(navigation.getByRole('button', { name: 'Compute' }));
    expect(window.location.hash).toBe('#/compute');
    const length = window.history.length;
    await user.click(navigation.getByRole('button', { name: 'Compute' }));
    expect(window.history.length).toBe(length);
  });
  it('opens the addressed screen on reload and supports links changed through the location', async () => {
    window.history.replaceState(null, '', '/#/project/correlation-matrix');
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Correlation Matrix' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await act(async () => {
      window.location.hash = '#/compute';
    });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Browser runtime' })).toBeInTheDocument(),
    );
    cleanup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Browser runtime' })).toBeInTheDocument();
  });
});
