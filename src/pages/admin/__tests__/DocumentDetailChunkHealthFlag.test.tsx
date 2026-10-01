// @vitest-environment jsdom
//
// Sprint 12b item 1 — the Chunk Health block in the document detail panel is
// behind VITE_SHOW_CHUNK_HEALTH (default off). The component stays; only the
// render is gated, so flipping the flag brings it straight back.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../auth/context';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import type { DocumentDetail, Identity } from '../../../lib/api';
import { DocumentDetailPanel } from '../DocumentDetailPanel';

const identity: Identity = {
  account_type: 'admin',
  uuid: 'u',
  email: 'test@hr-staging.internal',
  full_name: 'Test Admin',
  status: 'active',
  abilities: {},
};

const doc: DocumentDetail = {
  uuid: 'doc-1',
  title: 'Convenio de prueba',
  source_filename: 'convenio.pdf',
  language: 'es',
  validity_start: null,
  validity_end: null,
  retrieval_status: 'active',
  authority_level: 'official_convenio',
  tagging_status: 'confirmed',
  tagging_confidence: null,
  tags: { convenio: null, territory: null, sector: null, document_type: null },
  topics: [],
  lineage: { predecessor: null, successors: [] },
  chunk_health: {
    chunk_count: 12,
    token_total: 3400,
    first_page: 1,
    last_page: 9,
    has_embeddings: true,
    zero_chunks: false,
    language_split_available: false,
    note: 'chunk-health-note',
  },
  is_unscoped: false,
  pages: [],
  empty_text: false,
  ocr_pages_count: 0,
  review_tasks: [],
  provenance: [],
  ruling: null,
};

function mount() {
  return render(
    <LocaleProvider>
      <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
        <DocumentDetailPanel uuid="doc-1" onClose={vi.fn()} onChanged={vi.fn()} />
      </AuthContext.Provider>
    </LocaleProvider>,
  );
}

describe('DocumentDetailPanel — Chunk Health flag (Sprint 12b item 1)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(doc) } as unknown as Response),
      ),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('hides the block when the flag is off (default)', async () => {
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', '');
    mount();
    // Wait for the document to load (title is rendered in the head).
    expect(await screen.findByText('Convenio de prueba')).toBeInTheDocument();
    expect(screen.queryByText('Estado de los fragmentos')).not.toBeInTheDocument();
    expect(screen.queryByText('chunk-health-note')).not.toBeInTheDocument();
  });

  it('shows the block when the flag is on', async () => {
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', 'true');
    mount();
    expect(await screen.findByText('Estado de los fragmentos')).toBeInTheDocument();
    expect(screen.getByText('chunk-health-note')).toBeInTheDocument();
  });
});
