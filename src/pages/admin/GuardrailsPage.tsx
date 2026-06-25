import { useEffect, useMemo, useState } from 'react';
import {
  addGuardrailBlockedTopic,
  ApiError,
  disableGuardrailBlockedTopic,
  getGuardrails,
  updateGuardrails,
  type GuardrailConfig,
  type GuardrailConfigUpdate,
} from '../../lib/api';

// Admin "Guardrails" console (Sprint 6, ADR-0019). The admin layer ON TOP of the
// hardcoded GuardrailService baseline. Every knob is additive / raise-only: the
// hardcoded floor is shown inline, the client rejects a below-floor value for
// fast feedback, and the SERVER is authoritative (a below-floor POST → 422). The
// hardcoded baseline patterns are never editable here. auditor = read-only.

const REASON_LABELS: Record<string, string> = {
  low_confidence: 'Baja confianza',
  salary_coverage_gap: 'Hueco en tablas salariales',
  off_domain: 'Fuera de ámbito',
  explicit_request: 'Petición explícita',
  sensitive_topic: 'Tema sensible',
};

const THRESHOLD_META: Array<{
  key: 'retrieval_score_floor' | 'answer_confidence_floor' | 'router_confidence_floor';
  label: string;
  help: string;
  secondary?: boolean;
}> = [
  {
    key: 'retrieval_score_floor',
    label: 'Umbral de recuperación (Check A)',
    help: 'Puntuación mínima del mejor fragmento para intentar responder. Subirlo escala más preguntas dudosas. Es una verdadera puerta.',
  },
  {
    key: 'answer_confidence_floor',
    label: 'Umbral de confianza (Check C — desempate)',
    help: 'Señal secundaria, NO una puerta principal. Las puertas reales son A (recuperación) y B (citas). Subirlo afina el desempate.',
  },
  {
    key: 'router_confidence_floor',
    label: 'Umbral del enrutador (secundario)',
    help: 'Confianza mínima del enrutador. Subirlo envía más casos intermedios al camino seguro de prosa.',
  },
];

