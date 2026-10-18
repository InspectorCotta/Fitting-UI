import { describe, expect, it } from 'vitest';
import { blockAtLine, findSpiceBlocks } from './spiceBlocks';

describe('SPICE block boundaries', () => {
  it('matches nested subcircuits and libraries, preserving original line numbers and nesting', () => {
    const lines = [
      '* .subckt COMMENTED A B',
      '.lib "external.lib" TT',
      '.LIB TT',
      '.SUBCKT OUTER D G S B',
      '.subckt INNER A B',
      'R1 A B 1k',
      '.ENDS inner; end child',
      'X1 D G INNER',
      '.ends OUTER',
      '.subckt NEXT A B',
      'R2 A B 1k',
      '.ends',
      '.endl tt',
    ];
    const blocks = findSpiceBlocks(lines);
    expect(
      blocks.map(({ kind, name, start, end, depth }) => ({ kind, name, start, end, depth })),
    ).toEqual([
      { kind: 'lib', name: 'TT', start: 2, end: 12, depth: 0 },
      { kind: 'subckt', name: 'OUTER', start: 3, end: 8, depth: 1 },
      { kind: 'subckt', name: 'INNER', start: 4, end: 6, depth: 2 },
      { kind: 'subckt', name: 'NEXT', start: 9, end: 11, depth: 1 },
    ]);
    expect(blockAtLine(blocks, 5)?.name).toBe('INNER');
    expect(blockAtLine(blocks, 7)?.name).toBe('OUTER');
    expect(blockAtLine(blocks, 0)).toBeUndefined();
  });
  it('ignores comments, include directives and continuations rather than creating false blocks', () => {
    expect(
      findSpiceBlocks([
        '.lib "models;special.lib" TT',
        '.lib external.lib',
        ".lib 'file.lib'",
        '* .lib COMMENT',
        '+ .subckt not_a_block',
        '; .subckt not_a_block',
        '.func value(x) {x}',
        '.ends',
        '.endl',
      ]),
    ).toEqual([]);
  });
  it('leaves unmatched or mismatched declarations unfolded', () => {
    expect(findSpiceBlocks(['.subckt OPEN A B', 'R1 A B 1k'])).toEqual([]);
    expect(findSpiceBlocks(['.subckt FIRST A B', '.ends OTHER'])).toEqual([]);
    const blocks = findSpiceBlocks([
      '.subckt SAME A B',
      '.ends SAME',
      '.subckt SAME A B',
      '.ends SAME',
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).not.toBe(blocks[1].id);
  });
});
