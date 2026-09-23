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
import { useT, useLocale } from '../../i18n/context';
import { formatDate } from '../../i18n/format';
import type { Dict } from '../../i18n/es';

// Admin "Guardrails" console (Sprint 6, ADR-0019). The admin layer ON TOP of the
// hardcoded GuardrailService baseline. Every knob is additive / raise-only: the
// hardcoded floor is shown inline, the client rejects a below-floor value for
// fast feedback, and the SERVER is authoritative (a below-floor POST → 422). The
// hardcoded baseline patterns are never editable here. auditor = read-only.

function thresholdMeta(t: Dict): Array<{
  key: 'retrieval_score_floor' | 'answer_confidence_floor' | 'router_confidence_floor';
  label: string;
  help: string;
  secondary?: boolean;
}> {
  return [
    {
      key: 'retrieval_score_floor',
      label: t.guardrailsPage.thresholdRetrievalLabel,
      help: t.guardrailsPage.thresholdRetrievalHelp,
    },
    {
      key: 'answer_confidence_floor',
      label: t.guardrailsPage.thresholdConfidenceLabel,
      help: t.guardrailsPage.thresholdConfidenceHelp,
    },
    {
      key: 'router_confidence_floor',
      label: t.guardrailsPage.thresholdRouterLabel,
      help: t.guardrailsPage.thresholdRouterHelp,
    },
  ];
}

