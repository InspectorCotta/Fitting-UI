import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParameterTimeline, parameterTimelineValues } from './ParameterTimeline';
afterEach(cleanup);
describe('Parameter value timeline', () => {
  it('keeps chronological returns to old values and skips unchanged snapshots', () => {
    expect(parameterTimelineValues([0.412, 0.412, 0.43, 0.43, 0.412], 0.46)).toEqual([0.412, 0.43, 0.412, 0.46]);
  });
  it('connects chronological entries with a distinct current point and restores a past value', () => {
    const onRestore = vi.fn();
    render(<ParameterTimeline name="VTH0" unit="V" digits={3} history={[0.412, 0.43, 0.412]} value={0.46} onRestore={onRestore} />);
    const list = screen.getByRole('list', { name: 'VTH0 chronological values' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items.map(item => item.textContent)).toEqual(['Start0.412', 'Edit 10.430', 'Edit 20.412', 'Now0.460']);
    expect(screen.getByLabelText('Current VTH0 value 0.460 V')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Restore VTH0 to 0.430 V' }));
    expect(onRestore).toHaveBeenCalledWith(0.43);
  });
  it('shows the actual starting value without inventing a baseline edit', () => {
    render(<ParameterTimeline name="U0" unit="cm²/Vs" digits={0} history={[]} value={350} onRestore={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByLabelText('Current U0 value 350 cm²/Vs')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Your next adjustment adds a point to the timeline.')).toBeVisible();
  });
});
