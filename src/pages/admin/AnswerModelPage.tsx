import { useEffect, useState } from 'react';
import {
  ApiError,
  clearAnswerModelKey,
  getAnswerModelStatus,
  setAnswerModelKey,
  type AnswerModelStatus,
} from '../../lib/api';
import { useT } from '../../i18n/context';

// Admin "Answer model" screen (ADR-0015). Set once → encrypted at rest → shown
// masked (••••1234) → rotatable, never read back. The raw key is only ever held
// in the controlled input below and is cleared on submit; the browser never sees
// a stored key and never calls the provider.
export function AnswerModelPage() {
  const t = useT();
  const [status, setStatus] = useState<AnswerModelStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return getAnswerModelStatus()
      .then((s) => setStatus(s))
      .catch((err) => setError(err instanceof ApiError ? err.message : t.answerModelPage.loadFailed))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    const key = keyInput.trim();
    if (!key || busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await setAnswerModelKey(key);
      setStatus(s);
      setKeyInput(''); // never keep the raw key in state
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.answerModelPage.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await clearAnswerModelKey();
      await refresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.answerModelPage.removeFailed);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">{t.common.loading}</p>;

  const configured = status?.configured ?? false;
  const showForm = !configured || editing;

  return (
    <div className="card answer-model">
      <h3>{t.answerModelPage.heading}</h3>
      <p className="muted">
        {t.answerModelPage.intro}
      </p>

      <dl className="kv answer-model-status">
        <dt>{t.answerModelPage.statusLabel}</dt>
        <dd>
          {configured ? (
            <span className="badge badge-verified">{t.answerModelPage.configuredBadge}</span>
          ) : (
            <span className="badge badge-review">{t.answerModelPage.notConfiguredBadge}</span>
          )}
        </dd>
        <dt>{t.answerModelPage.providerLabel}</dt>
        <dd>{status?.provider ?? t.common.dash}</dd>
        {configured && (
          <>
            <dt>{t.answerModelPage.keyLabel}</dt>
            <dd className="answer-model-key">{status?.masked_key ?? '••••'}</dd>
          </>
        )}
      </dl>

      {showForm ? (
        <div className="field answer-model-form">
          <label htmlFor="answer-model-key">{configured ? t.answerModelPage.newKeyRotateLabel : t.answerModelPage.providerKeyLabel}</label>
          <input
            id="answer-model-key"
            className="input"
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={keyInput}
            disabled={busy}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <div className="answer-model-actions">
            <button className="btn btn-primary" onClick={() => void save()} disabled={busy || !keyInput.trim()}>
              {busy ? t.answerModelPage.savingButton : t.answerModelPage.saveKeyButton}
            </button>
            {configured && (
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setKeyInput(''); }} disabled={busy}>
                {t.common.cancel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="answer-model-actions">
          <button className="btn btn-secondary" onClick={() => setEditing(true)} disabled={busy}>
            {t.answerModelPage.rotateKeyButton}
          </button>
          <button className="btn btn-ghost" onClick={() => void remove()} disabled={busy}>
            {t.answerModelPage.removeKeyButton}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
