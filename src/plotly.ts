import type * as Plotly from 'plotly.js';
let pending: Promise<typeof Plotly> | undefined;
export function loadPlotly(): Promise<typeof Plotly> {
  pending ??= import('plotly.js-basic-dist-min')
    .then((module) => module.default)
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