export function GuardrailsPage() {
  const [config, setConfig] = useState<GuardrailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Local editable copies (initialized from the loaded config).
  const [thresholdInputs, setThresholdInputs] = useState<Record<string, string>>({});
  const [offDomain, setOffDomain] = useState('');
  const [tone, setTone] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newKind, setNewKind] = useState<'blocked_topic' | 'off_domain'>('blocked_topic');

  function hydrate(c: GuardrailConfig) {
    setConfig(c);
    setThresholdInputs({
      retrieval_score_floor: c.thresholds.retrieval_score_floor.admin?.toString() ?? '',
      answer_confidence_floor: c.thresholds.answer_confidence_floor.admin?.toString() ?? '',
      router_confidence_floor: c.thresholds.router_confidence_floor.admin?.toString() ?? '',
    });
    setOffDomain(c.off_domain_message.value ?? '');
    setTone(c.tone_constraints.value ?? '');
  }

  useEffect(() => {
    getGuardrails()
      .then(hydrate)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  const canManage = config?.can_manage ?? false;

  async function save(update: GuardrailConfigUpdate) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateGuardrails(update);
      hydrate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  // Client-side reject-below-floor (fast feedback only; the server is authoritative).
  const thresholdViolation = useMemo(() => {
    if (!config) return null;
    for (const meta of THRESHOLD_META) {
      const raw = thresholdInputs[meta.key];
      if (raw === undefined || raw.trim() === '') continue;
      const value = Number(raw);
      const floor = config.thresholds[meta.key].floor;
      if (Number.isNaN(value)) return `«${meta.label}»: introduce un número.`;
      if (value < floor) return `«${meta.label}» no puede bajar de ${floor} (mínimo de seguridad).`;
      if (value > 1) return `«${meta.label}» no puede superar 1.`;
    }
    return null;
  }, [config, thresholdInputs]);

  function saveThresholds() {
    const update: GuardrailConfigUpdate = {};
    for (const meta of THRESHOLD_META) {
      const raw = thresholdInputs[meta.key]?.trim() ?? '';
      update[meta.key] = raw === '' ? null : Number(raw);
    }
    void save(update);
  }

  function toggleReason(reason: string, on: boolean) {
    if (!config) return;
    const current = new Set(config.convert_by_reason.allowed);
    if (on) current.add(reason);
    else current.delete(reason);
    // Only baseline reasons are meaningful; the server intersects with the baseline.
    const next = config.convert_by_reason.baseline.filter((r) => current.has(r));
    void save({ convert_allowed_reasons: next });
  }

  async function addTopic() {
    const pattern = newPattern.trim();
    if (!pattern || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await addGuardrailBlockedTopic(pattern, newKind);
      hydrate(updated);
      setNewPattern('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir.');
    } finally {
      setBusy(false);
    }
  }

  async function disableTopic(id: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await disableGuardrailBlockedTopic(id);
      hydrate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo desactivar.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (!config) return <p className="error">{error ?? 'No se pudo cargar la configuración.'}</p>;

  return (
    <div className="guardrails">
      <p className="muted">
        Esta configuración solo puede <strong>endurecer</strong> el comportamiento base, nunca debilitarlo.
        El sistema aplica siempre el valor más estricto entre el mínimo de seguridad (fijo en el código) y
        tu ajuste; un valor por debajo del mínimo se <strong>rechaza</strong> (no se recorta). Los patrones
        base de seguridad (acoso, salud mental, despido, legal/médico, otras personas) no son editables.
        {!canManage && ' Tu rol es de solo lectura.'}
      </p>

      {error && <p className="error">{error}</p>}

      {/* 1 — Thresholds (incl. the secondary router knob) */}
      <section className="card">
        <h3>Umbrales</h3>
        <p className="muted">
          Cada umbral muestra su mínimo de seguridad fijo. Solo puedes subirlo. El de confianza (Check C) es
          un <strong>desempate</strong>, no una puerta principal — las puertas reales son la recuperación
          (A) y las citas (B).
        </p>
        <div className="guardrails-thresholds">
          {THRESHOLD_META.map((meta) => {
            const t = config.thresholds[meta.key];
            return (
              <div className="field" key={meta.key}>
                <label htmlFor={meta.key}>{meta.label}</label>
                <input
                  id={meta.key}
                  className="input"
                  type="number"
                  min={t.floor}
                  max={1}
                  step={0.01}
                  placeholder={`mínimo ${t.floor} (sin ajuste)`}
                  value={thresholdInputs[meta.key] ?? ''}
                  disabled={!canManage || busy}
                  onChange={(e) => setThresholdInputs((s) => ({ ...s, [meta.key]: e.target.value }))}
                />
                <small className="muted">
                  {meta.help} · Mínimo fijo: <strong>{t.floor}</strong> · Efectivo ahora:{' '}
                  <strong>{t.effective}</strong>
                  {t.admin === null && ' (usando el mínimo)'}
                </small>
              </div>
            );
          })}
        </div>
        {thresholdViolation && <p className="error">{thresholdViolation}</p>}
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={saveThresholds}
            disabled={busy || thresholdViolation !== null}
          >
            {busy ? 'Guardando…' : 'Guardar umbrales'}
          </button>
        )}
      </section>

      {/* 2 — Blocked topics (add-only) */}
      <section className="card">
        <h3>Temas bloqueados y fuera de ámbito</h3>
        <p className="muted">
          Lista <strong>aditiva</strong> sobre la base fija: cada entrada añade una escalación, nunca quita
          una. Se compara como texto literal (sin acentos, por palabra completa) — no como expresión regular.
          Una pregunta bloqueada escala <strong>antes</strong> de llegar al proveedor.
        </p>
        <ul className="guardrails-topics">
          {config.blocked_topics.length === 0 && <li className="muted">Sin entradas todavía.</li>}
          {config.blocked_topics.map((t) => (
            <li key={t.id} className={t.enabled ? '' : 'guardrails-topic--disabled'}>
              <span className="badge">{t.kind === 'off_domain' ? 'Fuera de ámbito' : 'Tema sensible'}</span>
              <code>{t.pattern}</code>
              {t.enabled ? (
                canManage && (
                  <button className="btn btn-ghost" onClick={() => void disableTopic(t.id)} disabled={busy}>
                    Desactivar
                  </button>
                )
              ) : (
                <span className="muted">desactivado</span>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="guardrails-add-topic">
            <input
              className="input guardrails-add-pattern"
              type="text"
              placeholder="palabra o frase"
              value={newPattern}
              disabled={busy}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addTopic();
              }}
            />
            <select
              className="select guardrails-add-kind"
              value={newKind}
              disabled={busy}
              onChange={(e) => setNewKind(e.target.value as 'blocked_topic' | 'off_domain')}
            >
              <option value="blocked_topic">Tema sensible</option>
              <option value="off_domain">Fuera de ámbito</option>
            </select>
            <button className="btn btn-secondary" onClick={() => void addTopic()} disabled={busy || !newPattern.trim()}>
              Añadir
            </button>
          </div>
        )}
      </section>

      {/* 3 — Off-domain message */}
      <section className="card">
        <h3>Mensaje de «fuera de ámbito»</h3>
        <p className="muted">Texto que se muestra al escalar por estar fuera de ámbito. Solo afecta al texto; no cambia ninguna decisión.</p>
        <textarea
          className="input"
          rows={3}
          placeholder={config.off_domain_message.default}
          value={offDomain}
          disabled={!canManage || busy}
          onChange={(e) => setOffDomain(e.target.value)}
        />
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => void save({ off_domain_message: offDomain.trim() === '' ? null : offDomain })}
            disabled={busy}
          >
            Guardar mensaje
          </button>
        )}
      </section>

      {/* 4 — Tone constraints */}
      <section className="card">
        <h3>Tono y estilo</h3>
        <p className="muted">
          Solo <strong>estilo y formato</strong> (p. ej. «trato de usted, respuestas breves»). El tono
          <strong> no puede</strong> saltarse la fundamentación ni las citas: las verificaciones son
          independientes y posteriores. Una instrucción que intente desbloquear una puerta se rechaza.
          Máximo {config.tone_constraints.max_len} caracteres.
        </p>
        <textarea
          className="input"
          rows={3}
          maxLength={config.tone_constraints.max_len}
          value={tone}
          disabled={!canManage || busy}
          onChange={(e) => setTone(e.target.value)}
        />
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => void save({ tone_constraints: tone.trim() === '' ? null : tone })}
            disabled={busy}
          >
            Guardar tono
          </button>
        )}
      </section>

      {/* 5 — Convert-by-reason */}
      <section className="card">
        <h3>Conversión a conocimiento por motivo</h3>
        <p className="muted">
          Qué motivos de escalación pueden convertirse en una regla publicada. Solo puedes <strong>restringir</strong>.
          «Tema sensible» nunca es convertible (bloqueado).
        </p>
        <div className="guardrails-reasons">
          {config.convert_by_reason.baseline.map((reason) => (
            <label key={reason} className="guardrails-reason">
              <input
                type="checkbox"
                checked={config.convert_by_reason.allowed.includes(reason)}
                disabled={!canManage || busy}
                onChange={(e) => toggleReason(reason, e.target.checked)}
              />
              {REASON_LABELS[reason] ?? reason}
            </label>
          ))}
          {config.convert_by_reason.locked.map((reason) => (
            <label key={reason} className="guardrails-reason guardrails-reason--locked">
              <input type="checkbox" checked={false} disabled />
              {REASON_LABELS[reason] ?? reason} 🔒
            </label>
          ))}
        </div>
      </section>

      {/* Change history */}
      <section className="card">
        <h3>Historial de cambios</h3>
        <p className="muted">Cada cambio queda registrado (quién, cuándo, de qué a qué). Solo lectura.</p>
        {config.history.length === 0 ? (
          <p className="muted">Sin cambios todavía.</p>
        ) : (
          <table className="guardrails-history">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Antes</th>
                <th>Después</th>
                <th>Quién</th>
                <th>Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {config.history.map((h, i) => (
                <tr key={i}>
                  <td>{h.field}</td>
                  <td className="muted">{h.old_value ?? '—'}</td>
                  <td>{h.new_value ?? '—'}</td>
                  <td>{h.actor ?? '—'}</td>
                  <td className="muted">{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