export function GuardrailsPage() {
  const t = useT();
  const { locale } = useLocale();
  const THRESHOLD_META = useMemo(() => thresholdMeta(t), [t]);
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
      .catch((err) => setError(err instanceof ApiError ? err.message : t.guardrailsPage.loadFailedError))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canManage = config?.can_manage ?? false;

  async function save(update: GuardrailConfigUpdate) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateGuardrails(update);
      hydrate(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.guardrailsPage.saveFailedError);
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
      if (Number.isNaN(value)) return `«${meta.label}»${t.guardrailsPage.violationNumberSuffix}`;
      if (value < floor) return `«${meta.label}» ${t.guardrailsPage.violationBelowFloorMiddle} ${floor} ${t.guardrailsPage.violationBelowFloorSuffix}`;
      if (value > 1) return `«${meta.label}» ${t.guardrailsPage.violationAboveOne}`;
    }
    return null;
  }, [config, thresholdInputs, t, THRESHOLD_META]);

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
      setError(err instanceof ApiError ? err.message : t.guardrailsPage.addFailedError);
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
      setError(err instanceof ApiError ? err.message : t.guardrailsPage.disableFailedError);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">{t.common.loading}</p>;
  if (!config) return <p className="error">{error ?? t.guardrailsPage.loadFailedError}</p>;

  return (
    <div className="guardrails">
      <p className="muted">
        {t.guardrailsPage.introPrefix} <strong>{t.guardrailsPage.introBoldHarden}</strong> {t.guardrailsPage.introMiddle}{' '}
        <strong>{t.guardrailsPage.introBoldReject}</strong> {t.guardrailsPage.introSuffix}
        {!canManage && <> {t.guardrailsPage.readOnlyRoleNotice}</>}
      </p>

      {error && <p className="error">{error}</p>}

      {/* 1 — Thresholds (incl. the secondary router knob) */}
      <section className="card">
        <h3>{t.guardrailsPage.thresholdsHeading}</h3>
        <p className="muted">
          {t.guardrailsPage.thresholdsIntro1} <strong>{t.guardrailsPage.thresholdsIntroBold}</strong>{t.guardrailsPage.thresholdsIntro2}
        </p>
        <div className="guardrails-thresholds">
          {THRESHOLD_META.map((meta) => {
            const th = config.thresholds[meta.key];
            return (
              <div className="field" key={meta.key}>
                <label htmlFor={meta.key}>{meta.label}</label>
                <input
                  id={meta.key}
                  className="input"
                  type="number"
                  min={th.floor}
                  max={1}
                  step={0.01}
                  placeholder={`${t.guardrailsPage.placeholderMinimoPrefix} ${th.floor} ${t.guardrailsPage.placeholderMinimoSuffix}`}
                  value={thresholdInputs[meta.key] ?? ''}
                  disabled={!canManage || busy}
                  onChange={(e) => setThresholdInputs((s) => ({ ...s, [meta.key]: e.target.value }))}
                />
                <small className="muted">
                  {meta.help} {t.guardrailsPage.helpFixedMinimumMiddle} <strong>{th.floor}</strong> {t.guardrailsPage.helpEffectiveNowMiddle}{' '}
                  <strong>{th.effective}</strong>
                  {th.admin === null && <> {t.guardrailsPage.usingMinimumSuffix}</>}
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
            {busy ? t.guardrailsPage.savingThresholds : t.guardrailsPage.saveThresholdsButton}
          </button>
        )}
      </section>

      {/* 2 — Blocked topics (add-only) */}
      <section className="card">
        <h3>{t.guardrailsPage.blockedTopicsHeading}</h3>
        <p className="muted">
          {t.guardrailsPage.blockedTopicsIntro1} <strong>{t.guardrailsPage.blockedTopicsIntroBold}</strong> {t.guardrailsPage.blockedTopicsIntro2}{' '}
          <strong>{t.guardrailsPage.blockedTopicsIntroBold2}</strong> {t.guardrailsPage.blockedTopicsIntro3}
        </p>
        <ul className="guardrails-topics">
          {config.blocked_topics.length === 0 && <li className="muted">{t.guardrailsPage.noEntriesYet}</li>}
          {config.blocked_topics.map((topic) => (
            <li key={topic.id} className={topic.enabled ? '' : 'guardrails-topic--disabled'}>
              <span className="badge">{topic.kind === 'off_domain' ? t.guardrailsPage.kindOffDomainBadge : t.guardrailsPage.kindSensitiveTopicBadge}</span>
              <code>{topic.pattern}</code>
              {topic.enabled ? (
                canManage && (
                  <button className="btn btn-ghost" onClick={() => void disableTopic(topic.id)} disabled={busy}>
                    {t.guardrailsPage.disableButton}
                  </button>
                )
              ) : (
                <span className="muted">{t.guardrailsPage.disabledLabel}</span>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="guardrails-add-topic">
            <input
              className="input guardrails-add-pattern"
              type="text"
              placeholder={t.guardrailsPage.addPatternPlaceholder}
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
              <option value="blocked_topic">{t.guardrailsPage.kindSensitiveTopicBadge}</option>
              <option value="off_domain">{t.guardrailsPage.kindOffDomainBadge}</option>
            </select>
            <button className="btn btn-secondary" onClick={() => void addTopic()} disabled={busy || !newPattern.trim()}>
              {t.guardrailsPage.addButton}
            </button>
          </div>
        )}
      </section>

      {/* 3 — Off-domain message */}
      <section className="card">
        <h3>{t.guardrailsPage.offDomainHeading}</h3>
        <p className="muted">{t.guardrailsPage.offDomainIntro}</p>
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
            {t.guardrailsPage.saveMessageButton}
          </button>
        )}
      </section>

      {/* 4 — Tone constraints */}
      <section className="card">
        <h3>{t.guardrailsPage.toneHeading}</h3>
        <p className="muted">
          {t.guardrailsPage.toneIntro1} <strong>{t.guardrailsPage.toneIntroBold1}</strong> {t.guardrailsPage.toneIntro2}
          <strong> {t.guardrailsPage.toneIntroBold2}</strong> {t.guardrailsPage.toneIntro3}{' '}
          {config.tone_constraints.max_len} {t.guardrailsPage.toneIntroSuffix}
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
            {t.guardrailsPage.saveToneButton}
          </button>
        )}
      </section>

      {/* 5 — Convert-by-reason */}
      <section className="card">
        <h3>{t.guardrailsPage.convertHeading}</h3>
        <p className="muted">
          {t.guardrailsPage.convertIntroPrefix} <strong>{t.guardrailsPage.convertIntroBold}</strong>{t.guardrailsPage.convertIntroSuffix}
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
              {t.guardrailsPage.reasonLabels[reason] ?? reason}
            </label>
          ))}
          {config.convert_by_reason.locked.map((reason) => (
            <label key={reason} className="guardrails-reason guardrails-reason--locked">
              <input type="checkbox" checked={false} disabled />
              {t.guardrailsPage.reasonLabels[reason] ?? reason} 🔒
            </label>
          ))}
        </div>
      </section>

      {/* Change history */}
      <section className="card">
        <h3>{t.guardrailsPage.historyHeading}</h3>
        <p className="muted">{t.guardrailsPage.historyIntro}</p>
        {config.history.length === 0 ? (
          <p className="muted">{t.guardrailsPage.noChangesYet}</p>
        ) : (
          <table className="guardrails-history">
            <thead>
              <tr>
                <th>{t.guardrailsPage.colField}</th>
                <th>{t.guardrailsPage.colBefore}</th>
                <th>{t.guardrailsPage.colAfter}</th>
                <th>{t.guardrailsPage.colWho}</th>
                <th>{t.guardrailsPage.colWhen}</th>
              </tr>
            </thead>
            <tbody>
              {config.history.map((h, i) => (
                <tr key={i}>
                  <td>{h.field}</td>
                  <td className="muted">{h.old_value ?? t.common.dash}</td>
                  <td>{h.new_value ?? t.common.dash}</td>
                  <td>{h.actor ?? t.common.dash}</td>
                  <td className="muted">{h.created_at ? formatDate(h.created_at, locale, { dateStyle: 'medium', timeStyle: 'short' }) : t.common.dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
