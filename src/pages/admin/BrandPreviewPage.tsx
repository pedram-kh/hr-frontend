import type { CSSProperties, ReactNode } from 'react';

// Sprint 11a — CP-1 static brand preview (plan §G.1 step 3).
//
// Deliberately NOT added to AdminShell's rendered <nav> — reachable only via
// the deep link `#view=brand-preview` (admin-gated by the same ProtectedRoute
// as every other admin view, ADR-0018). Read-only, renders nothing live: no
// API calls, no state, no side effects. Exists purely so every token, status
// color, button/input/badge/card, and the fuchsia AI-provenance signal can be
// reviewed on the actual deployed host, in both themes (use the header's
// existing ThemeToggle), before any of it touches a real screen.
//
// Every swatch below reads its color from the CSS custom property directly —
// nothing here hardcodes a hex value. If sprint-11a/plan.md §A.2's token
// table changes, this page reflects it automatically.

const CORE_TOKENS: Array<{ label: string; token: string; note?: string }> = [
  { label: 'Accent (Verde Sedena)', token: '--accent', note: 'primary actions, active nav, links' },
  { label: 'Accent hover', token: '--accent-hover' },
  { label: 'Accent weak (Verde Niebla)', token: '--accent-weak', note: 'tinted backgrounds only — never text' },
  { label: 'Accent contrast', token: '--accent-contrast', note: 'text on solid accent fill' },
  { label: 'Brand warm (Arena)', token: '--brand-warm', note: 'icon/decoration/bg only — fails AA as text' },
  { label: 'Brand warm bg', token: '--brand-warm-bg' },
];

const STATUS_TOKENS: Array<{ label: string; fg: string; bg: string }> = [
  { label: 'Danger', fg: '--danger', bg: '--danger-bg' },
  { label: 'Warning', fg: '--warning', bg: '--warning-bg' },
  { label: 'Success', fg: '--success', bg: '--success-bg' },
  { label: 'Info', fg: '--info', bg: '--info-bg' },
  { label: 'Neutral', fg: '--neutral', bg: '--neutral-bg' },
];

const SURFACE_TOKENS: Array<{ label: string; token: string }> = [
  { label: 'Canvas (Gris Claro)', token: '--canvas' },
  { label: 'Surface', token: '--surface' },
  { label: 'Surface raised', token: '--surface-raised' },
  { label: 'Surface inset', token: '--surface-inset' },
];

const TEXT_TOKENS: Array<{ label: string; token: string }> = [
  { label: 'Text (Verde Profundo)', token: '--text' },
  { label: 'Text muted', token: '--text-muted' },
  { label: 'Text faint', token: '--text-faint' },
];

function Swatch({ label, token, note }: { label: string; token: string; note?: string }) {
  return (
    <div className="well" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          height: 56,
          borderRadius: 8,
          background: `var(${token})`,
          border: '1px solid var(--border-strong)',
        }}
      />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        <code style={{ fontSize: 12, color: 'var(--text-faint)' }}>{token}</code>
        {note && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{note}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
};

export function BrandPreviewPage() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <p className="muted" style={{ marginBottom: 24 }}>
        Read-only. Every color below is a live <code>var(--token)</code> — switch themes with the
        Light/Dark toggle in the header to review both. Not linked from the nav (§G.1 step 3, CP-1).
      </p>

      <Section title="Typography">
        <div className="panel" style={{ padding: 16 }}>
          <h1 style={{ margin: '0 0 4px' }}>H1 — Playfair Display 700</h1>
          <h2 style={{ margin: '0 0 4px' }}>H2 — Playfair Display 700</h2>
          <h3 style={{ margin: '0 0 12px' }}>H3 — Montserrat 600 (--font-sans)</h3>
          <p style={{ margin: '0 0 4px' }}>Body text, --text-base / Montserrat 400 — Convenio, jornada, vacaciones, permisos.</p>
          <p className="muted" style={{ margin: 0 }}>Muted text, --text-muted — secondary / labels.</p>
        </div>
      </Section>

      <Section title="Brand / accent tokens">
        <div style={gridStyle}>
          {CORE_TOKENS.map((t) => (
            <Swatch key={t.token} {...t} />
          ))}
        </div>
      </Section>

      <Section title="Surfaces">
        <div style={gridStyle}>
          {SURFACE_TOKENS.map((t) => (
            <Swatch key={t.token} {...t} />
          ))}
        </div>
      </Section>

      <Section title="Text">
        <div style={gridStyle}>
          {TEXT_TOKENS.map((t) => (
            <Swatch key={t.token} {...t} />
          ))}
        </div>
      </Section>

      <Section title="Status colours (Option B — sprint-11a/plan.md §G.3 Q2)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {STATUS_TOKENS.map((s) => (
            <div key={s.label} className="well" style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{s.label}</div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: `var(${s.bg})`,
                  color: `var(${s.fg})`,
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Texto de ejemplo
              </div>
              <code style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                {s.fg} / {s.bg}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" type="button">Primary</button>
          <button className="btn btn-secondary" type="button">Secondary</button>
          <button className="btn btn-ghost" type="button">Ghost</button>
          <button className="btn btn-danger" type="button">Danger</button>
          <button className="btn btn-warning" type="button">Warning</button>
          <button className="btn btn-primary" type="button" disabled>Primary (disabled)</button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="field" style={{ maxWidth: 320, gap: 16 }}>
          <div>
            <label className="field-label" htmlFor="bp-text">Texto</label>
            <input id="bp-text" defaultValue="Convenio colectivo 2026" />
          </div>
          <div>
            <label className="field-label" htmlFor="bp-select">Selección</label>
            <select id="bp-select" defaultValue="a">
              <option value="a">Opción A</option>
              <option value="b">Opción B</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-conflict">Conflicto</span>
          <span className="badge badge-review">En revisión</span>
          <span className="badge badge-verified">Verificado</span>
          <span className="badge badge-national">Nacional</span>
          <span className="badge badge-historical">Histórico</span>
          <span className="badge badge-manual">Manual</span>
          <span className="badge badge-ocr">OCR</span>
          <span className="badge badge-reference">Referencia</span>
        </div>
      </Section>

      <Section title="AI provenance — fuchsia (ADR-0020, untouched by this sprint)">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="ai-pill">
            IA sin verificar
          </span>
          <span className="badge ai">3</span>
          <span className="ai-facet">categoría sugerida</span>
          <div className="panel node ai" style={{ padding: 12, width: 200 }}>
            .node.ai (fix, §G.3 Q5)
          </div>
          <div className="ai-marked well" style={{ padding: 12, width: 200 }}>
            .ai-marked left border
          </div>
        </div>
      </Section>

      <Section title="Cards / panels">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="panel" style={{ padding: 16, width: 220 }}>
            <strong>.panel</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>Card / drawer surface.</p>
          </div>
          <div className="well" style={{ width: 220 }}>
            <strong>.well</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>Inset surface (inputs, source-text).</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
