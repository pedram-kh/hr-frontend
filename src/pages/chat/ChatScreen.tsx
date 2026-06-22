import { useEffect, useRef, useState } from 'react';
import { ApiError, sendChatMessage, type ChatResponse } from '../../lib/api';
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
}

type Item = UserItem | AssistantItem;

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

// The escalated-turn body: warning-tinted, signature badge, design-system voice.
function EscalationBlock({ response }: { response: ChatResponse }) {
  return (
    <div className="card chat-bubble chat-bubble--assistant escalation">
      <span className="badge badge-review">Escalado a Recursos Humanos</span>
      <p className="answer-prose">{response.answer}</p>
    </div>
  );
}

export function ChatScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionUuid = useRef<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, sending]);

  async function submit() {
    const question = input.trim();
    if (!question || sending) return;

    setError(null);
    setInput('');
    const userId = crypto.randomUUID();
    setItems((prev) => [...prev, { role: 'user', id: userId, text: question }]);
    setSending(true);

    try {
      const response = await sendChatMessage(question, sessionUuid.current);
      sessionUuid.current = response.session_uuid;
      setItems((prev) => [...prev, { role: 'assistant', id: crypto.randomUUID(), response }]);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la pregunta. Inténtalo de nuevo.';
      setError(message);
    } finally {
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
          ) : (
            <div key={item.id} className="chat-row chat-row--assistant">
              {item.response.escalated ? (
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
