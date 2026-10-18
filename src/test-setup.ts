import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
// Browser APIs used by the accessible select's pointer and focus management.
window.PointerEvent = MouseEvent as typeof PointerEvent;
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
// Exercise our data, lifecycle and interactions without a browser rendering engine.
vi.mock('./plotly', () => {
  const api = {
    react: vi.fn(async (element: HTMLElement, data: unknown, layout: unknown) =>
      Object.assign(element, {
        plotlyTestFigure: { data, layout },
        on: (name: string, callback: (event: unknown) => void) => {
          element.addEventListener(`test-${name}`, (event) =>
            callback((event as CustomEvent).detail),
          );
          return element;
        },
      }),
    ),
    purge: vi.fn(),
    Plots: { resize: vi.fn(async () => {}) },
    downloadImage: vi.fn(async () => ''),
  };
  return { loadPlotly: vi.fn(async () => api) };
});
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
