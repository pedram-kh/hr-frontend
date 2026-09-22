// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EDGE_TOKEN,
  EDGE_UNVERIFIED_AI_OPACITY,
  EDGE_UNVERIFIED_AI_TOKEN,
  NODE_STATE_TOKEN,
  edgeColor,
  nodeColor,
  withAlpha,
  type NodeState,
} from './graphColors';

// Sprint 11c (plan.md §D.4). jsdom is required here (unlike layoutSeed.test.ts)
// because `nodeColor`/`edgeColor` call `getComputedStyle` — a real DOM API.

const THIS_FILE = fileURLToPath(import.meta.url);
const MODULE_FILE = join(dirname(THIS_FILE), 'graphColors.ts');

// The exact closed set KnowledgeGraphBuilder ever sends (plan.md §A.5's
// payload comment: "scope | active | draft | historical | verified |
// unverified_ai") — kept as a literal list here (not `keyof typeof
// NODE_STATE_TOKEN`) so a state added to the backend but forgotten here
// fails this test rather than silently type-checking.
const ALL_NODE_STATES: NodeState[] = ['scope', 'active', 'draft', 'historical', 'verified', 'unverified_ai'];

describe('NODE_STATE_TOKEN', () => {
  it('maps every state the backend can send to a CSS custom-property name', () => {
    for (const state of ALL_NODE_STATES) {
      const token = NODE_STATE_TOKEN[state];
      expect(token, `state '${state}' has no token`).toBeDefined();
      expect(token.startsWith('--'), `'${token}' for state '${state}' is not a CSS custom property`).toBe(true);
    }
  });

  it('groups active documents and verified facts under the same success token (plan.md §D.4)', () => {
    expect(NODE_STATE_TOKEN.active).toBe(NODE_STATE_TOKEN.verified);
    expect(NODE_STATE_TOKEN.active).toBe('--success');
  });

  it('never uses --brand-warm for scope nodes (reserved by ADR-0012 for icon/decoration only)', () => {
    expect(Object.values(NODE_STATE_TOKEN)).not.toContain('--brand-warm');
  });
});

describe('ADR-0012 — no raw hex in this module', () => {
  it('contains no hex colour literal anywhere in its source', () => {
    const stripped = readFileSync(MODULE_FILE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('readToken / nodeColor / edgeColor (jsdom)', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--accent', '#2b6565');
    document.documentElement.style.setProperty('--success', '#2f7a3d');
    document.documentElement.style.setProperty('--warning', '#946200');
    document.documentElement.style.setProperty('--text-faint', '#788996');
    document.documentElement.style.setProperty('--provenance-ai', '#e879f9');
    document.documentElement.style.setProperty(EDGE_TOKEN, '#8a9997');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('resolves each node state to the live token value', () => {
    expect(nodeColor('scope')).toBe('#2b6565');
    expect(nodeColor('active')).toBe('#2f7a3d');
    expect(nodeColor('verified')).toBe('#2f7a3d');
    expect(nodeColor('draft')).toBe('#946200');
    expect(nodeColor('historical')).toBe('#788996');
    expect(nodeColor('unverified_ai')).toBe('#e879f9');
  });

  it('picks up a theme flip with no cache to invalidate', () => {
    expect(nodeColor('scope')).toBe('#2b6565');
    document.documentElement.style.setProperty('--accent', '#94b9b8'); // the dark-theme value
    expect(nodeColor('scope')).toBe('#94b9b8');
  });

  it('renders a system edge as the plain --map-edge token', () => {
    expect(edgeColor('system')).toBe('#8a9997');
  });

  it('renders an unverified-AI edge at half strength, per plan.md §D.4', () => {
    expect(edgeColor('unverified_ai')).toBe(withAlpha('#e879f9', EDGE_UNVERIFIED_AI_OPACITY));
    expect(edgeColor('unverified_ai')).toBe('rgba(232, 121, 249, 0.5)');
  });

  it('the unverified-AI edge token matches the node token (one fuchsia, everywhere)', () => {
    expect(EDGE_UNVERIFIED_AI_TOKEN).toBe(NODE_STATE_TOKEN.unverified_ai);
  });
});

describe('withAlpha', () => {
  it('converts a 6-digit hex colour to rgba at the given alpha', () => {
    expect(withAlpha('#e879f9', 0.5)).toBe('rgba(232, 121, 249, 0.5)');
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)');
  });

  it('passes through anything that is not a 6-digit hex colour, rather than guessing', () => {
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgb(1, 2, 3)');
    expect(withAlpha('', 0.5)).toBe('');
  });
});
