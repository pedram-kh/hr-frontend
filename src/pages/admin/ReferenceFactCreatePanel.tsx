import { useEffect, useState } from 'react';
import {
  createReferenceFact,
  getJobCategories,
  getReferenceSourceContent,
  getVocabulary,
  listReferenceSources,
  uploadDocuments,
  REFERENCE_AUTHORITY_LEVEL,
  type CreateReferenceFactPayload,
  type JobCategoryOption,
  type ReferenceSourceContent,
  type ReferenceSourceDoc,
  type VocabularyItem,
} from '../../lib/api';
import { useT } from '../../i18n/context';

/**
 * Create a Structured Reference fact by hand (Sprint 7b-1, ADR-0021) — the
 * manual path (no AI; the ai_agent proposer is 7b-2). Two columns: the READER
 * (a reference_source's extracted content, surfaced for manual entry) on the
 * left, the FORM on the right. Scope binds into EXISTING vocabulary only
 * (ADR-0011): convenio → DERIVED territory/sector display, convenio-scoped job
 * categories, approved topics. Authority is locked to structured_reference with
 * NO higher option (INVARIANT 1). The fact lands needs_review (inert until a
 * human verifies — the 7a/ADR-0020 spine).
 */
export function ReferenceFactCreatePanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [convenios, setConvenios] = useState<VocabularyItem[]>([]);
  const [topics, setTopics] = useState<VocabularyItem[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategoryOption[]>([]);
  const [sources, setSources] = useState<ReferenceSourceDoc[]>([]);

  const [convenioId, setConvenioId] = useState<number | ''>('');
  const [jobCategoryId, setJobCategoryId] = useState<number | ''>('');
  const [topicId, setTopicId] = useState<number | ''>('');
  const [value, setValue] = useState('');
  const [rawText, setRawText] = useState('');
  const [validityStart, setValidityStart] = useState('');
  const [validityEnd, setValidityEnd] = useState('');
  const [sourceDocId, setSourceDocId] = useState<number | ''>('');
  const [sourceLocator, setSourceLocator] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = () => {
    listReferenceSources().then((r) => setSources(r.sources)).catch(() => setSources([]));
  };

  useEffect(() => {
    getVocabulary('convenios').then((r) => setConvenios(r.items)).catch(() => setConvenios([]));
    getVocabulary('topics').then((r) => setTopics(r.items)).catch(() => setTopics([]));
    loadSources();
  }, []);

  // Convenio drives the (convenio-scoped) job-category picker. Reset + fetch in
  // the handler — never a setState-in-effect cascade.
  const onPickConvenio = (id: number | '') => {
    setConvenioId(id);
    setJobCategoryId('');
    if (id === '') {
      setJobCategories([]);
      return;
    }
    getJobCategories(Number(id)).then((r) => setJobCategories(r.items)).catch(() => setJobCategories([]));
  };

  const selectedConvenio = convenios.find((c) => c.id === convenioId);

  const submit = async () => {
    if (convenioId === '' || !value.trim()) {
      setError(t.referenceFactCreatePanel.requiredFieldsError);
      return;
    }
    setBusy(true);
    setError(null);
    const payload: CreateReferenceFactPayload = {
      convenio_id: Number(convenioId),
      job_category_id: jobCategoryId === '' ? null : Number(jobCategoryId),
      topic_id: topicId === '' ? null : Number(topicId),
      value: value.trim(),
      raw_values: rawText.trim() ? { text: rawText.trim() } : null,
      validity_start: validityStart || null,
      validity_end: validityEnd || null,
      source_document_id: sourceDocId === '' ? null : Number(sourceDocId),
      source_locator: sourceLocator.trim() || null,
    };
    try {
      await createReferenceFact(payload);
      onCreated();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel panel--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.referenceFactCreatePanel.heading}>
        <div className="detail-head">
          <strong>{t.referenceFactCreatePanel.heading}</strong>
          <span className="badge badge-reference">{t.referenceFactPanel.typeBadge}</span>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.referenceFactPanel.closeAriaLabel}>✕</button>
        </div>
        <div className="detail-body fact-create">
          <div className="fact-create-grid">
            <SourceReader sources={sources} onUploaded={loadSources} onUseLocator={setSourceLocator} onLinkSource={(id) => setSourceDocId(id)} />

            <div className="fact-create-form">
              {error && <p className="error">{error}</p>}

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.convenioRequiredLabel}</label>
                <select className="select" value={convenioId} onChange={(e) => onPickConvenio(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">{t.referenceFactCreatePanel.selectConvenioPlaceholder}</option>
                  {convenios.map((c) => (
                    <option key={c.id} value={c.id}>{c.numero} — {c.name}</option>
                  ))}
                </select>
              </div>

              {selectedConvenio && (
                <p className="muted derived-scope">
                  {t.referenceFactCreatePanel.derivedScopePrefix}{' '}
                  <strong>{selectedConvenio.territory?.name ?? t.common.dash}</strong> ·{' '}
                  <strong>{selectedConvenio.sector?.name ?? t.common.dash}</strong>
                  {' '}{t.referenceFactCreatePanel.derivedScopeSuffix}
                </p>
              )}

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.jobCategoryOptionalLabel}</label>
                <select className="select" value={jobCategoryId} onChange={(e) => setJobCategoryId(e.target.value === '' ? '' : Number(e.target.value))} disabled={convenioId === ''}>
                  <option value="">{t.referenceFactCreatePanel.convenioWideOption}</option>
                  {jobCategories.map((j) => (<option key={j.id} value={j.id}>{j.name}</option>))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.topicOptionalLabel}</label>
                <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">{t.referenceFactCreatePanel.noTopicOption}</option>
                  {topics.map((tp) => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.valueRequiredLabel}</label>
                <textarea className="textarea" value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder={t.referenceFactCreatePanel.valuePlaceholder} />
              </div>

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.originalTextOptionalLabel}</label>
                <textarea className="textarea" value={rawText} onChange={(e) => setRawText(e.target.value)} rows={3} placeholder={t.referenceFactCreatePanel.rawTextPlaceholder} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">{t.referenceFactPanel.validityStartLabel}</label>
                  <input className="input" type="date" value={validityStart} onChange={(e) => setValidityStart(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t.referenceFactPanel.validityEndLabel}</label>
                  <input className="input" type="date" value={validityEnd} onChange={(e) => setValidityEnd(e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.sourceDocumentOptionalLabel}</label>
                <select className="select" value={sourceDocId} onChange={(e) => setSourceDocId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">{t.referenceFactCreatePanel.noSourceLinkOption}</option>
                  {sources.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">{t.referenceFactCreatePanel.sourceLocatorOptionalLabel}</label>
                <input className="input" value={sourceLocator} onChange={(e) => setSourceLocator(e.target.value)} placeholder={t.referenceFactPanel.sourceLocatorPlaceholder} />
              </div>

              <p className="muted">
                {t.referenceFactCreatePanel.authorityPrefix} <code className="authority-lock"><span aria-hidden="true">🔒</span> {REFERENCE_AUTHORITY_LEVEL}</code> {t.referenceFactCreatePanel.lockedSuffix}
                {' '}{t.referenceFactCreatePanel.authorityNeverOutrankNotice}
              </p>
              <p className="muted">{t.referenceFactCreatePanel.willLandPrefix} <strong>{t.referenceFactPanel.badgeNeedsReview}</strong> {t.referenceFactCreatePanel.willLandSuffix}</p>

              <div className="detail-actions">
                <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? t.referenceFactCreatePanel.creating : t.referenceFactCreatePanel.createFactButton}</button>
                <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t.referenceFactCreatePanel.cancelButton}</button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** The reader: pick (or upload) a reference_source and read its extracted
 * content for manual fact entry. The content is the display document_pages
 * stored at ingest from hr-ai /read-structured (never embedded — ADR-0006). */
function SourceReader({
  sources,
  onUploaded,
  onUseLocator,
  onLinkSource,
}: {
  sources: ReferenceSourceDoc[];
  onUploaded: () => void;
  onUseLocator: (locator: string) => void;
  onLinkSource: (id: number) => void;
}) {
  const t = useT();
  const [openUuid, setOpenUuid] = useState<string | ''>('');
  const [content, setContent] = useState<ReferenceSourceContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Load the chosen source's content in the handler (no setState-in-effect).
  const onOpenSource = (uuid: string) => {
    setOpenUuid(uuid);
    if (uuid === '') {
      setContent(null);
      return;
    }
    const d = sources.find((s) => s.uuid === uuid);
    if (d) onLinkSource(d.id);
    setLoading(true);
    setContent(null);
    getReferenceSourceContent(uuid)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNote(null);
    try {
      await uploadDocuments(files, true); // as_reference = true
      setNote(t.referenceFactCreatePanel.uploadedNote);
      onUploaded();
    } catch (e) {
      setNote(String((e as Error).message ?? e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fact-reader">
      <h4>{t.referenceFactCreatePanel.readerHeading}</h4>
      <p className="muted">{t.referenceFactCreatePanel.readerIntroPrefix} <code>reference_source</code> {t.referenceFactCreatePanel.readerIntroSuffix}</p>

      <div className="field">
        <label className="field-label">{t.referenceFactCreatePanel.uploadLabel}</label>
        <input className="input" type="file" accept=".docx,.xlsx" multiple onChange={(e) => onUpload(e.target.files)} disabled={uploading} />
      </div>
      {uploading && <p className="muted">{t.referenceFactCreatePanel.uploadingText}</p>}
      {note && <p className="notice notice--neutral">{note}</p>}

      <div className="field">
        <label className="field-label">{t.referenceFactCreatePanel.openSourceLabel}</label>
        <select className="select" value={openUuid} onChange={(e) => onOpenSource(e.target.value)}>
          <option value="">{t.referenceFactCreatePanel.selectSourcePlaceholder}</option>
          {sources.map((s) => (<option key={s.uuid} value={s.uuid}>{s.title}</option>))}
        </select>
      </div>

      {loading && <p className="muted">{t.referenceFactCreatePanel.loadingContentText}</p>}
      {content && (
        <div className="reader-pages">
          {content.pages.length === 0 && <p className="muted">{t.referenceFactCreatePanel.noExtractableContent}</p>}
          {content.pages.map((p) => (
            <div key={p.page_number} className="reader-page">
              <div className="reader-page-head">
                <span className="muted">{t.referenceFactCreatePanel.sectionPrefix} {p.page_number}</span>
                <button className="btn btn-ghost btn-inline" onClick={() => onUseLocator(`section:${p.page_number}`)} title={t.referenceFactCreatePanel.useAsLocatorTitle}>{t.referenceFactCreatePanel.useLocatorButton}</button>
              </div>
              <pre className="reader-text">{p.text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
