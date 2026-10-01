// @vitest-environment jsdom
//
// Slice 13c (plan.md §6) — the Guardarraíles "catalogue" card and the model-knowledge toggle. The API module is mocked: this
// is about what the card renders and which calls it makes, not the server (the host allowlist and soft-disable are proven
// by Sprint13cCatalogueAndToggleTest on the backend).
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import type { GuardrailConfig } from '../../../lib/api';

const base = (over: Partial<GuardrailConfig> = {}): GuardrailConfig =>
  ({
    can_manage: true,
    thresholds: {
      retrieval_score_floor: { admin: null, floor: 0.4, effective: 0.4 },
      answer_confidence_floor: { admin: null, floor: 0.65, effective: 0.65 },
      router_confidence_floor: { admin: null, floor: 0.5, effective: 0.5 },
    },
    confidence_is_tiebreaker: true,
    off_domain_message: { value: null, default: 'x' },
    tone_constraints: { value: null, max_len: 500 },
    convert_by_reason: { baseline: [], allowed: [], locked: [] },
    blocked_topics: [],
    history: [],
    general_lane: { admin: null, env_baseline: true, effective: true },
    general_lane_model_knowledge: { admin: null, env_baseline: true, effective: true },
    general_lane_catalogue: {
      allowed_domains: ['boe.es', 'sepe.es'],
      pages: [
        { id: 1, slug: 'sepe-a', title: 'SEPE — Contratos', url: 'https://www.sepe.es/a', topics: ['contrato'], enabled: true, baseline: true, updated_at: null },
        { id: 2, slug: 'boe-b', title: 'BOE — Registro', url: 'https://www.boe.es/b', topics: ['jornada'], enabled: false, baseline: false, updated_at: null },
      ],
    },
    ...over,
  }) as GuardrailConfig;

const api = vi.hoisted(() => ({
  getGuardrails: vi.fn(),
  updateGuardrails: vi.fn(),
  addGuardrailCataloguePage: vi.fn(),
  updateGuardrailCataloguePage: vi.fn(),
}));
vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return { ...actual, ...api };
});

import { GuardrailsPage } from '../GuardrailsPage';

function renderPage() {
  render(
    <LocaleProvider>
      <GuardrailsPage />
    </LocaleProvider>,
  );
}

describe('Guardarraíles — catalogue card and model-knowledge toggle', () => {
  beforeEach(() => {
    api.getGuardrails.mockResolvedValue(base());
    api.updateGuardrails.mockResolvedValue(base());
    api.addGuardrailCataloguePage.mockResolvedValue(base());
    api.updateGuardrailCataloguePage.mockResolvedValue(base());
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lists the pages with their tags and the fixed domain allowlist', async () => {
    renderPage();
    expect(await screen.findByText('SEPE — Contratos')).toBeInTheDocument();
    expect(screen.getByText('BOE — Registro')).toBeInTheDocument();
    expect(screen.getByText(/boe\.es, sepe\.es/)).toBeInTheDocument();
    expect(screen.getByText(/de serie/)).toBeInTheDocument();
    expect(screen.getByText(/desactivada/)).toBeInTheDocument();
  });

  it('soft-disables and re-enables through PATCH, never a delete', async () => {
    renderPage();
    await screen.findByText('SEPE — Contratos');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(api.updateGuardrailCataloguePage).toHaveBeenCalledWith(1, { enabled: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(api.updateGuardrailCataloguePage).toHaveBeenCalledWith(2, { enabled: true }));
  });

  it('adds a page with comma-separated topics trimmed into a list', async () => {
    renderPage();
    await screen.findByText('SEPE — Contratos');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'SEPE — Desempleo' } });
    fireEvent.change(screen.getByLabelText('Dirección (https)'), { target: { value: 'https://www.sepe.es/d' } });
    fireEvent.change(screen.getByLabelText(/Temas \(separados/), { target: { value: 'paro, desempleo ,  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir página' }));
    await waitFor(() =>
      expect(api.addGuardrailCataloguePage).toHaveBeenCalledWith({ title: 'SEPE — Desempleo', url: 'https://www.sepe.es/d', topics: ['paro', 'desempleo'] }),
    );
  });

  it('shows the server rejection (an off-allowlist host) instead of swallowing it', async () => {
    const { ApiError } = await import('../../../lib/api');
    api.addGuardrailCataloguePage.mockRejectedValue(new ApiError(422, 'El dominio «example.com» no está en la lista de dominios oficiales permitidos.'));
    renderPage();
    await screen.findByText('SEPE — Contratos');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Otra' } });
    fireEvent.change(screen.getByLabelText('Dirección (https)'), { target: { value: 'https://www.example.com/x' } });
    fireEvent.change(screen.getByLabelText(/Temas \(separados/), { target: { value: 'algo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir página' }));
    expect(await screen.findByText(/no está en la lista de dominios oficiales/)).toBeInTheDocument();
  });

  it('the model-knowledge toggle writes its own field and is locked when the deploy flag is off', async () => {
    renderPage();
    const toggle = await screen.findByLabelText('Permitir respuestas con conocimiento general del modelo');
    fireEvent.click(toggle);
    await waitFor(() => expect(api.updateGuardrails).toHaveBeenCalledWith({ general_lane_model_knowledge_enabled: false }));

    cleanup();
    api.getGuardrails.mockResolvedValue(base({ general_lane_model_knowledge: { admin: null, env_baseline: false, effective: false } }));
    renderPage();
    expect(await screen.findByLabelText('Permitir respuestas con conocimiento general del modelo')).toBeDisabled();
  });

  it('an auditor (cannot manage) sees the pages read-only: no buttons, no add form', async () => {
    api.getGuardrails.mockResolvedValue(base({ can_manage: false }));
    renderPage();
    await screen.findByText('SEPE — Contratos');
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Añadir página' })).not.toBeInTheDocument();
  });
});
