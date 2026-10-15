import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', '..', 'index.css'), 'utf8');
const queue = readFileSync(join(here, 'GroupsQueue.tsx'), 'utf8');

function block(marker: string): string {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`"${marker}" not found in index.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open + 1, close);
}

describe('slice 12c review display', () => {
  it('keeps the AI tagging banner as one paragraph', () => {
    const rule = block('.notice--ai {');
    expect(rule).toContain('display: block');
  });

  it('stacks the convenio table full width above the detail', () => {
    const pane = block('.groups-queue.two-pane {');
    expect(pane).toContain('flex-direction: column');
    expect(pane).not.toContain('grid-template-columns');
    expect(pane).not.toContain('minmax(16rem');

    const columns = block('.groups-queue .pane-list .table th:not(:first-child)');
    expect(columns).toContain('white-space: nowrap');

    const detail = block('.groups-queue .pane-detail {');
    expect(detail).toContain('background: var(--canvas)');
    expect(detail).not.toContain('max-height');
    expect(detail).not.toContain('overflow:');

    const selected = block('.groups-queue .table tbody tr.selected {');
    expect(selected).toContain('background:');

    expect(queue).toContain("className={selected === c.id ? 'selected' : ''}");
    expect(queue).toContain('scrollIntoView');
    expect(queue).toContain('tree?.convenio.id !== selected');

    const head = block('.groups-queue .node-head {');
    expect(head).toContain('display: flex');
    expect(head).toContain('gap:');
  });
});
