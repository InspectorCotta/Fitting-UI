import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, Expand, FileCode2, ListTree } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { spiceParameters, tokenizeSpice, type SpiceArtifact } from './spice';
import { blockAtLine, findSpiceBlocks } from './spiceBlocks';

export type SpiceCodeSelection = { parameter: string; request: number };

function SpiceDocument({
  artifact,
  highlight,
  collapsed,
  onCollapsedChange,
  selection,
}: {
  artifact: SpiceArtifact;
  highlight: boolean;
  collapsed: Set<string>;
  onCollapsedChange: (next: Set<string>) => void;
  selection?: SpiceCodeSelection;
}) {
  const paneId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [jump, setJump] = useState<{ line: number; request: number } | null>(null);
  const lines = useMemo(() => artifact.source.trimEnd().split('\n'), [artifact.source]);
  const blocks = useMemo(() => findSpiceBlocks(lines), [lines]);
  function reveal(line: number) {
    onCollapsedChange(
      new Set(
        [...collapsed].filter(
          (id) =>
            !blocks.some((block) => block.id === id && block.start < line && block.end > line),
        ),
      ),
    );
    setActiveBlock(blockAtLine(blocks, line)?.id || null);
    setJump((previous) => ({ line, request: (previous?.request || 0) + 1 }));
  }
  useEffect(() => {
    if (!selection) return;
    const index = lines.findIndex((line) =>
      new RegExp(`^\\.param\\s+${selection.parameter}=`).test(line),
    );
    if (index >= 0) reveal(index);
  }, [selection]);
  useEffect(() => {
    if (jump)
      root.current
        ?.querySelector<HTMLElement>(`[data-line="${jump.line}"]`)
        ?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  }, [jump]);
  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCollapsedChange(next);
    setActiveBlock(id);
  }
  return (
    <div className="spice-document" ref={root}>
      <div className="spice-structure-bar">
        <button
          aria-label="Code structure"
          aria-expanded={outline}
          aria-controls={`${paneId}-outline`}
          onClick={() => setOutline((open) => !open)}
        >
          <ListTree size={13} />
          <span>Structure</span>
          <small>{blocks.length} blocks</small>
          <ChevronDown size={12} />
        </button>
        {collapsed.size > 0 && (
          <button className="spice-expand-all" onClick={() => onCollapsedChange(new Set())}>
            Expand all
          </button>
        )}
      </div>
      <nav
        className="spice-structure-list"
        id={`${paneId}-outline`}
        aria-label="SPICE code blocks"
        hidden={!outline}
      >
        {blocks.map((block) => (
          <button
            key={block.id}
            aria-label={`Go to ${block.kind === 'lib' ? 'library' : 'subcircuit'} ${block.name}, lines ${block.start + 1}–${block.end + 1}`}
            style={{ paddingLeft: 12 + block.depth * 14 }}
            onClick={() => {
              reveal(block.start);
              setActiveBlock(block.id);
            }}
          >
            <span className="spice-structure-kind">{block.kind === 'lib' ? 'LIB' : 'SUBCKT'}</span>
            <strong>{block.name}</strong>
            <small>
              Lines {block.start + 1}–{block.end + 1}
            </small>
          </button>
        ))}
      </nav>
      <pre
        className={`spice-code ${highlight ? 'highlight-fitted' : ''}`}
        id={`${paneId}-code`}
        tabIndex={0}
        aria-label="Full SPICE library"
      >
        <code>
          {lines.map((line, index) => {
            if (
              blocks.some(
                (block) => collapsed.has(block.id) && index > block.start && index < block.end,
              )
            )
              return null;
            const parameter = spiceParameters.find((p) =>
              new RegExp(`^\\.param\\s+${p.name}=`).test(line),
            );
            const opening = blocks.find((block) => block.start === index);
            const closing = blocks.find((block) => block.end === index);
            const scopes = blocks.filter((block) => block.start < index && block.end > index);
            const boundary = opening || closing;
            const folded = opening && collapsed.has(opening.id);
            return (
              <span
                className={`spice-code-line ${boundary ? 'spice-block-boundary' : ''} ${boundary?.id === activeBlock ? 'spice-block-active' : ''}`}
                key={index}
                data-line={index}
                data-fitted={parameter?.name}
                data-block-kind={boundary?.kind}
              >
                <span className="spice-fold-gutter">
                  {opening && opening.end - opening.start > 1 && (
                    <button
                      aria-label={`${folded ? 'Expand' : 'Collapse'} ${opening.kind === 'lib' ? 'library' : 'subcircuit'} ${opening.name}`}
                      aria-expanded={!folded}
                      title={`Lines ${index + 1}–${opening.end + 1}`}
                      onClick={() => toggle(opening.id)}
                    >
                      {folded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </span>
                <span className="spice-line-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="spice-line-text" style={{ paddingLeft: scopes.length * 12 }}>
                  {scopes.map((scope) => (
                    <i
                      key={scope.id}
                      className="spice-scope-guide"
                      aria-hidden="true"
                      style={{ left: scope.depth * 12 + 4 }}
                    />
                  ))}
                  <span className="spice-line-source">
                    {tokenizeSpice(line).map((token, i) => (
                      <span key={i} className={`spice-token-${token.type}`}>
                        {token.text}
                      </span>
                    ))}
                    {line === '' ? ' ' : ''}
                  </span>
                  {folded && (
                    <span className="spice-fold-summary">
                      {opening.end - opening.start - 1} lines folded
                    </span>
                  )}
                </span>
                {parameter ? (
                  <span className="spice-fitted-marker" aria-hidden="true">
                    fitted
                  </span>
                ) : boundary ? (
                  <span className="spice-block-label" aria-hidden="true">
                    {closing ? 'end ' : ''}
                    {boundary.kind === 'lib' ? 'library' : 'subckt'}
                  </span>
                ) : null}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

export function SpiceCode({
  artifact,
  highlight,
  onCopy,
  selection,
}: {
  artifact: SpiceArtifact;
  highlight: boolean;
  onCopy: () => Promise<boolean>;
  selection?: SpiceCodeSelection;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const lines = artifact.source.trimEnd().split('\n');
  const [folded, setFolded] = useState<{ source: string; blocks: Set<string> }>({
    source: artifact.source,
    blocks: new Set(),
  });
  const collapsed = folded.source === artifact.source ? folded.blocks : new Set<string>();
  const changeCollapsed = (blocks: Set<string>) => setFolded({ source: artifact.source, blocks });
  const copy = async () => {
    if (await onCopy()) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    }
  };
  function code() {
    return (
      <SpiceDocument
        artifact={artifact}
        highlight={highlight}
        collapsed={collapsed}
        onCollapsedChange={changeCollapsed}
        selection={selection}
      />
    );
  }
  return (
    <section className="spice-library" aria-label="Exported library source">
      <div className="spice-editor-heading">
        <span>
          <FileCode2 size={16} />
          <strong>{artifact.filename}</strong>
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy library"
            title="Copy library"
            onClick={() => void copy()}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand library"
            title="Expand library"
            onClick={() => setExpanded(true)}
          >
            <Expand size={15} />
          </Button>
        </div>
      </div>
      <div className="spice-editor-legend">
        <span>
          <i />
          Fitted parameter
        </span>
        <span>{lines.length} lines · SPICE · read only</span>
      </div>
      {code()}
      <div className="spice-editor-footer">
        <span>
          {collapsed.size
            ? `${collapsed.size} folded blocks · copy keeps the full file`
            : 'Full file · no folded sections'}
        </span>
        <span>Snapshot {artifact.fingerprint}</span>
      </div>
      <Dialog
        open={expanded}
        onOpenChange={setExpanded}
        title={artifact.filename}
        description="The complete exported library. Highlighted lines contain the fitted parameter values."
        fullscreen
      >
        {expanded && code()}
      </Dialog>
    </section>
  );
}
