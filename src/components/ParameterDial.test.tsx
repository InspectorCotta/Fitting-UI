import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ParameterDial } from './ParameterDial';
import { initialParameters } from '../data';
afterEach(cleanup);
function setup() {
  const onBegin = vi.fn(), onCommit = vi.fn();
  function Harness() {
    const [value, setValue] = useState(0.412);
    const [expanded, setExpanded] = useState(false);
    return <ParameterDial expanded={expanded} onToggle={() => setExpanded(v => !v)} parameter={initialParameters[0]} value={value} onBegin={onBegin} onChange={setValue} onCommit={onCommit} />;
  }
  render(<Harness />);
  return { dial: screen.getByRole('slider', { name: 'VTH0' }), input: screen.getByRole('spinbutton'), onBegin, onCommit };
}
describe('Parameter dial', () => {
  it('expands without changing the value, exposes metadata, and collapses with Escape', () => {
    const { dial, input, onBegin, onCommit } = setup();
    const toggle = screen.getByRole('button', { name: 'Expand VTH0 details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'VTH0 details' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'VTH0 details' })).toBeInTheDocument();
    expect(screen.getByText('Reference sensitivity')).toBeVisible();
    expect(screen.getByText('0.28')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset VTH0 to baseline' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'VTH0' })).toBe(dial);
    expect(screen.getByRole('spinbutton')).toBe(input);
    expect(onBegin).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(toggle, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
  it('updates continuously through a captured drag and commits once', () => {
    const { dial, onBegin, onCommit } = setup();
    fireEvent.pointerDown(dial, { button: 0, clientY: 200 });
    fireEvent.pointerMove(dial, { clientY: 152 });
    expect(dial).toHaveAttribute('aria-valuenow', '0.482');
    expect(screen.getByRole('spinbutton')).toHaveValue(0.482);
    fireEvent.pointerUp(dial); fireEvent.lostPointerCapture(dial);
    expect(onBegin).toHaveBeenCalledTimes(1); expect(onCommit).toHaveBeenCalledTimes(1);
  });
  it('uses Shift for finer dragging and respects bounds', () => {
    const { dial } = setup();
    fireEvent.pointerDown(dial, { button: 0, clientY: 200 });
    fireEvent.pointerMove(dial, { clientY: 152, shiftKey: true });
    expect(dial).toHaveAttribute('aria-valuenow', '0.419');
    fireEvent.pointerMove(dial, { clientY: -2000 });
    expect(dial).toHaveAttribute('aria-valuenow', '0.6');
    fireEvent.pointerCancel(dial);
  });
  it('supports keyboard steps, endpoints, and baseline reset', () => {
    const { dial, onCommit } = setup();
    fireEvent.keyDown(dial, { key: 'ArrowUp' }); fireEvent.keyUp(dial);
    expect(dial).toHaveAttribute('aria-valuenow', '0.413');
    fireEvent.keyDown(dial, { key: 'Home' }); fireEvent.keyUp(dial);
    expect(dial).toHaveAttribute('aria-valuenow', '0.25');
    fireEvent.keyDown(dial, { key: 'End' }); fireEvent.keyUp(dial);
    expect(dial).toHaveAttribute('aria-valuenow', '0.6');
    fireEvent.doubleClick(dial);
    expect(dial).toHaveAttribute('aria-valuenow', '0.412');
    expect(onCommit).toHaveBeenCalledTimes(4);
  });
  it('accepts exact values and restores an invalid draft on blur', () => {
    const { input, dial } = setup();
    fireEvent.focus(input); fireEvent.change(input, { target: { value: '.49' } });
    expect(dial).toHaveAttribute('aria-valuenow', '0.49');
    fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input);
    expect(input).toHaveValue(0.49);
  });
});
