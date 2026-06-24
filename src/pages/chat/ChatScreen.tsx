import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getChatSession,
  sendChatMessage,
  type ChatResponse,
  type ConversationMessage,
  type JobCategoryOption,
  type MessageTrace,
} from '../../lib/api';
import { CitationList } from './CitationList';
import { TracePanel } from './TracePanel';

interface UserItem {
  role: 'user';
  id: string;
  text: string;
}

interface AssistantItem {
  role: 'assistant';
  id: string;
  response: ChatResponse;
  // The question that produced this turn — replayed (with the picked category)
  // when the employee answers a 'needs_category' prompt (§4, single-turn).
  question: string;
}

// A HUMAN reply from HR (Sprint 4). Clearly attributed, never the bot voice.
interface HrAgentItem {
  role: 'hr_agent';
  id: string;
  content: string;
  authorLabel: string;
}

type Item = UserItem | AssistantItem | HrAgentItem;

// How often the chat re-hydrates from the server so a human reply appears
// without a manual refresh (Q-D: session-load + polling, no websockets).
const POLL_MS = 25000;

// Build a ChatResponse-shaped object from a persisted message so the hydrated
// turn renders identically to a live one.
function toResponse(m: ConversationMessage, sessionUuid: string | null): ChatResponse {
  return {
    session_uuid: sessionUuid ?? '',
    message_id: m.id,
    // A hydrated needs_category turn has no live category list; render its prose
    // as a normal answer (the single-turn pick is ephemeral — Sprint 5 adds it).
    outcome: m.outcome === 'needs_category' ? 'answer' : (m.outcome ?? 'answer'),
    escalated: m.escalated,
    escalation_reason: null,
    escalation_uuid: null,
    answer: m.content,
    citations: m.citations,
    categories: [],
    authority_used: m.authority_used,
    trace: m.trace ?? ({ router_decision: null } as MessageTrace),
  };
}

function mapMessages(messages: ConversationMessage[], sessionUuid: string | null): Item[] {
  return messages.map((m): Item => {
    if (m.role === 'user') return { role: 'user', id: `s-${m.id}`, text: m.content };
    if (m.role === 'hr_agent')
      return { role: 'hr_agent', id: `s-${m.id}`, content: m.content, authorLabel: m.author_label ?? 'Recursos Humanos' };
    return { role: 'assistant', id: `s-${m.id}`, response: toResponse(m, sessionUuid), question: '' };
  });
}

const AUTHORITY_LABELS: Record<string, string> = {
  official_convenio: 'tu convenio',
  national_law: 'la ley nacional (Estatuto)',
  internal_hr_ruling: 'una resolución interna de RR. HH.',
};

function authorityCaption(authorityUsed: string[]): string | null {
  if (!authorityUsed || authorityUsed.length === 0) return null;
  const labels = authorityUsed.map((a) => AUTHORITY_LABELS[a] ?? a);
  return `Fundamentado en ${labels.join(' y ')}.`;
}

// The answered-turn body: prose + authority caption + citations + trace.
function AnswerBlock({ response }: { response: ChatResponse }) {
  const caption = authorityCaption(response.authority_used);
  return (
    <div className="card chat-bubble chat-bubble--assistant">
      <p className="answer-prose">{response.answer}</p>
      {caption && <p className="answer-authority">{caption}</p>}
      <CitationList citations={response.citations} />
      <TracePanel trace={response.trace} />
    </div>
  );
}

// A human HR reply (Sprint 4). Distinct, clearly-attributed bubble — never the
// bot voice. Carries no citations/trace (a human turn, not a synthesised answer).
function HumanReplyBlock({ content, authorLabel }: { content: string; authorLabel: string }) {
  return (
    <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
      <span className="badge badge-agent">Respuesta de {authorLabel} (persona)</span>
      <p className="answer-prose">{content}</p>
    </div>
  );
}

// The escalated-turn body: warning-tinted, signature badge, design-system voice.
function EscalationBlock({ response }: { response: ChatResponse }) {
  return (
    <div className="card chat-bubble chat-bubble--assistant escalation">
      <span className="badge badge-review">Escalado a Recursos Humanos</span>
      <p className="answer-prose">{response.answer}</p>
    </div>
  );
}

// The single-turn constrained category pick (§4). A CLOSED list of the convenio's
// actual categories (FK-validated server-side — free text is impossible). The
// picked category is unverified and the resulting answer says "según tu indicación".
function CategoryPickBlock({
  response,
  resolved,
  pending,
  onPick,
}: {
  response: ChatResponse;
  resolved: boolean;
  pending: boolean;
  onPick: (category: JobCategoryOption) => void;
}) {
  return (
    <div className="card chat-bubble chat-bubble--assistant">
      <p className="answer-prose">{response.answer}</p>
      <div className="category-pick" role="group" aria-label="Elige tu categoría profesional">
        {response.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className="btn btn-secondary category-pick-option"
            disabled={resolved || pending}
            onClick={() => onPick(c)}
          >
            {c.name}
            {c.group_code ? ` (grupo ${c.group_code})` : ''}
          </button>
        ))}
      </div>
      {resolved && <p className="muted category-pick-note">Categoría seleccionada.</p>}
    </div>
  );
}

