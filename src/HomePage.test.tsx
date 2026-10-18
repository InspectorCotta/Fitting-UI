import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { ACTIVE_PROJECT_KEY, PROJECTS_KEY, templateProject } from './projectLibrary';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('starts at Home and opens it from both sidebar controls, preserving project deep links', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(window.location.hash).toBe('#/home');
  expect(screen.getByRole('heading', { name: /MOSFit Studio/, level: 1 })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Recently opened' })).toBeInTheDocument();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(document.querySelector('.inspector')).toBeNull();
  expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
  await user.click(screen.getByRole('button', { name: 'Home' }));
  expect(screen.getByRole('button', { name: 'Open RX90_GAA' })).toHaveTextContent(
    'Resume model fit',
  );
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  expect(screen.getByRole('tab', { name: 'Model Fit' })).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('button', { name: 'MOSFit Studio home' }));
  expect(window.location.hash).toBe('#/home');
  expect(document.title).toBe('MOSFit Studio — Home');
  await user.click(screen.getByRole('button', { name: /Model workbench/ }));
  expect(screen.getByRole('slider', { name: 'VTH0' })).toBeInTheDocument();
  cleanup();
  render(<App />);
  expect(screen.getByRole('tab', { name: 'Model Fit' })).toHaveAttribute('aria-selected', 'true');
});

it('creates separate projects, orders recents by opening time and restores notes and parameters after reload', async () => {
  let now = Date.UTC(2026, 9, 17, 10);
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  await user.click(screen.getByRole('tab', { name: 'Notes' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Project notes' }), {
    target: { value: 'Keep the baseline measurements.' },
  });
  await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
  fireEvent.change(screen.getByRole('slider', { name: 'VTH0' }), { target: { value: '0.46' } });
  await user.click(screen.getByRole('button', { name: 'Home' }));
  now += 60_000;
  await user.click(screen.getByRole('button', { name: 'New project' }));
  await user.type(screen.getByLabelText('Project name'), 'Temperature study');
  await user.type(screen.getByLabelText('Description'), 'Inspect temperature dependence.');
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  expect(screen.getByRole('heading', { name: 'Temperature study', level: 1 })).toBeVisible();
  await user.click(screen.getByRole('tab', { name: 'Notes' }));
  expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue('');
  fireEvent.change(screen.getByRole('textbox', { name: 'Project notes' }), {
    target: { value: 'Sweep 200–400 K.' },
  });
  await user.click(screen.getByRole('tab', { name: 'Model Fit' }));
  expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveValue('0.412');
  fireEvent.change(screen.getByRole('slider', { name: 'VTH0' }), { target: { value: '0.48' } });
  await user.click(screen.getByRole('button', { name: 'Home' }));
  expect(document.querySelector('.home-featured-project h3')).toHaveTextContent(
    'Temperature study',
  );
  expect(JSON.parse(localStorage.getItem(PROJECTS_KEY)!)).toHaveLength(2);
  now += 60_000;
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveValue('0.46');
  await user.click(screen.getByRole('tab', { name: 'Notes' }));
  expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue(
    'Keep the baseline measurements.',
  );
  await user.click(screen.getByRole('button', { name: 'Home' }));
  expect(document.querySelector('.home-featured-project h3')).toHaveTextContent('RX90_GAA');
  cleanup();
  render(<App />);
  expect(document.querySelector('.home-featured-project h3')).toHaveTextContent('RX90_GAA');
  await user.click(screen.getByRole('button', { name: 'Open Temperature study' }));
  expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveValue('0.48');
  await user.click(screen.getByRole('tab', { name: 'Notes' }));
  expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue('Sweep 200–400 K.');
  await user.click(screen.getByRole('button', { name: 'Home' }));
  await user.click(screen.getByRole('button', { name: 'All projects' }));
  expect(screen.getByRole('button', { name: 'Open RX90_GAA' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open Temperature study' })).toBeInTheDocument();
});

it('uses project identity in deep links and browser history rather than the last active project', async () => {
  const alpha = templateProject('Alpha', 'Baseline extraction.');
  alpha.notes = 'Alpha notebook';
  const beta = templateProject('Beta', 'Temperature extraction.');
  beta.notes = 'Beta notebook';
  beta.parameters[0] = 0.51;
  localStorage.setItem(
    PROJECTS_KEY,
    JSON.stringify([
      { id: 'alpha', lastOpenedAt: 1, lastTab: 'Notes', snapshot: alpha },
      { id: 'beta', lastOpenedAt: 2, lastTab: 'Model Fit', snapshot: beta },
    ]),
  );
  localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify('beta'));
  localStorage.setItem('mosfit:project', JSON.stringify(beta.project));
  localStorage.setItem('mosfit:notes', JSON.stringify(beta.notes));
  window.history.replaceState(null, '', '/#/project/notes?project=alpha');
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue('Alpha notebook');
  await user.click(screen.getByRole('button', { name: 'Home' }));
  await user.click(screen.getByRole('button', { name: 'Open Beta' }));
  expect(screen.getByRole('slider', { name: 'VTH0' })).toHaveValue('0.51');
  expect(window.location.hash).toBe('#/project/model-fit?project=beta');
  for (let i = 0; i < 2; i++) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        window.addEventListener('popstate', () => resolve(), { once: true });
        window.history.back();
      });
    });
  }
  expect(screen.getByRole('textbox', { name: 'Project notes' })).toHaveValue('Alpha notebook');
  expect(screen.getByRole('heading', { name: 'Alpha', level: 1 })).toBeInTheDocument();
});

it('restores Home with browser history and keeps tool shortcuts and keyboard search usable', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Open RX90_GAA' }));
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true });
      window.history.back();
    });
  });
  expect(screen.getByRole('heading', { name: 'Recently opened' })).toBeInTheDocument();
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true });
      window.history.forward();
    });
  });
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('button', { name: 'Home' }));
  await user.keyboard('{Control>}k{/Control}');
  await user.type(screen.getByRole('textbox', { name: 'Search workspace' }), 'Home');
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: /Home.*Recently opened projects/,
    }),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Measurement library/ }));
  expect(window.location.hash).toBe('#/datasets');
});
