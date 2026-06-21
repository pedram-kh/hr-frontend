import { useEffect, useRef, useState } from 'react';
import {
  confirmTags,
  getDocument,
  getPageImageUrl,
  getVocabulary,
  reassignFacet,
  type DocumentDetail,
  type VocabularyItem,
} from '../../lib/api';

// Right-hand detail panel: tags, provenance timeline, source pages, and the
// confirm / re-assign actions for one document.
export function DocumentDetailPanel({
  uuid,
  onClose,
  onChanged,
}: {
  uuid: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    getDocument(uuid)
      .then(setDoc)
      .catch((e) => setError(String(e.message ?? e)));
  };

  useEffect(load, [uuid]);

  if (error)
    return (
      <aside className="detail panel">
        <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
        <p className="error">{error}</p>
      </aside>
    );
  if (!doc) return <aside className="detail panel"><p className="muted">Loading…</p></aside>;

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmTags(uuid);
      load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="detail panel">
      <div className="detail-head">
        <strong>{doc.title}</strong>
        <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {doc.empty_text && (
        <p className="notice">
          <span aria-hidden="true">∅</span>
          No extractable text — this looks like a scanned, image-only PDF (no OCR this sprint).
        </p>
      )}

      <section>
        <h4>Scope</h4>
        <div className="facets">
          <Facet label="Convenio" value={doc.tags.convenio ? `${doc.tags.convenio.numero} — ${doc.tags.convenio.name}` : '—'} />
          <Facet label="Territory" value={doc.tags.territory ? `${doc.tags.territory.name} (${doc.tags.territory.level})` : '—'} />
          <Facet label="Sector" value={doc.tags.sector?.name ?? '—'} />
          <Facet label="Type" value={doc.tags.document_type?.name ?? '—'} />
          <Facet label="Validity" value={doc.validity_start ? `${doc.validity_start} → ${doc.validity_end}` : '—'} />
        </div>
        <dl className="kv">
          <dt>Retrieval</dt><dd>{doc.retrieval_status}</dd>
          <dt>Authority</dt><dd>{doc.authority_level}</dd>
          <dt>Language</dt><dd>{doc.language}</dd>
          <dt>Status</dt><dd>{doc.tagging_status} ({doc.tagging_confidence ?? '—'})</dd>
        </dl>
      </section>

      {doc.review_tasks.length > 0 && (
        <section>
          <h4>Review tasks</h4>
          {doc.review_tasks.map((t, i) => (
            <div key={i} className={`review-task ${t.reason === 'conflict' ? 'is-conflict' : 'is-unresolved'}`}>
              <strong>{t.reason ?? t.type}</strong> · {t.status}
              {t.raw_unmatched_values && t.raw_unmatched_values.length > 0 && (
                <ul>
                  {t.raw_unmatched_values.map((rv, j) => (
                    <li key={j}><code>{rv.facet}</code>: {rv.value}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      <ReassignControls uuid={uuid} onChanged={() => { load(); onChanged(); }} />

      <section className="actions">
        <button
          className="btn btn-primary"
          onClick={confirm}
          disabled={busy || doc.tagging_status === 'verified'}
        >
          {doc.tagging_status === 'verified' ? 'Tags confirmed ✓' : 'Confirm tags'}
        </button>
      </section>

      <section>
        <h4>Provenance</h4>
        <ol className="timeline">
          {doc.provenance.map((e, i) => (
            <li key={i} className="timeline-item">
              <span className={`timeline-dot src-${e.source}`} aria-hidden="true" />
              <div>
                <span className="timeline-action">
                  {e.source.replace(/_/g, ' ')} · <code>{e.facet}</code>
                  {e.new_value ? (
                    <>
                      {' → '}
                      <span className="timeline-value">{e.new_value}</span>
                    </>
                  ) : null}
                </span>
                {e.note ? <div className="timeline-meta">{e.note}</div> : null}
                <div className="timeline-meta">{e.created_at}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h4>Source pages ({doc.pages.length})</h4>
        {doc.pages.map((p) => (
          <PageView key={p.page_number} uuid={uuid} page={p.page_number} text={p.text} hasText={p.has_text} />
        ))}
      </section>
    </aside>
  );
}

function Facet({ label, value }: { label: string; value: string }) {
  return (
    <span className="facet">
      <span className="facet-label">{label}</span>
      <span className="facet-value">{value}</span>
    </span>
  );
}

function ReassignControls({ uuid, onChanged }: { uuid: string; onChanged: () => void }) {
  const [facet, setFacet] = useState<'convenio' | 'document_type'>('convenio');
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [valueId, setValueId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const type = facet === 'convenio' ? 'convenios' : 'document_types';
    getVocabulary(type).then((r) => setOptions(r.items));
    setValueId('');
  }, [facet]);

  const apply = async () => {
    if (!valueId) return;
    setBusy(true);
    try {
      await reassignFacet(uuid, facet, Number(valueId));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4>Re-assign facet</h4>
      <div className="reassign">
        <select className="select" value={facet} onChange={(e) => setFacet(e.target.value as 'convenio' | 'document_type')}>
          <option value="convenio">Convenio</option>
          <option value="document_type">Document type</option>
        </select>
        <select className="select" value={valueId} onChange={(e) => setValueId(e.target.value)}>
          <option value="">Select a value…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {facet === 'convenio' ? `${o.numero} — ${o.name}` : o.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={apply} disabled={busy || !valueId}>
          Re-assign
        </button>
      </div>
    </section>
  );
}

function PageView({ uuid, page, text, hasText }: { uuid: string; page: number; text: string; hasText: boolean }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const requested = useRef(false);

  const showImage = () => {
    if (requested.current) return;
    requested.current = true;
    getPageImageUrl(uuid, page).then((r) => setImgUrl(r.url)).catch(() => setImgUrl(null));
  };

  return (
    <details className="page" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && showImage()}>
      <summary>
        Page {page} {hasText ? '' : '· (no text)'}
      </summary>
      <div className="page-body">
        {imgUrl ? <img src={imgUrl} alt={`Page ${page}`} className="page-img" /> : <p className="muted">Loading image…</p>}
        <pre className="page-text well">{text || '(no extractable text)'}</pre>
      </div>
    </details>
  );
}
