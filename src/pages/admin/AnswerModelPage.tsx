import { useEffect, useState } from 'react';
import {
  ApiError,
  clearAnswerModelKey,
  getAnswerModelStatus,
  setAnswerModelKey,
  type AnswerModelStatus,
} from '../../lib/api';

// Admin "Answer model" screen (ADR-0015). Set once → encrypted at rest → shown
// masked (••••1234) → rotatable, never read back. The raw key is only ever held
// in the controlled input below and is cleared on submit; the browser never sees
// a stored key and never calls the provider.
export function AnswerModelPage() {
  const [status, setStatus] = useState<AnswerModelStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return getAnswerModelStatus()
      .then((s) => setStatus(s))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar el estado.'))
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
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la clave.');
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
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la clave.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  const configured = status?.configured ?? false;
  const showForm = !configured || editing;

  return (
    <div className="card answer-model">
      <h3>Modelo de respuesta</h3>
      <p className="muted">
        La clave del proveedor se guarda cifrada, se muestra enmascarada y se puede rotar, pero
        nunca se vuelve a mostrar. El navegador nunca ve la clave ni llama al proveedor.
      </p>

      <dl className="kv answer-model-status">
        <dt>Estado</dt>
        <dd>
          {configured ? (
            <span className="badge badge-verified">Configurado ✓</span>
          ) : (
            <span className="badge badge-review">Sin configurar</span>
          )}
        </dd>
        <dt>Proveedor</dt>
        <dd>{status?.provider ?? '—'}</dd>
        {configured && (
          <>
            <dt>Clave</dt>
            <dd className="answer-model-key">{status?.masked_key ?? '••••'}</dd>
          </>
        )}
      </dl>

      {showForm ? (
        <div className="field answer-model-form">
          <label htmlFor="answer-model-key">{configured ? 'Nueva clave (rotar)' : 'Clave del proveedor'}</label>
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
              {busy ? 'Guardando…' : 'Guardar clave'}
            </button>
            {configured && (
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setKeyInput(''); }} disabled={busy}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="answer-model-actions">
          <button className="btn btn-secondary" onClick={() => setEditing(true)} disabled={busy}>
            Rotar clave
          </button>
          <button className="btn btn-ghost" onClick={() => void remove()} disabled={busy}>
            Eliminar clave
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
