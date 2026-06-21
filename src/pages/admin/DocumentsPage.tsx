import { useEffect, useRef, useState } from 'react';
import {
  listDocuments,
  uploadDocuments,
  type DocumentRow,
} from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';

// Knowledge → Documents: ingestion + verification table for admins.
export function DocumentsPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [taggingStatus, setTaggingStatus] = useState('');
  const [conflictsOnly, setConflictsOnly] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (taggingStatus) params.tagging_status = taggingStatus;
    if (conflictsOnly) params.conflicts_only = '1';
    listDocuments(params)
      .then((p) => setRows(p.data))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [taggingStatus, conflictsOnly]);

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
      refresh();
    } catch (err) {
      setUploadMsg(`Couldn't ingest these files: ${(err as Error).message}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="docs-layout">
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
            onChange={(e) => setTaggingStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="auto_proposed">Auto-proposed</option>
            <option value="under_review">Under review</option>
            <option value="verified">Verified</option>
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={conflictsOnly} onChange={(e) => setConflictsOnly(e.target.checked)} />
            Conflicts only
          </label>
          {uploadMsg && <span className="muted">{uploadMsg}</span>}
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
                  onClick={() => setSelected(r.uuid)}
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
      </div>

      {selected && (
        <DocumentDetailPanel
          uuid={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
