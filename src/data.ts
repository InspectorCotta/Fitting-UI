export const tabs = [
  'Overview',
  'Datasets',
  'Experiments',
  'Model Fit',
  'Compare Fits',
  'Parameter Trends',
  'Correlation Matrix',
  'SPICE Export',
  'Notes',
] as const;
export type Tab = (typeof tabs)[number];
export const colors = ['var(--curve-0)', 'var(--curve-1)', 'var(--curve-2)', 'var(--curve-3)'];
export const biases = ['0.7', '0.3', '0.1', '0.05'];
export const initialParameters = [
  {
    name: 'VTH0',
    label: 'Threshold voltage',
    value: 0.412,
    min: 0.25,
    max: 0.6,
    step: 0.001,
    unit: 'V',
    sensitivity: 0.28,
  },
  {
    name: 'U0',
    label: 'Low-field mobility',
    value: 320,
    min: 150,
    max: 500,
    step: 1,
    unit: 'cm²/Vs',
    sensitivity: 0.24,
  },
  {
    name: 'TOX',
    label: 'Oxide thickness',
    value: 1.1,
    min: 0.5,
    max: 2,
    step: 0.01,
    unit: 'nm',
    sensitivity: 0.18,
  },
  {
    name: 'RDSW',
    label: 'Parasitic resistance',
    value: 245,
    min: 100,
    max: 400,
    step: 1,
    unit: 'Ω·µm',
    sensitivity: 0.11,
  },
  {
    name: 'ETA0',
    label: 'DIBL coefficient',
    value: 0.065,
    min: 0.01,
    max: 0.15,
    step: 0.001,
    unit: '',
    sensitivity: 0.09,
  },
];
export const initialDatasets = [
  {
    id: 'DS-001',
    name: 'Ids–Vgs (multi-bias)',
    type: 'Transfer',
    curves: 1200,
    points: '61,200',
    color: colors[0],
    temperature: '300 K',
    file: 'rx90_transfer_300K.csv',
  },
  {
    id: 'DS-002',
    name: 'Ids–Vds (output)',
    type: 'Output',
    curves: 800,
    points: '40,800',
    color: colors[1],
    temperature: '300 K',
    file: 'rx90_output_300K.csv',
  },
  {
    id: 'DS-003',
    name: 'Cgg / Cgd / Cgs (RF)',
    type: 'Capacitance',
    curves: 150,
    points: '7,650',
    color: colors[2],
    temperature: '300 K',
    file: 'rx90_capacitance_300K.csv',
  },
];
export type Dataset = (typeof initialDatasets)[number];
export type Experiment = {
  id: string;
  name: string;
  status: 'Completed' | 'Running';
  error: number;
  date: string;
  iterations: number;
  temperature: number;
};
export const initialExperiments: Experiment[] = [
  {
    id: 'EXP-1023',
    name: 'Full DC sweep',
    status: 'Completed',
    error: 8.7,
    date: '2 hours ago',
    iterations: 240,
    temperature: 300,
  },
  {
    id: 'EXP-1022',
    name: 'Mobility refinement',
    status: 'Completed',
    error: 10.2,
    date: 'Yesterday',
    iterations: 180,
    temperature: 300,
  },
  {
    id: 'EXP-1021',
    name: 'Threshold extraction',
    status: 'Completed',
    error: 12.1,
    date: 'Yesterday',
    iterations: 120,
    temperature: 300,
  },
  {
    id: 'EXP-1020',
    name: 'Initial baseline',
    status: 'Completed',
    error: 16.8,
    date: 'Oct 14, 2026',
    iterations: 100,
    temperature: 300,
  },
];
export function curveExponent(x: number, i: number, shift = 0) {
  return -11.1 + (7.5 - i * 0.85) / (1 + Math.exp(-6.5 * (x + 0.105 - shift)));
}
