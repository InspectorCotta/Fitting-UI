export type SpiceBlock = {
  id: string;
  kind: 'lib' | 'subckt';
  name: string;
  start: number;
  end: number;
  depth: number;
};

/** Match actual declarations, never library includes, comments, or continuation lines. */
export function findSpiceBlocks(lines: string[]): SpiceBlock[] {
  const stack: Omit<SpiceBlock, 'end' | 'depth'>[] = [];
  const blocks: SpiceBlock[] = [];
  lines.forEach((line, index) => {
    if (/^\s*[*+]/.test(line)) return;
    let quote = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === ';' || char === '$') {
        line = line.slice(0, i);
        break;
      }
    }
    const tokens = line.match(/"[^"]*"|'[^']*'|[^\s]+/g) || [];
    const directive = tokens[0]?.toLowerCase();
    if (directive === '.subckt' && tokens[1]) {
      stack.push({ id: `subckt-${index}`, kind: 'subckt', name: tokens[1], start: index });
    } else if (
      directive === '.lib' &&
      tokens.length === 2 &&
      !/["'\/\\]/.test(tokens[1]) &&
      !/\.(lib|cir|sp)$/i.test(tokens[1])
    ) {
      stack.push({ id: `lib-${index}`, kind: 'lib', name: tokens[1], start: index });
    } else if (directive === '.ends' || directive === '.endl') {
      const top = stack.at(-1);
      const kind = directive === '.ends' ? 'subckt' : 'lib';
      if (
        top?.kind === kind &&
        (!tokens[1] || tokens[1].toLowerCase() === top.name.toLowerCase())
      ) {
        stack.pop();
        blocks.push({ ...top, end: index, depth: 0 });
      }
    }
  });
  blocks.sort((a, b) => a.start - b.start);
  return blocks.map((block) => ({
    ...block,
    depth: blocks.filter((parent) => parent.start < block.start && parent.end > block.end).length,
  }));
}

export function blockAtLine(blocks: SpiceBlock[], line: number) {
  return blocks.filter((block) => block.start <= line && block.end >= line).at(-1);
}
