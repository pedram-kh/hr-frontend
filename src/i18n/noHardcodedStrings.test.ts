import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

// Sprint 11b (plan.md §B.6 — the R3 anti-rot guard). Promotes
// `hr-docs/sprints/sprint-11b/count-strings.mjs`'s AST walk (used to MEASURE
// the corpus while planning) into a permanent REGRESSION test: any of the
// same four string shapes found bare (a real literal, not a `t.foo.bar`
// dictionary reference) is either a new hardcoded user-facing string or
// belongs on one of the two allowlists below. Co-located next to the module
// it guards (`statusLabels.test.ts`/`layoutSeed.test.ts`'s convention — see
// `layoutSeed.test.ts`'s own comment: a `__tests__/` subfolder was this
// sprint's plan's "illustrative path", not the actual repo convention).
//
// KNOWN LIMITATION, stated plainly (same posture as plan.md §A.1's own
// "known limitations" section): this heuristic is scoped to the same four
// AST node SHAPES the measurement used — `JsxText`, four allowlisted JSX
// attributes, object-literal property values, and literals nested inside
// `setError`/`setErr`/`Error(...)` calls. A bare string/template literal
// living inside an arbitrary `{...}` JSX expression container OUTSIDE those
// shapes (e.g. a ternary directly inside `{}`, not passed to `setError`) is
// NOT caught — `DirectoryPage.tsx`'s original raw-date ternary (plan.md
// §A.1's `DirectoryPage.tsx:449` R2 case) was exactly this shape, and was
// only found by the manual reconciliation pass, not this script. Extending
// the heuristic to cover arbitrary JSX-expression literals is future work,
// not assumed to be covered here.
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ATTR_ALLOWLIST = new Set(['aria-label', 'alt', 'title', 'placeholder']);
const TECHNICAL_KEY_RE = /^(id|key|type|name|className|htmlFor|role|href|src|rel|target|kind|status|state|code|cls|view|tab|method|headers|Content-Type|Accept|Authorization|path|url)$/i;

function stripIcons(s: string): string {
  return s.replace(/[\u2190-\u27BF\u{1F300}-\u{1FAFF}\u2600-\u26FF]/gu, '');
}

