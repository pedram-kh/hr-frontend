import { useEffect, useMemo, useState } from 'react';
import {
  addGuardrailBlockedTopic,
  addGuardrailCataloguePage,
  ApiError,
  disableGuardrailBlockedTopic,
  updateGuardrailCataloguePage,
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
  // Slice 13c: the "add a catalogue page" form.
  const [pageTitle, setPageTitle] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [pageTopics, setPageTopics] = useState('');

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

  async function addPage() {
    const topics = pageTopics.split(',').map((x) => x.trim()).filter((x) => x.length >= 2);
    if (!pageTitle.trim() || !pageUrl.trim() || topics.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await addGuardrailCataloguePage({ title: pageTitle.trim(), url: pageUrl.trim(), topics });
      hydrate(updated);
      setPageTitle('');
      setPageUrl('');
      setPageTopics('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.guardrailsPage.catalogueAddFailedError);
    } finally {
      setBusy(false);
    }
  }

  async function setPageEnabled(id: number, enabled: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      hydrate(await updateGuardrailCataloguePage(id, { enabled }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.guardrailsPage.catalogueUpdateFailedError);
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

      {/* 6 — General-knowledge lane toggle (Sprint 13, step 9). RESTRICT-only:
          this switch can only turn the lane OFF; it can never turn it ON if
          the deploy-level env flag is itself off (env_baseline). */}
      <section className="card">
        <h3>{t.guardrailsPage.generalLaneHeading}</h3>
        <p className="muted">{t.guardrailsPage.generalLaneIntro}</p>
        {!config.general_lane.env_baseline && (
          <p className="muted">{t.guardrailsPage.generalLaneEnvOffNote}</p>
        )}
        <label className="guardrails-reason">
          <input
            type="checkbox"
            checked={config.general_lane.admin ?? true}
            disabled={!canManage || busy || !config.general_lane.env_baseline}
            onChange={(e) => void save({ general_lane_enabled: e.target.checked })}
          />
          {t.guardrailsPage.generalLaneToggleLabel}
        </label>
        <p className="muted">
          {t.guardrailsPage.generalLaneEffectiveLabel} {config.general_lane.effective ? t.guardrailsPage.generalLaneEffectiveOn : t.guardrailsPage.generalLaneEffectiveOff}
        </p>
      </section>

      {/* 6b — Model knowledge as a lane source (Slice 13c, plan.md §2.6). Same RESTRICT-only contract as the lane switch above. */}
      <section className="card">
        <h3>{t.guardrailsPage.generalLaneModelHeading}</h3>
        <p className="muted">{t.guardrailsPage.generalLaneModelIntro}</p>
        {!config.general_lane_model_knowledge.env_baseline && (
          <p className="muted">{t.guardrailsPage.generalLaneModelEnvOffNote}</p>
        )}
        {!config.general_lane.effective && <p className="muted">{t.guardrailsPage.generalLaneModelLaneOffNote}</p>}
        <label className="guardrails-reason">
          <input
            type="checkbox"
            checked={config.general_lane_model_knowledge.admin ?? true}
            disabled={!canManage || busy || !config.general_lane_model_knowledge.env_baseline}
            onChange={(e) => void save({ general_lane_model_knowledge_enabled: e.target.checked })}
          />
          {t.guardrailsPage.generalLaneModelToggleLabel}
        </label>
        <p className="muted">
          {t.guardrailsPage.generalLaneEffectiveLabel} {config.general_lane_model_knowledge.effective ? t.guardrailsPage.generalLaneEffectiveOn : t.guardrailsPage.generalLaneEffectiveOff}
        </p>
      </section>

      {/* 6c — The lane's official-page catalogue (Slice 13c, plan.md §6). Hosts are allowlisted server-side; nothing is deleted. */}
      <section className="card">
        <h3>{t.guardrailsPage.catalogueHeading}</h3>
        <p className="muted">{t.guardrailsPage.catalogueIntro}</p>
        <p className="muted">
          {t.guardrailsPage.catalogueDomainsLabel} {config.general_lane_catalogue.allowed_domains.join(', ')}
        </p>
        {config.general_lane_catalogue.pages.length === 0 && <p className="muted">{t.guardrailsPage.catalogueEmpty}</p>}
        <ul className="guardrails-topics">
          {config.general_lane_catalogue.pages.map((page) => (
            <li key={page.id} className={page.enabled ? '' : 'guardrails-topic--disabled'}>
              <div>
                <strong>{page.title}</strong>
                {page.baseline && <span className="muted"> · {t.guardrailsPage.catalogueBaselineTag}</span>}
                {!page.enabled && <span className="muted"> · {t.guardrailsPage.catalogueDisabledTag}</span>}
                <br />
                <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a>
                <br />
                <span className="muted">{t.guardrailsPage.catalogueTopicsPrefix}{page.topics.join(', ')}</span>
              </div>
              {canManage && (
                <button className="btn btn-ghost" onClick={() => void setPageEnabled(page.id, !page.enabled)} disabled={busy}>
                  {page.enabled ? t.guardrailsPage.catalogueDisableButton : t.guardrailsPage.catalogueEnableButton}
                </button>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="guardrails-add-topic guardrails-add-page">
            <h4>{t.guardrailsPage.catalogueAddSubheading}</h4>
            <div className="field">
              <label htmlFor="cat-title">{t.guardrailsPage.catalogueTitleLabel}</label>
              <input id="cat-title" className="input" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} maxLength={160} disabled={busy} />
            </div>
            <div className="field">
              <label htmlFor="cat-url">{t.guardrailsPage.catalogueUrlLabel}</label>
              <input id="cat-url" className="input" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} maxLength={500} disabled={busy} placeholder={t.guardrailsPage.catalogueUrlPlaceholder} />
            </div>
            <div className="field">
              <label htmlFor="cat-topics">{t.guardrailsPage.catalogueTopicsLabel}</label>
              <input id="cat-topics" className="input" value={pageTopics} onChange={(e) => setPageTopics(e.target.value)} disabled={busy} />
              <p className="muted">{t.guardrailsPage.catalogueTopicsHelp}</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => void addPage()}
              disabled={busy || !pageTitle.trim() || !pageUrl.trim() || pageTopics.trim() === ''}
            >
              {busy ? t.guardrailsPage.catalogueAddingButton : t.guardrailsPage.catalogueAddButton}
            </button>
          </div>
        )}
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
