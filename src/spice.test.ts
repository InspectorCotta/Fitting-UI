import { describe, expect, it } from 'vitest';
import { initialDatasets, initialParameters } from './data';
import { plotKinds } from './plotData';
import {
  compareSpiceArtifact,
  defaultModelName,
  generateSpice,
  parseSpiceValues,
  tokenizeSpice,
} from './spice';

const baseline = initialParameters.map((p) => p.value);
describe('SPICE export round trip', () => {
  it('exports a complete behavioral library and reads back SI values with rounding', () => {
    const values = [0.412345678, 333.333333, 1.123456789, 245.123456, 0.065123456];
    const artifact = generateSpice(defaultModelName('Test fit / 3nm'), values, 6);
    expect(artifact.filename).toBe('mf_test_fit___3nm.lib');
    expect(artifact.source).toContain('.lib MOSFIT_DEMO');
    expect(artifact.source).toContain('.subckt MF_Test_fit___3nm D G S B');
    expect(artifact.source).toContain('.ends MF_Test_fit___3nm\n.endl MOSFIT_DEMO');
    const exported = parseSpiceValues(artifact.source);
    expect(exported[0]).toBeCloseTo(0.412346, 9);
    expect(exported[1]).toBe(333.333);
    expect(exported[2]).toBeCloseTo(1.12346, 8);
    expect(exported).not.toEqual(values);
    const suffixed = artifact.source.replace(/^\.param TOX=.+$/m, '.param TOX=1.1n');
    expect(parseSpiceValues(suffixed)[2]).toBeCloseTo(1.1);
  });
  it('uses the exported numeric values rather than the in-memory fit to compute independent comparisons', () => {
    const artifact = generateSpice('MF_TEST', baseline, 9);
    for (const kind of plotKinds) {
      const result = compareSpiceArtifact(artifact, kind, initialDatasets)!;
      expect(result.passed).toBe(true);
      expect(result.rms).toBeGreaterThan(0);
      expect(result.max).toBeLessThan(3);
      expect(result.points).toBe(kind === 'capacitance' ? 87 : 116);
    }
    const original = compareSpiceArtifact(artifact, 'transfer', initialDatasets)!;
    const changed = compareSpiceArtifact(
      { ...artifact, source: artifact.source.replace('.param VTH0=0.412', '.param VTH0=0.55') },
      'transfer',
      initialDatasets,
    )!;
    expect(changed.passed).toBe(false);
    expect(changed.rms).toBeGreaterThan(original.rms);
    expect(changed.series[0].modelY).not.toEqual(original.series[0].modelY);
    expect(changed.series[0].measured).toEqual(original.series[0].measured);
  });
  it('rejects incomplete or ambiguous exports and does not treat imported data as a bundled reference', () => {
    const artifact = generateSpice('MF_TEST', baseline, 9);
    expect(() => generateSpice('Bad name\n.end', baseline, 9)).toThrow('letter first');
    expect(() => parseSpiceValues(artifact.source.replace('.endl MOSFIT_DEMO', ''))).toThrow(
      'incomplete',
    );
    expect(() => parseSpiceValues(artifact.source + '\n.param VTH0=0.4\n')).toThrow(
      'one exported value',
    );
    expect(() =>
      parseSpiceValues(artifact.source.replace('.param VTH0=0.412', '.param VTH0=Infinity')),
    ).toThrow('Invalid SPICE number');
    expect(
      compareSpiceArtifact(artifact, 'transfer', [{ ...initialDatasets[0], file: 'import.csv' }]),
    ).toBeNull();
  });
  it('preserves every source character while distinguishing comments, directives and numbers', () => {
    for (const line of generateSpice('MF_TEST', baseline, 9).source.split('\n')) {
      expect(
        tokenizeSpice(line)
          .map((token) => token.text)
          .join(''),
      ).toBe(line);
    }
    expect(tokenizeSpice('.param TOX=1.1e-9')).toEqual(
      expect.arrayContaining([
        { text: '.param', type: 'directive' },
        { text: '1.1e-9', type: 'number' },
      ]),
    );
    expect(tokenizeSpice('* VTH0=0.412')).toEqual([{ text: '* VTH0=0.412', type: 'comment' }]);
  });
});
