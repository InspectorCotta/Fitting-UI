import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FitActivity } from './FitActivity';

afterEach(cleanup);
const props = { progress: 0, iterations: 500, name: 'Silicon fit', algorithm: 'TRF', temperature: 300, onStop: vi.fn() };

describe('fit activity', () => {
  it('tracks solver progress and stages without resetting the scene or collapse preference', () => {
    const { rerender } = render(<FitActivity {...props} />);
    const artwork = document.querySelector('.silicon-scene svg');
    expect(screen.getByRole('progressbar', { name: 'Fit progress' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Waking up the silicon.')).toBeVisible();
    rerender(<FitActivity {...props} progress={52} />);
    expect(document.querySelector('.silicon-scene svg')).toBe(artwork);
    expect(screen.getByText('A little less resistance.')).toBeVisible();
    expect(screen.getByText('260')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse fit animation' }));
    rerender(<FitActivity {...props} progress={90} />);
    expect(screen.getByRole('button', { name: 'Expand fit animation' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Expand fit animation' }));
    expect(screen.getByText('Finding that sweet spot.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Stop run' }));
    expect(props.onStop).toHaveBeenCalledOnce();
  });
  it('keeps progress and stopping accessible in its compact form', () => {
    render(<FitActivity {...props} progress={45} compact />);
    expect(screen.getByRole('button', { name: 'Expand fit animation' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
    expect(screen.getByRole('button', { name: 'Stop run' })).toBeVisible();
  });
});
