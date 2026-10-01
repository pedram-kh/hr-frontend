// Sprint 12b item 4 (plan.md §3) — the grey-well / white-card drawer styling.
//
// jsdom does not apply index.css, so the visual contract is guarded here by
// reading the stylesheet itself: (1) the new tokens exist in BOTH themes,
// (2) the contrast pairs the plan's §3.4 table promises still hold for the
// values actually shipped (a future token tweak that breaks AA fails here), and
// (3) the rules that protect existing meaning (the ADR-0020 fuchsia border, the
// Grafo exemption) are still in the stylesheet.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'), 'utf8');

function block(startMarker: string): string {
  const start = css.indexOf(startMarker);
  if (start < 0) throw new Error(`"${startMarker}" not found in index.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open + 1, close);
}

const light = block(':root {');
const dark = block("[data-theme='dark'] {");

function token(scope: string, name: string, fallbackScope?: string): string {
  const re = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`);
  const m = scope.match(re) ?? fallbackScope?.match(re);
  if (!m) throw new Error(`--${name} (hex) not found`);
  return m[1];
}

function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('panel tokens exist in both themes', () => {
  it('light', () => {
    expect(token(light, 'panel-canvas')).toBe('#eeefed');
    expect(token(light, 'panel-card-border')).toBe('#bebebd');
    expect(light).toMatch(/--panel-card-radius:\s*var\(--radius-md\)/);
    expect(light).toMatch(/--panel-card-gap:\s*var\(--space-3\)/);
    expect(light).toMatch(/--panel-card-pad:\s*var\(--space-4\)/);
  });
  it('dark overrides canvas and border (radius/gap/pad are theme-independent)', () => {
    expect(token(dark, 'panel-canvas')).toBe('#0b2120');
    expect(token(dark, 'panel-card-border')).toBe('#3a6563');
  });
});

// Text that can sit directly on the canvas (loose notices/paragraphs) or on a
// card. Every semantic text colour must clear AA-normal on BOTH. `text-faint`
// is deliberately absent: it is a pre-existing caption colour that was never AA
// (3.61:1 on white in light, 2.32:1 on the dark surface) and this item does not
// change where it is used.
const TEXT_TOKENS = ['text', 'text-muted', 'accent', 'danger', 'warning', 'success', 'info'] as const;

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('contrast — %s', (_name, scope) => {
  const canvas = token(scope, 'panel-canvas');
  const card = token(scope, 'surface', light);
  const border = token(scope, 'panel-card-border');

  for (const t of TEXT_TOKENS) {
    it(`--${t} is >= 4.5:1 on the canvas and on the card`, () => {
      const fg = token(scope, t, light);
      expect(ratio(fg, canvas), `--${t} on canvas`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(fg, card), `--${t} on card`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the card border is visible against both the card and the canvas (non-text, >= 1.5:1)', () => {
    expect(ratio(border, card)).toBeGreaterThanOrEqual(1.5);
    expect(ratio(border, canvas)).toBeGreaterThanOrEqual(1.5);
  });

  it('the card is a distinct step from the canvas (fill only; the border carries the separation)', () => {
    expect(card).not.toBe(canvas);
    expect(ratio(card, canvas)).toBeGreaterThan(1.1);
  });
});

describe('drawer rules in index.css', () => {
  it('.detail uses the canvas token, scoped to .detail (not .panel)', () => {
    expect(block('.detail {')).toMatch(/background:\s*var\(--panel-canvas\)/);
    expect(block('.panel {')).not.toMatch(/panel-canvas/);
  });

  it('direct <section> children of .detail-body are cards built from the tokens', () => {
    const rule = block('.detail-body > section,');
    expect(rule).toMatch(/background:\s*var\(--surface\)/);
    expect(rule).toMatch(/border:\s*1px solid var\(--panel-card-border\)/);
    expect(rule).toMatch(/border-radius:\s*var\(--panel-card-radius\)/);
    expect(rule).toMatch(/padding:\s*var\(--panel-card-pad\)/);
  });

  it('keeps the ADR-0020 fuchsia left border on an unverified-AI card (the card border: shorthand would erase it)', () => {
    expect(block('.detail-body > section.ai-marked {')).toMatch(/border-left:\s*3px solid var\(--provenance-ai\)/);
  });

  it('exempts the Grafo node card (a small info popup, not a multi-block drawer)', () => {
    expect(block('.detail.grafo-node-card {')).toMatch(/background:\s*var\(--surface\)/);
  });
});
