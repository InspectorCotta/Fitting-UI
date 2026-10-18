import type { Data, Layout } from 'plotly.js';
import { curveExponent } from './data';

export type PlotKind = 'transfer' | 'output' | 'capacitance';
export type CurveSamples = {
  name: string;
  x: number[];
  measured: number[];
  modelX: number[];
  modelY: number[];
};
export type ChartView = {
  scale: 'log' | 'linear';
  hidden: number[];
  xRange?: [number, number];
  yRange?: [number, number];
};
export const plotKinds: PlotKind[] = ['transfer', 'output', 'capacitance'];
export const plotInfo = {
  transfer: {
    short: 'Transfer',
    title: 'Transfer Characteristics (Ids–Vgs)',
    subtitle: 'GAA nanosheet · Vds sweep · 300 K',
    x: 'Vgs [V]',
    y: 'Ids [A/µm]',
    unit: 'A/µm',
    domain: [-0.45, 0.8] as [number, number],
    series: ['Vds = 0.7 V', 'Vds = 0.3 V', 'Vds = 0.1 V', 'Vds = 0.05 V'],
  },
  output: {
    short: 'Output',
    title: 'Output Characteristics (Ids–Vds)',
    subtitle: 'GAA nanosheet · Vgs sweep · 300 K',
    x: 'Vds [V]',
    y: 'Ids [mA/µm]',
    unit: 'mA/µm',
    domain: [0, 0.8] as [number, number],
    series: ['Vgs = 0.7 V', 'Vgs = 0.6 V', 'Vgs = 0.5 V', 'Vgs = 0.4 V'],
  },
  capacitance: {
    short: 'Capacitance',
    title: 'Capacitance Characteristics (C–V)',
    subtitle: 'GAA nanosheet · Vds = 0.05 V · 1 MHz · 300 K',
    x: 'Vgs [V]',
    y: 'C [fF/µm]',
    unit: 'fF/µm',
    domain: [-0.45, 0.8] as [number, number],
    series: ['Cgg', 'Cgs', 'Cgd'],
  },
};
export const defaultChartView = (kind: PlotKind): ChartView => ({
  scale: kind === 'transfer' ? 'log' : 'linear',
  hidden: [],
});

export function sampleCurve(kind: PlotKind, voltage: number, series: number, shift = 0) {
  if (kind === 'transfer') return 10 ** curveExponent(voltage, series, shift);
  if (kind === 'output')
    return Math.max(
      0,
      (1 - Math.exp(-7 * Math.max(voltage, 0))) *
        (0.85 - series * 0.18) *
        (1 - shift * 2) *
        (1 + 0.06 * voltage),
    );
  const inversion = 1 / (1 + Math.exp(-8 * (voltage - 0.08 - shift)));
  const total = 0.28 + 1.15 * inversion;
  const drain = 0.18 - 0.07 * inversion;
  return series === 0 ? total : series === 1 ? total - drain : drain;
}

export function plotPalette(theme: string) {
  return theme === 'white'
    ? {
        bg: '#ffffff',
        grid: '#e5e9f0',
        text: '#58667c',
        axis: '#98a3b5',
        tooltip: '#f3f5f8',
        colors: ['#07887d', '#3766cb', '#9945c8', '#b66b14'],
      }
    : {
        bg: '#000000',
        grid: '#1b1d22',
        text: '#93979f',
        axis: '#555961',
        tooltip: '#12151b',
        colors: ['#53e5ce', '#729bff', '#b277f5', '#f5a552'],
      };
}

export function createFigure(
  kind: PlotKind,
  shift: number,
  view: ChartView,
  theme: string,
  samples?: CurveSamples[],
): { data: Data[]; layout: Partial<Layout> } {
  const info = plotInfo[kind],
    palette = plotPalette(theme);
  const domain = info.domain;
  const x = Array.from({ length: 101 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 100);
  const measuredX = Array.from(
    { length: 29 },
    (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 28,
  );
  const data: Data[] = info.series.flatMap((name, i) => {
    const common = {
      type: 'scatter' as const,
      name,
      legendgroup: String(i),
      visible: !view.hidden.includes(i),
      showlegend: false,
      hoverinfo: 'none' as const,
    };
    return [
      {
        ...common,
        uid: `${kind}-${i}-fit`,
        x: samples?.[i]?.modelX || x,
        y: samples?.[i]?.modelY || x.map((v) => sampleCurve(kind, v, i, shift)),
        mode: 'lines' as const,
        line: { color: palette.colors[i], width: 1.8 },
      },
      {
        ...common,
        uid: `${kind}-${i}-measured`,
        x: samples?.[i]?.x || measuredX,
        y:
          samples?.[i]?.measured ||
          measuredX.map((v) => sampleCurve(kind, v, i) * (1 + Math.sin(v * 29 + i * 3) * 0.025)),
        mode: 'markers' as const,
        marker: { color: palette.colors[i], size: 5, symbol: 'circle-open', line: { width: 1.2 } },
      },
    ];
  });
  const log = view.scale === 'log';
  const defaultY: [number, number] = log
    ? kind === 'transfer'
      ? [-11, -3]
      : kind === 'output'
        ? [-5, 0]
        : [-2, 1]
    : kind === 'transfer'
      ? [0, 0.0004]
      : kind === 'output'
        ? [0, 1]
        : [0, 1.6];
  const axis = {
    color: palette.text,
    gridcolor: palette.grid,
    linecolor: palette.axis,
    linewidth: 1,
    showline: true,
    zeroline: false,
    ticks: 'outside' as const,
    tickcolor: palette.axis,
    tickfont: { size: 10 },
    automargin: true,
    showspikes: false,
  };
  return {
    data,
    layout: {
      autosize: true,
      paper_bgcolor: palette.bg,
      plot_bgcolor: palette.bg,
      font: { family: 'Inter, Segoe UI, Arial, sans-serif', color: palette.text, size: 11 },
      margin: { l: 61, r: 16, t: 18, b: 48 },
      xaxis: {
        ...axis,
        title: { text: info.x, standoff: 12, font: { size: 11 } },
        range: view.xRange || domain,
        autorange: false,
        nticks: 7,
        tickformat: '.4~g',
      },
      yaxis: {
        ...axis,
        title: { text: info.y, standoff: 8, font: { size: 11 } },
        type: log ? 'log' : 'linear',
        range: view.yRange || defaultY,
        autorange: false,
        exponentformat: 'power',
        tickformat: log ? undefined : kind === 'transfer' ? '.1e' : '.1f',
        nticks: 5,
      },
      hovermode: 'closest',
      hoverdistance: 16,
      hoverlabel: {
        bgcolor: palette.tooltip,
        bordercolor: palette.axis,
        font: { color: palette.text, size: 10 },
      },
      dragmode: 'pan',
      showlegend: false,
      uirevision: `${kind}:${JSON.stringify(view)}`,
      modebar: { bgcolor: palette.bg, color: palette.text, activecolor: palette.colors[0] },
    },
  };
}
