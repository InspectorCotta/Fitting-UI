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
    return <ParameterDial parameter={initialParameters[0]} value={value} onBegin={onBegin} onChange={setValue} onCommit={onCommit} />;
  }
  render(<Harness />);
  return { dial: screen.getByRole('slider', { name: 'VTH0' }), input: screen.getByRole('spinbutton'), onBegin, onCommit };
}
describe('Parameter dial', () => {
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