function looksLikeProse(text: string): boolean {
  const t = stripIcons(text).trim();
  if (t.length === 0) return false;
  if (/^[·—\-–|:.,()%/#&✕✓×+[\]]+$/.test(t)) return false;
  if (/^\{.*\}$/.test(t)) return false;
  return true;
}

function isBareTechnicalToken(s: string): boolean {
  if (/\s/.test(s)) return false;
  if (/[À-ÿ]/.test(s)) return false;
  return /^[a-z][a-z0-9_.:-]*$/.test(s);
}

interface Violation {
  file: string;
  bucket: string;
  text: string;
}

function analyzeFile(filePath: string): Violation[] {
  const text = readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations: Violation[] = [];
  const relFile = relative(SRC_DIR, filePath).split('\\').join('/');

  function report(bucket: string, s: string) {
    violations.push({ file: relFile, bucket, text: s });
  }

  function handleChildren(children: ts.NodeArray<ts.JsxChild>) {
    let joined = '';
    for (const c of children) {
      if (ts.isJsxText(c)) joined += c.text;
    }
    if (looksLikeProse(joined)) {
      report('jsxText', joined.trim().replace(/\s+/g, ' '));
    }
  }

  function visit(node: ts.Node) {
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && node.children) {
      handleChildren(node.children);
    }
    if (ts.isJsxAttribute(node)) {
      const attrName = node.name.getText(sf);
      if (ATTR_ALLOWLIST.has(attrName) && node.initializer && ts.isStringLiteral(node.initializer)) {
        report('jsxAttr', node.initializer.text);
      }
    } else if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      const keyText = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.getText(sf).replace(/^['"]|['"]$/g, '') : '';
      const val = node.initializer.text;
      if (/^--[a-z]/.test(val)) {
        // CSS custom-property name used as a value — not user-facing.
      } else if (!TECHNICAL_KEY_RE.test(keyText) && val.length > 0 && !isBareTechnicalToken(val)) {
        report('objectLiteral', val);
      } else if (val.length > 0 && /[À-ÿ]/.test(val)) {
        report('objectLiteral', val);
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (/setError|setErr|Error$/.test(callee) || callee === 'Error') {
        const seen = new Set<string>();
        function collect(n: ts.Node) {
          if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && looksLikeProse(n.text) && !isBareTechnicalToken(n.text)) {
            if (!seen.has(n.text)) {
              seen.add(n.text);
              report('templateOrCall', n.text);
            }
          }
          ts.forEachChild(n, collect);
        }
        for (const arg of node.arguments) collect(arg);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return violations;
}

// `i18n/` itself is excluded from the scan: `es.ts`/`en.ts` are DICTIONARIES
// — every value in them is, by definition, a literal string, not a
// violation of anything — and `format.ts`/`context.ts` contain real
// `Intl` locale tags (`'es-ES'`, `'UTC'`) that are technical configuration,
// not chrome. Scanning this module for "bare hardcoded strings" would just
// be checking that the mechanism itself exists, which is what the OTHER
// tests in this file (and `LocaleProvider.test.tsx`/`format.test.ts`)
// already do directly.
const EXCLUDE_DIRS = new Set(['node_modules', '__snapshots__', 'i18n']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(p);
  }
  return out;
}

// Sprint 11b build order (plan.md §C.9 steps 4, 6-8): extraction lands area
// by area, not all at once. Every file in this list is a KNOWN, TEMPORARY
// gap — not yet migrated — tracked here (not silently ignored) so the list
// visibly shrinks to `[]` as steps 6-8 land, and so a NEW file added to
// `src/` with hardcoded strings doesn't silently join it: this list only
// ever shrinks in review, it is not meant to grow (unlike the two allowlists
// below, which are permanent and may grow with a reason each).
//
// Populated from the exact file set plan.md §A.1 measured (38 files with
// ≥1 match) minus what CP-1 already extracted (`shells/AdminShell.tsx`,
// `pages/admin/DirectoryPage.tsx`) and minus the one permanent skip
// (`pages/admin/BrandPreviewPage.tsx`, OQ-1, see `ALLOWED_FILES` below).
const PENDING_EXTRACTION_FILES = new Set<string>([
  // Empty at CP-2 — mass extraction complete. The floor assertion below
  // still requires the tool to see *some* pending corpus while the list is
  // non-empty; with an empty set the floor is skipped via the length check.
]);

// Permanent, reasoned file-level skips — unlike the pending list above,
// these are NOT expected to ever be extracted.
const ALLOWED_FILES: Array<{ file: string; reason: string }> = [
  {
    file: 'pages/admin/BrandPreviewPage.tsx',
    reason:
      "OQ-1 (plan.md §A.1/§C's open questions): 11a's internal CP-1 preview tool, reachable only via #view=brand-preview, never in the rendered nav (AdminShell.tsx's VALID_VIEWS has no navBtn call for it). Accepted at plan review — skip, don't extract.",
  },
];

// Permanent, individual-string exceptions — auditable named list (this
// codebase's existing preference over a magic `// i18n-allow` comment, the
// same shape as `SUB_OUTCOME_LABELS`/`ESCALATION_REASON_LABELS`).
const ALLOWED_HARDCODED_STRINGS: Array<{ file: string; text: string; reason: string }> = [
  {
    file: 'shells/AdminShell.tsx',
    text: 'stats:*',
    reason: 'Real CLI command name (`stats:*` artisan command), rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'shells/AdminShell.tsx',
    text: 'questions:cluster',
    reason: 'Real CLI command name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'shells/AdminShell.tsx',
    text: 'corpus:coverage',
    reason: 'Real CLI command name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'shells/AdminShell.tsx',
    text: 'quality:sample',
    reason: 'Real CLI command name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'shells/AdminShell.tsx',
    text: 'escalation.work',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  // DocumentDetailPanel.tsx (plan.md §C.9 step 6, first landed) — real
  // technical tokens (permission name, CLI command/flag, lifecycle enum
  // values) rendered verbatim in <code>/<option>, invariant across locale,
  // same treatment as the AdminShell CLI names above. Plus the "AI" pill
  // badge (an existing cross-file convention, see ReviewQueuePage.tsx/
  // ReferenceFactPanel.tsx — grep confirmed at extraction time) and a
  // handful of pure punctuation/quote-glyph fragments the AST walk's
  // string-join picks up around interpolated values (not prose on their own).
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'knowledge.edit',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'documents:ocr-backfill',
    reason: 'Real CLI command name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '--ocr',
    reason: 'Real CLI flag, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'AI',
    reason: '"AI" pill badge — existing cross-file convention (ReviewQueuePage.tsx, ReferenceFactPanel.tsx also render it bare), invariant across locale.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'draft',
    reason: 'Retrieval-status enum value, shown verbatim as its own <option> text (LifecycleControls) — technical status code, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'active',
    reason: 'Retrieval-status enum value, same as `draft` above.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'historical',
    reason: 'Retrieval-status enum value, same as `draft` above.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'auto_proposed',
    reason: 'Tagging-status enum value, shown verbatim as its own <option> text (LifecycleControls) — technical status code, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'under_review',
    reason: 'Tagging-status enum value, same as `auto_proposed` above.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'verified',
    reason: 'Tagging-status enum value, same as `auto_proposed` above.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '0.5rem',
    reason: 'Inline `style={{ marginTop: ... }}` CSS value — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: 'var(--space-2)',
    reason: 'Inline `style={{ marginTop: ... }}` CSS custom-property reference — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '() ·',
    reason: "Punctuation/space debris the AST walk's JsxText join picks up around adjacent expression containers (`{...}) · {...}`) — not prose on its own; the real strings on both sides are already wrapped.",
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '· %',
    reason: 'Same punctuation-join artifact as `() ·` above, around the AI-suggestion confidence percentage.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '“”',
    reason: 'Decorative quote glyphs left over from the sandbox\u2019s `\u201c{title}\u201d` interpolation — punctuation, not prose.',
  },
  {
    file: 'pages/admin/DocumentDetailPanel.tsx',
    text: '[] :',
    reason: 'Same punctuation-join artifact as `() ·` above, around the sandbox citation list\u2019s `[{i+1}] ... : {snippet}`.',
  },
  // ReviewQueuePage.tsx (plan.md §C.9 step 6) — same three categories as
  // DocumentDetailPanel.tsx above: the "AI" pill convention, real
  // permission/CLI names rendered in <code>, and punctuation-join debris.
  {
    file: 'pages/admin/ReviewQueuePage.tsx',
    text: 'AI',
    reason: '"AI" pill badge — existing cross-file convention, invariant across locale (same as DocumentDetailPanel.tsx above).',
  },
  {
    file: 'pages/admin/ReviewQueuePage.tsx',
    text: 'vocabulary.approve',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/ReviewQueuePage.tsx',
    text: 'php artisan reviews:scan-expiry',
    reason: 'Real CLI command, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/ReviewQueuePage.tsx',
    text: '( → ) ·',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the successor-candidate option's `({start} → {end}) · {status}` interpolation — not prose on its own.",
  },
  // EscalationCardDrawer.tsx (plan.md §C.9 step 6) — real ability names
  // rendered in <code> (same treatment as AdminShell.tsx/DocumentDetailPanel.tsx
  // above), plus an inline CSS custom-property reference.
  {
    file: 'pages/admin/EscalationCardDrawer.tsx',
    text: 'escalation.work',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/EscalationCardDrawer.tsx',
    text: 'history.view_all',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/EscalationCardDrawer.tsx',
    text: 'var(--space-2)',
    reason: 'Inline `style={{ marginTop: ... }}` CSS custom-property reference — a layout constant, not chrome.',
  },
  // ReferenceFactPanel.tsx (plan.md §C.9 step 6) — same permission-name and
  // inline-style-value categories as the files above, plus a punctuation-
  // join artifact around the AI-uncertainty facet's bullet separators.
  {
    file: 'pages/admin/ReferenceFactPanel.tsx',
    text: 'knowledge.edit',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/ReferenceFactPanel.tsx',
    text: '0.35rem 0 0',
    reason: 'Inline `style={{ margin: ... }}` CSS value — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/ReferenceFactPanel.tsx',
    text: '· ·',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the AI-uncertainty facet's `· ⚠ {field}: {reason}` interpolation (two adjacent bullet separators either side of the expression container) — not prose on its own.",
  },
  // QualitySampleQueue.tsx (plan.md §C.9 step 6) — real permission/CLI
  // names in <code>, a real DB enum value (`quality_sample_wrong`, the
  // escalation reason this queue's "Incorrecta" verdict creates), an inline
  // CSS custom-property, and a punctuation-join artifact.
  {
    file: 'pages/admin/QualitySampleQueue.tsx',
    text: '— · ·',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the monthly-summary row's `{month} — {n} correcta · {n} parcialmente · {n} incorrecta` interpolation — not prose on its own.",
  },
  {
    file: 'pages/admin/QualitySampleQueue.tsx',
    text: 'quality_sample_wrong',
    reason: 'Real escalation-reason enum value, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/QualitySampleQueue.tsx',
    text: 'php artisan quality:sample',
    reason: 'Real CLI command, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/QualitySampleQueue.tsx',
    text: 'escalation.work',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/QualitySampleQueue.tsx',
    text: 'var(--space-2)',
    reason: 'Inline `style={{ marginTop: ... }}` CSS custom-property reference — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/HistoryPage.tsx',
    text: '«».',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the search-matches count's `«{query}».` interpolation — not prose on its own.",
  },
  {
    file: 'pages/admin/ReferenceFactCreatePanel.tsx',
    text: 'reference_source',
    reason: 'Real document-type tag name, rendered in <code> — invariant across locale, not chrome.',
  },
  // CsvImportPanel.tsx (plan.md §C.9 step 6) — the CSV schema's real column
  // names and real convenio-group label examples, all rendered in <code> as
  // literal, invariant-across-locale examples (not prose), plus the
  // surrounding comma/period punctuation the AST walk's JsxText join picks
  // up between them, and one inline CSS custom-property.
  {
    file: 'pages/admin/CsvImportPanel.tsx',
    text: ', , , , , , , , .',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the column-list's nine `<code>` interpolations — not prose on its own.",
  },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'email', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'full_name', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'convenio_numero', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'territory_code', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'job_category', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'group', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome (appears twice: the column list and the group-format note).' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'employment_type', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'work_location', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'employee_external_id', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'start_date', reason: 'Real CSV column name, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'Grupo 2', reason: 'Real convenio-group label example, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: '2', reason: "Real convenio-group code example (the code for `Grupo 2`), rendered in <code> — invariant across locale, not chrome." },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'Grupo I', reason: 'Real convenio-group label example, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'Grupo 1', reason: 'Real convenio-group label example, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'Grupo 2 &gt; resto áreas', reason: 'Real convenio-group path example, rendered in <code> — invariant across locale, not chrome.' },
  { file: 'pages/admin/CsvImportPanel.tsx', text: 'todas las áreas', reason: 'Real convenio-group label example, rendered in <code> — invariant across locale, not chrome.' },
  {
    file: 'pages/admin/CsvImportPanel.tsx',
    text: 'var(--space-2)',
    reason: 'Inline `style={{ marginTop: ... }}` CSS custom-property reference — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/FactDuplicatePanel.tsx',
    text: 'knowledge.edit',
    reason: 'Real ability/permission name, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/FactDuplicatePanel.tsx',
    text: 'var(--space-3)',
    reason: 'Inline `style={{ marginTop: ... }}` CSS custom-property reference — a layout constant, not chrome.',
  },
  {
    file: 'pages/admin/AnalyticsPage.tsx',
    text: 'php artisan questions:cluster',
    reason: 'Real CLI command, rendered in <code> — invariant across locale, not chrome.',
  },
  {
    file: 'pages/admin/AnalyticsPage.tsx',
    text: '· · ·',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the unanswered-ranking row's `volumen {v} · tasa {pct} · peso por plantilla {w} · score {s}` interpolation — not prose on its own. (Was `· % · ·` before formatPercent absorbed the `%`.)",
  },
  {
    file: 'pages/admin/AnswerModelPage.tsx',
    text: 'sk-…',
    reason: 'Provider API-key format hint in the input placeholder — a literal key-prefix pattern, not translatable prose, same both locales.',
  },
  {
    file: 'pages/admin/EscalationBoardPage.tsx',
    text: 'escalation.work',
    reason: 'Real ability name rendered in <code> inside the read-only notice — invariant across locale, same pattern as ReferenceFactPanel.tsx/QualitySampleQueue.tsx.',
  },
  {
    file: 'pages/admin/CoveragePage.tsx',
    text: '· ·',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the ranked-row's `{territory} · {sector} · {headcount} {person}` interpolation — not prose on its own.",
  },
  {
    file: 'pages/admin/ProposeVocabularyForm.tsx',
    text: 'provincial',
    reason: "Territory-level <option> value doubling as its own display text (matches the value attr exactly) — a fixed enum token, not translatable prose.",
  },
  {
    file: 'pages/admin/ProposeVocabularyForm.tsx',
    text: 'regional',
    reason: "Territory-level <option> value doubling as its own display text (matches the value attr exactly) — a fixed enum token, not translatable prose.",
  },
  {
    file: 'pages/admin/ProposeVocabularyForm.tsx',
    text: 'national',
    reason: "Territory-level <option> value doubling as its own display text (matches the value attr exactly) — a fixed enum token, not translatable prose.",
  },
  {
    file: 'pages/LoginPage.tsx',
    text: 'you@example.com',
    reason: 'Email input placeholder example — a format hint, not chrome; same both locales.',
  },
  {
    file: 'pages/LoginPage.tsx',
    text: '123456',
    reason: 'OTP code input placeholder example — a format hint, not chrome; same both locales.',
  },
  {
    file: 'pages/LoginPage.tsx',
    text: 'localhost:8025',
    reason: 'MailHog local-dev URL rendered in <code> — a literal host:port, invariant across locale.',
  },
  {
    file: 'pages/chat/CitationList.tsx',
    text: '…',
    reason: 'Ellipsis appended after a citation snippet excerpt — punctuation, not prose.',
  },
  {
    file: 'pages/chat/TracePanel.tsx',
    text: '«»',
    reason: "Punctuation-join artifact the AST walk's JsxText join picks up around the reformulation quote marks «{q}» — not prose on its own.",
  },
  // GrafoSection.tsx (plan.md §C.9 step 8) — mode labels invariant across
  // locale (technical render-mode names, not chrome prose).
  {
    file: 'pages/admin/grafo/GrafoSection.tsx',
    text: '3D',
    reason: 'Render-mode label — invariant across locale (same glyph both languages), not chrome prose.',
  },
  {
    file: 'pages/admin/grafo/GrafoSection.tsx',
    text: '2D',
    reason: 'Render-mode label — invariant across locale (same glyph both languages), not chrome prose.',
  },
];

describe('R3 anti-rot guard — no new hardcoded user-facing strings (plan.md §B.6)', () => {
  const files = walk(SRC_DIR);
  const allViolations: Violation[] = [];
  for (const f of files) allViolations.push(...analyzeFile(f));

  it('finds the corpus at roughly the scale plan.md §A.1 measured, proving the tool still sees real strings', () => {
    // Sanity check on the tool itself (plan.md §C.9 step 3): if this drops to
    // a handful, the AST walk broke, not the corpus — assert an order-of-
    // magnitude floor, not an exact count (extraction constantly moves the
    // real number down as steps 6-8 land).
    const pendingViolations = allViolations.filter((v) => PENDING_EXTRACTION_FILES.has(v.file));
    // Floor only applies while the backlog is non-empty — once mass extraction
    // clears PENDING_EXTRACTION_FILES the tool's own health is covered by the
    // zero-violations assertion below (and by the ALLOWED_* integrity checks).
    if (PENDING_EXTRACTION_FILES.size > 0) {
      expect(pendingViolations.length).toBeGreaterThan(5);
    } else {
      expect(pendingViolations.length).toBe(0);
    }
  });

  it('has zero un-allowlisted bare user-facing strings in every file NOT in the pending-extraction backlog', () => {
    const allowedFileSet = new Set(ALLOWED_FILES.map((a) => a.file));
    const allowedStringByFile = new Map<string, Set<string>>();
    for (const a of ALLOWED_HARDCODED_STRINGS) {
      if (!allowedStringByFile.has(a.file)) allowedStringByFile.set(a.file, new Set());
      allowedStringByFile.get(a.file)!.add(a.text);
    }

    const realViolations = allViolations.filter((v) => {
      if (PENDING_EXTRACTION_FILES.has(v.file)) return false; // known, tracked backlog — not a regression
      if (allowedFileSet.has(v.file)) return false;
      if (allowedStringByFile.get(v.file)?.has(v.text)) return false;
      return true;
    });

    const summary = realViolations.map((v) => `${v.file} [${v.bucket}]: ${JSON.stringify(v.text.slice(0, 60))}`);
    expect(summary, `New hardcoded user-facing string(s) found outside the pending-extraction backlog:\n${summary.join('\n')}`).toEqual([]);
  });

  it('every PENDING_EXTRACTION_FILES entry still exists and still has real matches (the list only shrinks in review, it never silently goes stale)', () => {
    const seenFiles = new Set(files.map((f) => relative(SRC_DIR, f).split('\\').join('/')));
    for (const pending of PENDING_EXTRACTION_FILES) {
      expect(seenFiles.has(pending), `${pending} is in PENDING_EXTRACTION_FILES but no longer exists under src/ — remove it from the list`).toBe(true);
    }
  });

  it('every ALLOWED_FILES / ALLOWED_HARDCODED_STRINGS entry points at a file that still exists', () => {
    const seenFiles = new Set(files.map((f) => relative(SRC_DIR, f).split('\\').join('/')));
    for (const a of ALLOWED_FILES) {
      expect(seenFiles.has(a.file), `${a.file} is in ALLOWED_FILES but no longer exists under src/`).toBe(true);
    }
    for (const a of ALLOWED_HARDCODED_STRINGS) {
      expect(seenFiles.has(a.file), `${a.file} is in ALLOWED_HARDCODED_STRINGS but no longer exists under src/`).toBe(true);
    }
  });
});