export function ChatScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // message_ids of category-pick turns the employee has already answered (so the
  // closed pick disables after one choice — single-turn, §4).
  const [resolvedPicks, setResolvedPicks] = useState<number[]>([]);
  const sessionUuid = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, sending]);

  // Hydrate the employee's own session from the server (Q-D). Replaces the local
  // list with server truth — so a human (hr_agent) reply lands without a manual
  // refresh. Skipped while a send is in flight (don't clobber the optimistic UI).
  const hydrate = async () => {
    if (sendingRef.current) return;
    try {
      const { session_uuid, messages } = await getChatSession();
      if (sendingRef.current) return;
      sessionUuid.current = session_uuid;
      if (messages.length > 0) setItems(mapMessages(messages, session_uuid));
    } catch {
      // Silent — hydration is best-effort; the live send path still works.
    }
  };

  useEffect(() => {
    // Legit external-subscription effect (Q-D): hydrate the session on mount and
    // subscribe to a poll + window-focus. setItems runs only inside hydrate's
    // async fetch callback (after the awaited request), never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hydrate();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void hydrate();
    }, POLL_MS);
    const onFocus = () => void hydrate();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  async function submit() {
    const question = input.trim();
    if (!question || sending) return;

    setError(null);
    setInput('');
    const userId = crypto.randomUUID();
    setItems((prev) => [...prev, { role: 'user', id: userId, text: question }]);
    sendingRef.current = true;
    setSending(true);

    try {
      const response = await sendChatMessage(question, sessionUuid.current);
      sessionUuid.current = response.session_uuid;
      setItems((prev) => [...prev, { role: 'assistant', id: crypto.randomUUID(), response, question }]);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la pregunta. Inténtalo de nuevo.';
      setError(message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  // Replay the original salary question with the picked (unverified) category id.
  async function pickCategory(turn: AssistantItem, category: JobCategoryOption) {
    if (sending) return;
    setError(null);
    sendingRef.current = true;
    setSending(true);
    setItems((prev) => [
      ...prev,
      { role: 'user', id: crypto.randomUUID(), text: `Mi categoría: ${category.name}` },
    ]);

    try {
      const response = await sendChatMessage(turn.question, sessionUuid.current, category.id);
      sessionUuid.current = response.session_uuid;
      setResolvedPicks((prev) => [...prev, turn.response.message_id]);
      setItems((prev) => [...prev, { role: 'assistant', id: crypto.randomUUID(), response, question: turn.question }]);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la selección. Inténtalo de nuevo.';
      setError(message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="chat">
      <div className="chat-list">
        {items.length === 0 && (
          <p className="muted chat-empty">
            Pregúntame sobre tu convenio: jornada, vacaciones, permisos, festivos… Te
            respondo según tu ámbito, citando las fuentes.
          </p>
        )}

        {items.map((item) =>
          item.role === 'user' ? (
            <div key={item.id} className="chat-row chat-row--user">
              <div className="chat-bubble chat-bubble--user">{item.text}</div>
            </div>
          ) : item.role === 'hr_agent' ? (
            <div key={item.id} className="chat-row chat-row--assistant">
              <HumanReplyBlock content={item.content} authorLabel={item.authorLabel} />
            </div>
          ) : (
            <div key={item.id} className="chat-row chat-row--assistant">
              {item.response.outcome === 'needs_category' ? (
                <CategoryPickBlock
                  response={item.response}
                  resolved={resolvedPicks.includes(item.response.message_id)}
                  pending={sending}
                  onPick={(category) => void pickCategory(item, category)}
                />
              ) : item.response.escalated ? (
                <EscalationBlock response={item.response} />
              ) : (
                <AnswerBlock response={item.response} />
              )}
            </div>
          ),
        )}

        {sending && (
          <div className="chat-row chat-row--assistant">
            <div className="chat-bubble chat-bubble--assistant muted">Pensando…</div>
          </div>
        )}

        <div ref={listEndRef} />
      </div>

      {error && <p className="error chat-error">{error}</p>}

      <div className="chat-input-bar">
        <div className="field chat-input-field">
          <textarea
            className="textarea chat-input"
            rows={1}
            placeholder="Escribe tu pregunta sobre convenio, jornada, vacaciones…"
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button className="btn btn-primary" onClick={() => void submit()} disabled={sending || !input.trim()}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
