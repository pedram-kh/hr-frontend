import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getHistoryConversation,
  getVocabulary,
  listHistory,
  searchHistory,
  type ConversationMessage,
  type EscalationEmployeeContext,
  type HistoryConversation,
  type HistoryFilters,
  type HistoryRow,
  type HistorySearchMatch,
  type VocabularyItem,
} from '../../lib/api';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';
import { escalationReasonFilters, escalationReasonLabel } from '../../lib/escalationReasons';
import { FilterToolbar } from '../../components/FilterToolbar';
import { plural, useLocale, useT } from '../../i18n/context';
import { formatDate } from '../../i18n/format';

// Correction-02 (C2-1): was a hand-copied, incomplete local array (missing
// `reference_fact_coverage_gap`, `salary_not_in_chat`, `quality_sample_wrong`
// as filter options entirely) — now the single shared list, also used by
// EscalationBoardPage's filter and by Analítica's row labels. Built from `t`
// so the labels are locale-aware (Sprint 11b).

// The gated full-conversation History browser (ADR-0018). Read-only over
// existing data — there are NO actions here (acting routes through the
// escalation board). Visible only to history.view_all holders (super_admin +
// auditor); the server enforces every endpoint and logs every access (incl.
// super_admin). Opening a conversation writes a conversation_access_log row.
export function HistoryPage() {
  const t = useT();
  const { locale } = useLocale();
  const REASONS = escalationReasonFilters(t);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [convenios, setConvenios] = useState<VocabularyItem[]>([]);
  const [territories, setTerritories] = useState<VocabularyItem[]>([]);
  const [openSession, setOpenSession] = useState<string | null>(null);

  // Search (a separate, lighter surface — logs history_search, not per-employee).
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<HistorySearchMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getVocabulary('convenios').then((r) => setConvenios(r.items)).catch(() => setConvenios([]));
    getVocabulary('territories').then((r) => setTerritories(r.items)).catch(() => setTerritories([]));
  }, []);

  const load = () => {
    setLoading(true);
    listHistory(filters)
      .then((p) => setRows(p.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const r = await searchHistory(query.trim());
      setMatches(r.matches);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <div className="docs-main">
        <FilterToolbar
          primary={
            <>
              <form onSubmit={runSearch} style={{ display: 'contents' }}>
                <input
                  className="input"
                  placeholder={t.historyPage.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t.historyPage.searchAriaLabel}
                />
                <button className="btn btn-secondary" type="submit" disabled={searching || query.trim().length < 2}>
                  {searching ? t.historyPage.searching : t.historyPage.searchButton}
                </button>
              </form>
              {matches !== null && (
                <button className="btn btn-ghost" onClick={() => { setMatches(null); setQuery(''); }}>{t.historyPage.viewListButton}</button>
              )}
            </>
          }
          filters={filters}
          onClear={() => setFilters({})}
        >
          <select className="select" value={filters.convenio_id ?? ''} onChange={(e) => setFilter('convenio_id', e.target.value ? Number(e.target.value) : undefined)} aria-label={t.common.convenio}>
            <option value="">{t.historyPage.allConveniosOption}</option>
            {convenios.map((c) => (<option key={c.id} value={c.id}>{c.numero} — {c.name}</option>))}
          </select>
          <select className="select" value={filters.territory_id ?? ''} onChange={(e) => setFilter('territory_id', e.target.value ? Number(e.target.value) : undefined)} aria-label={t.escalationCard.colTerritory}>
            <option value="">{t.historyPage.allTerritoriesOption}</option>
            {territories.map((tr) => (<option key={tr.id} value={tr.id}>{tr.name}</option>))}
          </select>
          <select className="select" value={filters.outcome ?? ''} onChange={(e) => setFilter('outcome', (e.target.value || undefined) as HistoryFilters['outcome'])} aria-label={t.historyPage.resultLabel}>
            <option value="">{t.historyPage.outcomeAllOption}</option>
            <option value="answered">{t.historyPage.outcomeAnsweredOnlyOption}</option>
            <option value="escalated">{t.historyPage.outcomeEscalatedOnlyOption}</option>
          </select>
          <select className="select" value={filters.reason ?? ''} onChange={(e) => setFilter('reason', e.target.value)} aria-label={t.historyPage.escalationReasonAriaLabel}>
            {REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
          </select>
          <input className="input" type="date" value={filters.from ?? ''} onChange={(e) => setFilter('from', e.target.value)} aria-label={t.historyPage.fromAriaLabel} />
          <input className="input" type="date" value={filters.to ?? ''} onChange={(e) => setFilter('to', e.target.value)} aria-label={t.historyPage.toAriaLabel} />
        </FilterToolbar>

        {error && <p className="error">{error}</p>}

        {matches !== null ? (
          <SearchResults matches={matches} query={query} onOpen={(s) => setOpenSession(s)} />
        ) : loading ? (
          <p className="muted">{t.common.loading}</p>
        ) : (
          <table className="docs-table">
            <thead>
              <tr><th>{t.escalationCard.colEmployee}</th><th>{t.common.convenio}</th><th className="num">{t.historyPage.colMessages}</th><th>{t.historyPage.colLastActivity}</th><th>{t.historyPage.resultLabel}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.session_uuid} className={openSession === r.session_uuid ? 'is-selected' : ''} onClick={() => setOpenSession(r.session_uuid)}>
                  <td>{r.employee?.full_name ?? t.common.dash}</td>
                  <td>{r.employee?.convenio ? r.employee.convenio.numero : t.common.dash}</td>
                  <td className="num">{r.message_count}</td>
                  <td>{formatDate(r.last_activity_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    {r.escalated ? (
                      // Sprint 11a (§D.2) — was the raw enum key
                      // (e.g. "estatuto_fallback_gap"); the shared helper
                      // Correction-02 already built for this exact reason set.
                      <span className="badge badge-review">{t.historyPage.escalatedBadge}{r.escalation_reason ? ` · ${escalationReasonLabel(t, r.escalation_reason)}` : ''}</span>
                    ) : (
                      <span className="badge badge-verified">{t.historyPage.answeredBadge}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="col-empty">{t.historyPage.noConversationsMatch}</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {openSession && <ConversationDrawer sessionUuid={openSession} onClose={() => setOpenSession(null)} />}
    </>
  );
}

function SearchResults({ matches, query, onOpen }: { matches: HistorySearchMatch[]; query: string; onOpen: (sessionUuid: string) => void }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <>
      <p className="timeline-meta">
        {matches.length} {t.historyPage.matchesCountSuffix} «{query}». {t.historyPage.matchesIntroContinuation}
      </p>
      <table className="docs-table">
        <thead><tr><th>{t.escalationCard.colEmployee}</th><th>{t.historyPage.colRole}</th><th>{t.historyPage.colSnippet}</th><th>{t.historyPage.colActivity}</th></tr></thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i} onClick={() => m.session_uuid && onOpen(m.session_uuid)}>
              <td>{m.employee?.full_name ?? t.common.dash}</td>
              <td>{m.role}</td>
              <td>{m.snippet}</td>
              <td>{formatDate(m.last_activity_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
            </tr>
          ))}
          {matches.length === 0 && <tr><td colSpan={4} className="col-empty">{t.historyPage.noMatches}</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function ConversationDrawer({ sessionUuid, onClose }: { sessionUuid: string; onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [convo, setConvo] = useState<HistoryConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    // Opening the conversation hits the gated endpoint → the server writes the
    // conversation_access_log row (the read itself is the audited event).
    getHistoryConversation(sessionUuid)
      .then(setConvo)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [sessionUuid]);

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.historyPage.conversationAriaLabel}>
        <div className="detail-head">
          <strong>{convo?.employee?.full_name ?? t.historyPage.conversationDefaultHeading}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.common.close}>✕</button>
        </div>
        <div className="detail-body">
          {error && <p className="error">{error}</p>}
          {!convo ? (
            <p className="muted">{t.common.loading}</p>
          ) : (
            <>
              <p className="notice notice--neutral">
                <span aria-hidden="true">🔒</span> {t.historyPage.readOnlyNotice}
              </p>
              <dl className="kv">
                {convo.employee?.convenio && (<><dt>{t.common.convenio}</dt><dd>{convo.employee.convenio.numero} — {convo.employee.convenio.name}</dd></>)}
                <dt>{t.historyPage.startedLabel}</dt><dd>{formatDate(convo.started_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                <dt>{t.historyPage.colLastActivity}</dt><dd>{formatDate(convo.last_activity_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </dl>
              <EmployeeContextBlock context={convo.employee_context} />
              <div className="card-convo">
                {convo.messages.map((m) => <ConversationBubble key={m.id} message={m} />)}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// Sprint 10b, Correction-02 (eyes-on finding): the History conversation modal
// showed no employee context beyond the header name. Mirrors the escalation
// board's `EmployeeContextBlock` (EscalationCardDrawer.tsx) exactly — same
// four rows, same layout — but with no restricted-access branch: this whole
// endpoint already requires `history.view_all` (server route group), so
// there is no narrower ability to gate this specific block behind, unlike the
// escalation card's `escalation.work`-only block.
function EmployeeContextBlock({ context }: { context: EscalationEmployeeContext | null }) {
  const t = useT();
  const { locale } = useLocale();
  if (!context) return null;

  return (
    <dl className="kv">
      <dt>{t.escalationCard.colEmployee}</dt><dd>{context.full_name}</dd>
      <dt>{t.escalationCard.colEmail}</dt><dd>{context.email}</dd>
      <dt>{t.escalationCard.colTerritory}</dt><dd>{context.territory?.name ?? t.common.dash}</dd>
      <dt>{t.escalationCard.colCategoryGroup}</dt>
      <dd>
        {context.job_category?.name ?? t.common.dash}
        {context.convenio_group && <span className="muted"> · {context.convenio_group.path_label}</span>}
      </dd>
      <dt>{t.escalationCard.colSeniority}</dt>
      <dd>
        {context.seniority
          ? `${context.seniority.years} ${plural(locale, context.seniority.years, { one: t.escalationCard.yearOne, other: t.escalationCard.yearOther })} ${t.escalationCard.senioritySincePrefix} ${formatDate(context.seniority.start_date, locale)})`
          : <span className="muted">{t.escalationCard.notRegistered}</span>}
      </dd>
    </dl>
  );
}

// Mirrors the card-drawer bubble: a bot answer carries citations + trace; an
// hr_agent reply is a clearly-attributed human bubble; a user turn is the
// employee's question. Reuses CitationList + TracePanel (no new primitives).
function ConversationBubble({ message }: { message: ConversationMessage }) {
  const t = useT();
  if (message.role === 'user') {
    return (
      <div className="chat-row chat-row--user">
        <div className="chat-bubble chat-bubble--user">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'hr_agent') {
    return (
      <div className="chat-row chat-row--assistant">
        <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
          <span className="badge badge-agent">{t.escalationCard.hrReplyBadgePrefix} {message.author_label ?? t.escalationCard.hrAgentDefaultLabel} {t.escalationCard.hrReplyBadgeSuffix}</span>
          <p className="answer-prose">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-row chat-row--assistant">
      <div className={`card chat-bubble chat-bubble--assistant ${message.escalated ? 'escalation' : ''}`}>
        {message.escalated && <span className="badge badge-review">{t.escalationCard.escalatedToHrBadge}</span>}
        <p className="answer-prose">{message.content}</p>
        <CitationList citations={message.citations} />
        {message.trace && <TracePanel trace={message.trace} />}
      </div>
    </div>
  );
}
