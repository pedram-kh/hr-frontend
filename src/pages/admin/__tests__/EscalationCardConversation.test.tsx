// @vitest-environment jsdom
//
// Sprint 12b item 3 — the escalation card's Conversación block is collapsed by
// default; the employee's triggering question (a separate block above it) stays
// visible; the choice is one browser-wide preference in localStorage.
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../auth/context';
import { LOCALE_KEY, LocaleProvider } from '../../../i18n/LocaleProvider';
import type { ConversationMessage, EscalationDetail, Identity } from '../../../lib/api';
import { CardDrawer } from '../EscalationCardDrawer';

const KEY = 'hr-admin-escalation-convo-open';

const identity: Identity = {
  account_type: 'admin',
  uuid: 'admin-1',
  email: 'test@hr-staging.internal',
  full_name: 'Test Admin',
  status: 'active',
  abilities: { 'escalation.work': true },
};

const msg = (id: number, role: ConversationMessage['role'], content: string): ConversationMessage => ({
  id,
  role,
  content,
  created_at: null,
  author_label: null,
  outcome: null,
  escalated: false,
  authority_used: [],
  citations: [],
});

function detail(overrides: Partial<EscalationDetail> = {}, messages: ConversationMessage[] = []): EscalationDetail {
  return {
    card: {
      uuid: 'card-1',
      status: 'new',
      reason: 'low_confidence',
      reason_label: 'Confianza baja',
      question: '¿Cuántos días de vacaciones me corresponden?',
      reviewed_message: null,
      employee: { uuid: 'e1', full_name: 'Test Employee', convenio: null },
      assigned_to: null,
      topic: null,
      created_at: null,
      resolved_at: null,
      explanation_facts: null,
      explanation_text: null,
      fix_action: null,
      fix_surface: null,
      fix_link: null,
    },
    conversation: messages.length ? messages : [msg(1, 'user', 'BUBBLE-USER-TEXT'), msg(2, 'assistant', 'BUBBLE-ASSISTANT-TEXT')],
    employee_context: null,
    resolution: null,
    events: [],
    ...overrides,
  };
}

function mount(d: EscalationDetail = detail()) {
  return render(
    <LocaleProvider>
      <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
        <CardDrawer uuid="card-1" canWork={false} onClose={vi.fn()} onChanged={vi.fn()} fetchDetail={() => Promise.resolve(d)} />
      </AuthContext.Provider>
    </LocaleProvider>,
  );
}

const body = () => document.getElementById('card-convo-body') as HTMLElement;

describe('EscalationCardDrawer — collapsible Conversación (Sprint 12b item 3)', () => {
  beforeEach(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LOCALE_KEY);
  });
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LOCALE_KEY);
  });

  it('is collapsed by default, the triggering question is visible, and mounting writes nothing', async () => {
    mount();
    const toggle = await screen.findByRole('button', { name: /Ver conversación completa/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'card-convo-body');
    expect(body()).toHaveAttribute('hidden');
    // The question lives in its own block above — visible while the conversation is folded.
    expect(screen.getByText('¿Cuántos días de vacaciones me corresponden?')).toBeVisible();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('the collapsed label carries the message count (with the right plural)', async () => {
    mount();
    expect(await screen.findByRole('button', { name: 'Ver conversación completa (2 mensajes)' })).toBeInTheDocument();
    cleanup();
    mount(detail({}, [msg(1, 'user', 'solo uno')]));
    expect(await screen.findByRole('button', { name: 'Ver conversación completa (1 mensaje)' })).toBeInTheDocument();
  });

  it('expands on click ("Ocultar"), shows the bubbles, and remembers it', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Ver conversación completa/ }));
    const toggle = screen.getByRole('button', { name: 'Ocultar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(body()).not.toHaveAttribute('hidden');
    expect(screen.getByText('BUBBLE-USER-TEXT')).toBeVisible();
    expect(screen.getByText('BUBBLE-ASSISTANT-TEXT')).toBeVisible();
    expect(window.localStorage.getItem(KEY)).toBe('true');
    // The question is still there too.
    expect(screen.getByText('¿Cuántos días de vacaciones me corresponden?')).toBeVisible();
  });

  it('collapses again and removes the key (the default writes nothing)', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Ver conversación completa/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(body()).toHaveAttribute('hidden');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('one browser-wide preference: the next card opens expanded after one expansion', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Ver conversación completa/ }));
    cleanup();
    mount(); // a different drawer instance, as when the next card is opened
    const toggle = await screen.findByRole('button', { name: 'Ocultar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(body()).not.toHaveAttribute('hidden');
  });

  it('a saved "true" opens on mount', async () => {
    window.localStorage.setItem(KEY, 'true');
    mount();
    expect(await screen.findByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('the restricted variant (knowledge_editor) has no toggle — nothing to collapse', async () => {
    mount(detail({ conversation_restricted: true }, []));
    expect(await screen.findByText('Conversación')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /conversación|Ocultar/i })).not.toBeInTheDocument();
    expect(document.getElementById('card-convo-body')).toBeNull();
  });

  it('English labels', async () => {
    window.localStorage.setItem(LOCALE_KEY, 'en');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Show full conversation (2 messages)' }));
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
  });
});
