import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getHistoryConversation,
  getVocabulary,
  listHistory,
  searchHistory,
  type ConversationMessage,
  type HistoryConversation,
  type HistoryFilters,
  type HistoryRow,
  type HistorySearchMatch,
  type VocabularyItem,
} from '../../lib/api';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';

const REASONS = [
  { id: '', label: 'Todos los motivos' },
  { id: 'low_confidence', label: 'Baja confianza' },
  { id: 'off_domain', label: 'Fuera de ámbito' },
  { id: 'sensitive_topic', label: 'Tema sensible' },
  { id: 'explicit_request', label: 'Petición explícita' },
  { id: 'salary_coverage_gap', label: 'Hueco salarial' },
  { id: 'conflict', label: 'Conflicto' },
];

// The gated full-conversation History browser (ADR-0018). Read-only over
// existing data — there are NO actions here (acting routes through the
// escalation board). Visible only to history.view_all holders (super_admin +
// auditor); the server enforces every endpoint and logs every access (incl.
// super_admin). Opening a conversation writes a conversation_access_log row.
export function HistoryPage() {
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
        <div className="docs-toolbar">
          <form onSubmit={runSearch} style={{ display: 'contents' }}>
            <input
              className="input"
              placeholder="Buscar en el contenido de las conversaciones…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar en conversaciones"
            />
            <button className="btn btn-secondary" type="submit" disabled={searching || query.trim().length < 2}>
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {matches !== null && (
            <button className="btn btn-ghost" onClick={() => { setMatches(null); setQuery(''); }}>Ver listado</button>
          )}
        </div>

        <div className="docs-toolbar">
          <select className="select" value={filters.convenio_id ?? ''} onChange={(e) => setFilter('convenio_id', e.target.value ? Number(e.target.value) : undefined)} aria-label="Convenio">
            <option value="">Todos los convenios</option>
            {convenios.map((c) => (<option key={c.id} value={c.id}>{c.numero} — {c.name}</option>))}
          </select>
          <select className="select" value={filters.territory_id ?? ''} onChange={(e) => setFilter('territory_id', e.target.value ? Number(e.target.value) : undefined)} aria-label="Territorio">
            <option value="">Todos los territorios</option>
            {territories.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <select className="select" value={filters.outcome ?? ''} onChange={(e) => setFilter('outcome', (e.target.value || undefined) as HistoryFilters['outcome'])} aria-label="Resultado">
            <option value="">Respondidas y escaladas</option>
            <option value="answered">Solo respondidas</option>
            <option value="escalated">Solo escaladas</option>
          </select>
          <select className="select" value={filters.reason ?? ''} onChange={(e) => setFilter('reason', e.target.value)} aria-label="Motivo de escalación">
            {REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
          </select>
          <input className="input" type="date" value={filters.from ?? ''} onChange={(e) => setFilter('from', e.target.value)} aria-label="Desde" />
          <input className="input" type="date" value={filters.to ?? ''} onChange={(e) => setFilter('to', e.target.value)} aria-label="Hasta" />
        </div>

        {error && <p className="error">{error}</p>}

        {matches !== null ? (
          <SearchResults matches={matches} query={query} onOpen={(s) => setOpenSession(s)} />
        ) : loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table className="docs-table">
            <thead>
              <tr><th>Empleado</th><th>Convenio</th><th className="num">Mensajes</th><th>Última actividad</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.session_uuid} className={openSession === r.session_uuid ? 'is-selected' : ''} onClick={() => setOpenSession(r.session_uuid)}>
                  <td>{r.employee?.full_name ?? '—'}</td>
                  <td>{r.employee?.convenio ? r.employee.convenio.numero : '—'}</td>
                  <td className="num">{r.message_count}</td>
                  <td>{r.last_activity_at?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
                  <td>
                    {r.escalated ? (
                      <span className="badge badge-review">Escalada{r.escalation_reason ? ` · ${r.escalation_reason}` : ''}</span>
                    ) : (
                      <span className="badge badge-verified">Respondida</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="col-empty">No hay conversaciones que coincidan.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {openSession && <ConversationDrawer sessionUuid={openSession} onClose={() => setOpenSession(null)} />}
    </>
  );
}

function SearchResults({ matches, query, onOpen }: { matches: HistorySearchMatch[]; query: string; onOpen: (sessionUuid: string) => void }) {
  return (
    <>
      <p className="timeline-meta">
        {matches.length} coincidencia(s) para «{query}». Se muestran fragmentos breves; abre una conversación para
        leerla (cada apertura queda registrada).
      </p>
      <table className="docs-table">
        <thead><tr><th>Empleado</th><th>Rol</th><th>Fragmento</th><th>Actividad</th></tr></thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i} onClick={() => m.session_uuid && onOpen(m.session_uuid)}>
              <td>{m.employee?.full_name ?? '—'}</td>
              <td>{m.role}</td>
              <td>{m.snippet}</td>
              <td>{m.last_activity_at?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
            </tr>
          ))}
          {matches.length === 0 && <tr><td colSpan={4} className="col-empty">Sin coincidencias.</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function ConversationDrawer({ sessionUuid, onClose }: { sessionUuid: string; onClose: () => void }) {
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
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Conversación">
        <div className="detail-head">
          <strong>{convo?.employee?.full_name ?? 'Conversación'}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="detail-body">
          {error && <p className="error">{error}</p>}
          {!convo ? (
            <p className="muted">Cargando…</p>
          ) : (
            <>
              <p className="notice notice--neutral">
                <span aria-hidden="true">🔒</span> Solo lectura. Esta apertura ha quedado registrada en el registro de accesos.
              </p>
              <dl className="kv">
                {convo.employee?.convenio && (<><dt>Convenio</dt><dd>{convo.employee.convenio.numero} — {convo.employee.convenio.name}</dd></>)}
                <dt>Inicio</dt><dd>{convo.started_at?.slice(0, 16).replace('T', ' ') ?? '—'}</dd>
                <dt>Última actividad</dt><dd>{convo.last_activity_at?.slice(0, 16).replace('T', ' ') ?? '—'}</dd>
              </dl>
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

// Mirrors the card-drawer bubble: a bot answer carries citations + trace; an
// hr_agent reply is a clearly-attributed human bubble; a user turn is the
// employee's question. Reuses CitationList + TracePanel (no new primitives).
function ConversationBubble({ message }: { message: ConversationMessage }) {
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
          <span className="badge badge-agent">Respuesta de {message.author_label ?? 'Recursos Humanos'} (persona)</span>
          <p className="answer-prose">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-row chat-row--assistant">
      <div className={`card chat-bubble chat-bubble--assistant ${message.escalated ? 'escalation' : ''}`}>
        {message.escalated && <span className="badge badge-review">Escalado a Recursos Humanos</span>}
        <p className="answer-prose">{message.content}</p>
        <CitationList citations={message.citations} />
        {message.trace && <TracePanel trace={message.trace} />}
      </div>
    </div>
  );
}
