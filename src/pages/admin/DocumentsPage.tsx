import { useEffect, useRef, useState } from 'react';
import {
  listDocuments,
  uploadDocuments,
  type DocumentRow,
} from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';

// Sprint 7e verification fix (pre-existing gap, not new scope — review.md §2):
// reads/writes a `#doc=<uuid>` location hash so a specific document card can
// be linked to directly. Read-only against the backend — this only affects
// which uuid the SPA opens client-side.
const DOC_HASH_RE = /(?:^#|[#&])doc=([^&]+)/;

function readDocFromHash(): string | null {
  const m = DOC_HASH_RE.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

function writeDocHash(uuid: string | null) {
  const base = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', uuid ? `${base}#doc=${encodeURIComponent(uuid)}` : base);
}

// Knowledge → Documents: ingestion + verification table for admins.
export function DocumentsPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(() => readDocFromHash());
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [taggingStatus, setTaggingStatus] = useState('');
  const [conflictsOnly, setConflictsOnly] = useState(false);

  // Sprint 7e verification fix: DocumentController::index paginates at 50
  // (unchanged, no backend change here) — the list previously only ever read
  // page 1 (`p.data`) and silently dropped everything past the cap. `meta`
  // carries Laravel's standard pagination envelope (current_page/last_page/
  // total) so the total is always visible and a cap can't be silent again.
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number }>({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const fileInput = useRef<HTMLInputElement>(null);

  // Accepts an explicit page override so callers that also just called
  // setPage(1) (whose effect hasn't re-rendered yet) don't fetch a stale
  // page number out of this closure — see onUpload below.
  const refresh = (pageOverride?: number) => {
    setLoading(true);
    const params: Record<string, string> = { page: String(pageOverride ?? page) };
    if (taggingStatus) params.tagging_status = taggingStatus;
    if (conflictsOnly) params.conflicts_only = '1';
    listDocuments(params)
      .then((p) => {
        setRows(p.data);
        setMeta({ current_page: p.current_page, last_page: p.last_page, total: p.total });
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => refresh(), [taggingStatus, conflictsOnly, page]);

  // Filters implicitly change what page 1 means — always land back on it so
  // we never fetch e.g. page 3 of a now-much-smaller filtered result set.
  const onTaggingStatusChange = (v: string) => {
    setPage(1);
    setTaggingStatus(v);
  };
  const onConflictsOnlyChange = (v: boolean) => {
    setPage(1);
    setConflictsOnly(v);
  };

  const openDoc = (uuid: string | null) => {
    setSelected(uuid);
    writeDocHash(uuid);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadMsg(`Ingesting ${files.length} file(s)…`);
    try {
      const res = await uploadDocuments(files);
      const results = res.results as { skipped?: boolean; error?: string }[];
      const ingested = results.filter((r) => !r.skipped && !r.error).length;
      const skipped = results.filter((r) => r.skipped).length;
      const failed = results.filter((r) => r.error).length;
      setUploadMsg(`Ingested ${ingested}, skipped ${skipped}, failed ${failed}.`);
      setPage(1); // newly-ingested docs sort first (id DESC) — land where they are.
      refresh(1);
    } catch (err) {
      setUploadMsg(`Couldn't ingest these files: ${(err as Error).message}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <>
    <div className="docs-main">
        <div className="docs-toolbar">
          <label className="btn btn-primary">
            Upload folder
            <input
              ref={fileInput}
              type="file"
              multiple
              // @ts-expect-error non-standard but widely supported folder upload
              webkitdirectory=""
              onChange={onUpload}
              style={{ display: 'none' }}
            />
          </label>
          <select
            className="select"
            value={taggingStatus}
            onChange={(e) => onTaggingStatusChange(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="auto_proposed">Auto-proposed</option>
            <option value="under_review">Under review</option>
            <option value="verified">Verified</option>
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={conflictsOnly}
              onChange={(e) => onConflictsOnlyChange(e.target.checked)}
            />
            Conflicts only
          </label>
          {uploadMsg && <span className="muted">{uploadMsg}</span>}
          {/* Sprint 7e verification fix: the total is always visible, on every
              page, so a paginate(50) cap can never again silently hide rows. */}
          <span className="muted docs-total">
            {meta.total} document{meta.total === 1 ? '' : 's'}
          </span>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table className="docs-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Territory</th>
                <th>Sector</th>
                <th>Convenio</th>
                <th>Type</th>
                <th className="num">Validity</th>
                <th>Retrieval</th>
                <th>Status</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.uuid}
                  className={selected === r.uuid ? 'is-selected' : ''}
                  onClick={() => openDoc(r.uuid)}
                >
                  <td>{r.title}</td>
                  <td>{r.territory ?? '—'}</td>
                  <td>{r.sector ?? '—'}</td>
                  <td>{r.convenio ?? '—'}</td>
                  <td>{r.document_type ?? '—'}</td>
                  <td className="num">{r.validity_start ? `${r.validity_start} → ${r.validity_end}` : '—'}</td>
                  <td>{r.retrieval_status}</td>
                  <td>{r.tagging_status}</td>
                  <td className="flags">
                    {r.has_open_conflict && (
                      <span className="badge badge-conflict">
                        <span aria-hidden="true">⚠</span> Conflict
                      </span>
                    )}
                    {!r.has_open_conflict && r.has_open_review && (
                      <span className="badge badge-review">
                        <span aria-hidden="true">⏳</span> Under review
                      </span>
                    )}
                    {r.empty_text && (
                      <span className="badge badge-empty">
                        <span aria-hidden="true">∅</span> No text
                      </span>
                    )}
                    {r.ocr_pages_count > 0 && (
                      <span className="badge badge-ocr">
                        <span aria-hidden="true">⚙</span> OCR'd ({r.ocr_pages_count})
                      </span>
                    )}
                    {r.authority_level === 'national_law' && (
                      <span className="badge badge-national">
                        <span aria-hidden="true">⚑</span> National
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="col-empty">
                    {conflictsOnly || taggingStatus
                      ? 'No documents match these filters.'
                      : 'No documents yet — upload a convenio folder to ingest.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {/* Sprint 7e verification fix (review.md §2): DocumentController::index
            paginates at 50 server-side (unchanged) — this pager is the only
            way past page 1. Always rendered (not hidden on a single page) so
            "page 1 of 1" itself is visible proof there's nothing hidden. */}
        <div className="docs-pager">
          <button
            className="btn btn-ghost"
            disabled={meta.current_page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹ Prev
          </button>
          <span className="muted">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            className="btn btn-ghost"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
    </div>
    {selected && (
      <DocumentDetailPanel
        uuid={selected}
        onClose={() => openDoc(null)}
        onChanged={refresh}
      />
    )}
    </>
  );
}
