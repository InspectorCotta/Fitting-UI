import { initialDatasets, initialParameters, type Dataset } from './data';
import { plotInfo, sampleCurve, type PlotKind } from './plotData';

export type SpiceArtifact = {
  source: string;
  filename: string;
  modelName: string;
  fingerprint: string;
};
export type ComparisonSeries = {
  name: string;
  x: number[];
  simulated: number[];
  measured: number[];
  modelX: number[];
  modelY: number[];
};
export type SpiceComparison = {
  kind: PlotKind;
  dataset: string;
  points: number;
  rms: number;
  max: number;
  passed: boolean;
  series: ComparisonSeries[];
};
export const spiceParameters = initialParameters.map((p) => ({
  ...p,
  exportScale: p.name === 'TOX' ? 1e-9 : 1,
}));
export const validModelName = (value: string) => /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(value);
export const defaultModelName = (project: string) =>
  `MF_${project.replace(/[^A-Za-z0-9_]/g, '_')}`.slice(0, 48);
export function fingerprint(source: string) {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Full behavioral demonstration library; this is intentionally not a BSIM-CMG implementation. */
export function generateSpice(
  modelName: string,
  values: number[],
  precision: number,
): SpiceArtifact {
  if (!validModelName(modelName))
    throw new Error(
      'Use a letter first, then letters, numbers, or underscores (48 characters max).',
    );
  if (![6, 9, 12].includes(precision)) throw new Error('Choose a supported export precision.');
  if (values.length !== spiceParameters.length || !values.every(Number.isFinite))
    throw new Error('The fitted parameter values are incomplete.');
  if (values.some((value, i) => value < spiceParameters[i].min || value > spiceParameters[i].max))
    throw new Error('A fitted parameter is outside the supported demo range.');
  const format = (value: number) => Number(value.toPrecision(precision)).toString();
  const source = [
    '* MOSFit Studio | behavioral SPICE demonstration library',
    `* Numeric precision: ${precision} significant digits`,
    '* Not a production BSIM-CMG model. No external solver has verified this file.',
    '* DC and charge surrogates reproduce the demo sweep families at 300 K.',
    '* DEMO_OUTPUT=0: transfer surrogate; =1: output surrogate.',
    '* These separate sweep modes are illustrative, not one predictive device model.',
    '* Pin order: D G S B | W_UM: normalized device width in micrometers',
    '',
    '.lib MOSFIT_DEMO',
    `.subckt ${modelName} D G S B params: W_UM=1 DEMO_OUTPUT=0`,
    '',
    '* Fitted values from the current project',
    '* VTH0 [V], U0 [cm^2/Vs], TOX [m], RDSW [ohm.um], ETA0 [-]',
    ...spiceParameters.map((p, i) => `.param ${p.name}=${format(values[i] * p.exportScale)}`),
    '',
    '* Fixed reference values and parameter-to-surrogate mapping',
    '.param VTH_REF=0.412 U0_REF=320 TOX_REF=1.1n',
    '.param RDSW_REF=245 ETA_REF=0.065',
    '.param SHIFT={(VTH0-VTH_REF)*1.5+(U0_REF-U0)/5500',
    '+ (TOX/1n-TOX_REF/1n)*0.045+(RDSW-RDSW_REF)/15000',
    '+ (ETA0-ETA_REF)*0.15}',
    '',
    '* Transfer: four drain biases (0.7, 0.3, 0.1, 0.05 V)',
    '.func bidx(vd) {vd>0.3 ? (0.7-vd)/0.4 :',
    '+ (vd>0.1 ? 1+(0.3-vd)/0.2 : 2+(0.1-vd)/0.05)}',
    '.func itr(vg,vd) {10^(-11.1+(7.5-bidx(vd)*0.85)',
    '+ /(1+exp(-6.5*(vg+0.105-SHIFT))))}',
    '',
    '* Output: four gate biases (0.7, 0.6, 0.5, 0.4 V)',
    '.func iout(vg,vd) {max(0,(1-exp(-7*max(vd,0)))',
    '+ *(0.85-((0.7-vg)/0.1)*0.18)*(1-SHIFT*2)',
    '+ *(1+0.06*vd))*1m}',
    'BIDS D S I={W_UM*(DEMO_OUTPUT<0.5 ? itr(V(G,S),abs(V(D,S)))',
    '+ : iout(V(G,S),V(D,S)))}',
    '',
    '* Charge-based capacitance surrogates',
    '.func softgate(vg) {ln(1+exp(8*(vg-0.08-SHIFT)))/8}',
    "CGS G S Q='W_UM*1f*(0.1*V(G,S)+1.22*softgate(V(G,S)))'",
    "CGD G D Q='W_UM*1f*(0.18*V(G,D)-0.07*softgate(V(G,D)))'",
    '* Body reference provides a DC path for the illustrative four-pin wrapper.',
    'RBODY B S 1g',
    '',
    `.ends ${modelName}`,
    '.endl MOSFIT_DEMO',
    '',
    '* Example testbench usage (outside this library):',
    `* .lib "${modelName.toLowerCase()}.lib" MOSFIT_DEMO`,
    `* XDUT D G 0 0 ${modelName} W_UM=1 DEMO_OUTPUT=0`,
    '* VDS D 0 DC 0.7',
    '* VGS G 0 DC 0',
    '* .temp 26.85',
    '* .dc VGS -0.45 0.8 0.01',
    '* .end',
    '',
  ].join('\n');
  return {
    source,
    filename: `${modelName.toLowerCase()}.lib`,
    modelName,
    fingerprint: fingerprint(source),
  };
}

export function parseSpiceValues(source: string): number[] {
  if (!/^\.lib MOSFIT_DEMO$/m.test(source) || !/^\.endl MOSFIT_DEMO$/m.test(source))
    throw new Error('The exported library section is incomplete.');
  const suffix: Record<string, number> = {
    f: 1e-15,
    p: 1e-12,
    n: 1e-9,
    u: 1e-6,
    m: 1e-3,
    k: 1e3,
    meg: 1e6,
    g: 1e9,
    t: 1e12,
  };
  return spiceParameters.map((p) => {
    const matches = [
      ...source.matchAll(new RegExp(`^\\.param\\s+${p.name}\\s*=\\s*([^\\s]+)\\s*$`, 'gmi')),
    ];
    if (matches.length !== 1) throw new Error(`Expected one exported value for ${p.name}.`);
    const number = matches[0][1].match(
      /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(meg|[fpnumkgt])?$/i,
    );
    if (!number) throw new Error(`Invalid SPICE number for ${p.name}.`);
    const value =
      (Number(number[1]) * (number[2] ? suffix[number[2].toLowerCase()] : 1)) / p.exportScale;
    const parameter = initialParameters.find((item) => item.name === p.name)!;
    if (!Number.isFinite(value) || value < parameter.min - 1e-9 || value > parameter.max + 1e-9)
      throw new Error(`${p.name} is outside the supported demo range.`);
    return value;
  });
}

/** Replays numeric exports, not SPICE syntax. The UI identifies this as a browser demo runner. */
export function exportedDemoSample(kind: PlotKind, x: number, series: number, values: number[]) {
  const shift =
    (values[0] - 0.412) * 1.5 +
    (320 - values[1]) / 5500 +
    (values[2] - 1.1) * 0.045 +
    (values[3] - 245) / 15000 +
    (values[4] - 0.065) * 0.15;
  if (kind === 'transfer')
    return 10 ** (-11.1 + (7.5 - series * 0.85) / (1 + Math.exp(-6.5 * (x + 0.105 - shift))));
  if (kind === 'output')
    return Math.max(
      0,
      (1 - Math.exp(-7 * Math.max(x, 0))) *
        (0.85 - series * 0.18) *
        (1 - shift * 2) *
        (1 + 0.06 * x),
    );
  const inversion = 1 / (1 + Math.exp(-8 * (x - 0.08 - shift)));
  return series === 0
    ? 0.28 + 1.15 * inversion
    : series === 1
      ? 0.1 + 1.22 * inversion
      : 0.18 - 0.07 * inversion;
}

const measurementTypes: Record<PlotKind, string> = {
  transfer: 'Transfer',
  output: 'Output',
  capacitance: 'Capacitance',
};
export function compareSpiceArtifact(
  artifact: SpiceArtifact,
  kind: PlotKind,
  datasets: Dataset[],
): SpiceComparison | null {
  const reference = initialDatasets.find((d) => d.type === measurementTypes[kind])!;
  const dataset = datasets.find(
    (d) =>
      d.type === reference.type &&
      d.id === reference.id &&
      d.file === reference.file &&
      d.temperature === '300 K',
  );
  if (!dataset) return null;
  const values = parseSpiceValues(artifact.source),
    info = plotInfo[kind];
  const positions = (count: number) =>
    Array.from(
      { length: count },
      (_, i) => info.domain[0] + ((info.domain[1] - info.domain[0]) * i) / (count - 1),
    );
  const series = info.series.map((name, index) => {
    const x = positions(29),
      modelX = positions(101);
    return {
      name,
      x,
      measured: x.map(
        (v) => sampleCurve(kind, v, index) * (1 + Math.sin(v * 29 + index * 3) * 0.025),
      ),
      simulated: x.map((v) => exportedDemoSample(kind, v, index, values)),
      modelX,
      modelY: modelX.map((v) => exportedDemoSample(kind, v, index, values)),
    };
  });
  const errors = series.flatMap((s) => {
    const floor = Math.max(...s.measured.map(Math.abs)) * 1e-6;
    return s.measured.map(
      (measured, i) => Math.abs(s.simulated[i] - measured) / Math.max(Math.abs(measured), floor),
    );
  });
  const rms = 100 * Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length);
  const max = 100 * Math.max(...errors);
  return {
    kind,
    dataset: dataset.name,
    points: errors.length,
    rms,
    max,
    passed: rms <= 10 && max <= 15,
    series,
  };
}

export type SpiceToken = {
  text: string;
  type: 'comment' | 'directive' | 'number' | 'identifier' | 'plain';
};
export function tokenizeSpice(line: string): SpiceToken[] {
  if (/^\s*\*/.test(line)) return [{ text: line, type: 'comment' }];
  return [
    ...line.matchAll(
      /(\.[A-Za-z]+\b)|([A-Za-z_][A-Za-z0-9_]*)|((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:meg|[fpnumkgt])?\b)|([^\w.]+|.)/g,
    ),
  ].map((m) => ({
    text: m[0],
    type: m[1] ? 'directive' : m[2] ? 'identifier' : m[3] ? 'number' : 'plain',
  }));
}
