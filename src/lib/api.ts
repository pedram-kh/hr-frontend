// Centralized API client. The backend URL comes from env (never hardcoded).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const TOKEN_KEY = 'hr_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface EmployeeProfile {
  employment_type: string;
  work_location: string | null;
  convenio: { numero: string; name: string } | null;
  territory: { code: string | null; name: string; level: string } | null;
  job_category: { name: string; group_code: string | null } | null;
}

export interface Identity {
  account_type: 'employee' | 'admin';
  id?: number; // numeric admin id (admins only) — used for board self-assign
  uuid: string;
  email: string;
  full_name: string;
  status: string;
  roles?: string[];
  // Granular abilities (Sprint 3). The UI gates edit affordances on these.
  abilities?: Record<string, boolean>;
  profile?: EmployeeProfile;
}

/** True when this admin holds the knowledge.edit ability (label editing). */
export function canEditKnowledge(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['knowledge.edit']);
}

/** True when this admin holds the escalation.work ability (board: assign/move/reply/resolve). */
export function canWorkEscalations(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['escalation.work']);
}

/**
 * Sprint-5 abilities (ADR-0018). The UI only HIDES on these — the server
 * enforces every endpoint. history.view_all gates the full-history browser;
 * directory.manage the employee directory; admin.manage admin/role management.
 */
export function canViewAllHistory(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['history.view_all']);
}

export function canManageDirectory(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['directory.manage']);
}

export function canManageAdmins(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['admin.manage']);
}

/**
 * Sprint-6 ability (ADR-0019). guardrails.manage gates WRITES to the admin
 * guardrail layer (super_admin only — the most safety-sensitive surface). READS
 * are open to any admin (auditor browses read-only). The UI only HIDES write
 * affordances on this; the server rejects every below-floor / unauthorized write.
 */
export function canManageGuardrails(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['guardrails.manage']);
}

/**
 * Sprint-7a ability (ADR-0011/0020). vocabulary.approve gates APPROVING a
 * vocabulary proposal into the controlled vocabulary (fold into aliases / create
 * a new value) — super_admin only. PROPOSING rides knowledge.edit. The UI only
 * HIDES the approve affordance on this; the server enforces every endpoint.
 */
export function canApproveVocabulary(identity: Identity | null): boolean {
  return Boolean(identity?.abilities?.['vocabulary.approve']);
}

export class ApiError extends Error {
  status: number;

  // The parsed JSON body (when present) so callers can read structured fields
  // like `code` and `conflicts` on a 409 (Sprint 4 scope-confirm / publish-block).
  body: Record<string, unknown> | null;

  constructor(status: number, message: string, body: Record<string, unknown> | null = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data && (data.message as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data ?? null);
  }

  return data as T;
}

export function requestCode(email: string): Promise<{ message: string }> {
  return request('/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyCode(
  email: string,
  code: string,
): Promise<{ token: string; token_type: string; identity: Identity }> {
  return request('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function getMe(): Promise<{ identity: Identity }> {
  return request('/me', { method: 'GET' });
}

// ----------------------------------------------------------------------------
// Admin — Knowledge / Documents (Sprint 1)
// ----------------------------------------------------------------------------

export interface DocumentRow {
  uuid: string;
  title: string;
  territory: string | null;
  sector: string | null;
  convenio: string | null;
  document_type: string | null;
  validity_start: string | null;
  validity_end: string | null;
  retrieval_status: string;
  authority_level: string;
  tagging_status: string;
  tagging_confidence?: number | null;
  has_open_conflict: boolean;
  has_open_review: boolean;
  // Sprint 7a: unverified-AI proposal exists on this doc (drives fuchsia).
  is_ai_proposed?: boolean;
  empty_text: boolean;
  // Sprint 7e (ADR-0026): pages OCR'd (0 if this doc has no OCR'd pages).
  ocr_pages_count: number;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface ProvenanceEvent {
  facet: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  actor_id: number | null;
  confidence: number | null;
  note: string | null;
  created_at: string;
}

export interface DocumentPage {
  page_number: number;
  text: string;
  has_text: boolean;
  image_path: string | null;
  // Sprint 7e (ADR-0026): per-page OCR provenance. extraction_source is
  // 'text_layer' | 'ocr_pending' | 'ocr'; ocr_quality/ocr_bilingual are only
  // ever set when extraction_source === 'ocr'.
  extraction_source?: string;
  ocr_quality?: number | null;
  ocr_bilingual?: boolean;
}

export interface ReviewTask {
  type: string;
  reason: string | null;
  status: string;
  raw_unmatched_values: { facet: string; value: string }[] | null;
}

export interface TopicTag {
  id: number;
  name: string;
  source: string;
  confidence: number | null;
  verified_by: number | null;
  verified_at: string | null;
}

export interface LineageRef {
  uuid: string;
  title: string;
  validity_start: string | null;
  validity_end: string | null;
  retrieval_status: string;
}

export interface ChunkHealth {
  chunk_count: number;
  token_total: number;
  first_page: number | null;
  last_page: number | null;
  has_embeddings: boolean;
  zero_chunks: boolean;
  language_split_available: boolean;
  note: string;
}

export interface DocumentDetail {
  uuid: string;
  title: string;
  source_filename: string | null;
  language: string;
  validity_start: string | null;
  validity_end: string | null;
  retrieval_status: string;
  authority_level: string;
  tagging_status: string;
  tagging_confidence: number | null;
  // Sprint 7a: unverified-AI proposal present (still under_review). Fuchsia on;
  // flips false on verify (the AI origin remains only as the timeline dot).
  is_ai_proposed?: boolean;
  tags: {
    convenio: { id: number; numero: string; name: string } | null;
    territory: { id: number; code: string | null; name: string; level: string } | null;
    sector: { id: number; name: string } | null;
    document_type: { id: number; code: string; name: string } | null;
  };
  topics: TopicTag[];
  lineage: { predecessor: LineageRef | null; successors: LineageRef[] };
  chunk_health: ChunkHealth;
  is_unscoped: boolean;
  pages: DocumentPage[];
  empty_text: boolean;
  // Sprint 7e (ADR-0026): document-level derived count of OCR'd pages.
  ocr_pages_count: number;
  review_tasks: ReviewTask[];
  provenance: ProvenanceEvent[];
  // Sprint 4: present only for a published internal_hr_ruling — the escalation
  // it was created from (badge + provenance + back-link to the card).
  ruling: { escalation_uuid: string | null; escalation_id: number; agent: string | null } | null;
}

export interface VocabularyItem {
  id: number;
  code?: string | null;
  numero?: string;
  name: string;
  level?: string;
  // The `convenios` vocabulary eager-loads its derived scope (territory/sector)
  // — used to DISPLAY the derived territory/sector when a convenio is picked.
  territory_id?: number;
  sector_id?: number;
  territory?: { id: number; name: string } | null;
  sector?: { id: number; name: string } | null;
}

export function listDocuments(params: Record<string, string>): Promise<Paginated<DocumentRow>> {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/documents${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export function getDocument(uuid: string): Promise<DocumentDetail> {
  return request(`/admin/documents/${uuid}`, { method: 'GET' });
}

export function confirmTags(uuid: string): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}/confirm`, { method: 'POST' });
}

// Sprint 7a: manually re-run the AI tagging proposal (the auto-trigger is a
// queued job on ingest). Only meaningful while the doc is still under_review.
export function resuggestTags(uuid: string): Promise<{ status: string; note: string }> {
  return request(`/admin/documents/${uuid}/resuggest`, { method: 'POST' });
}

export function reassignFacet(
  uuid: string,
  facet: string,
  valueId: number,
  confirmScopeChange = false,
): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}/facets/${facet}`, {
    method: 'PATCH',
    body: JSON.stringify({ value_id: valueId, confirm_scope_change: confirmScopeChange }),
  });
}

export function getVocabulary(type: string): Promise<{ items: VocabularyItem[] }> {
  return request(`/admin/vocabulary/${type}`, { method: 'GET' });
}

export function getPageImageUrl(uuid: string, page: number): Promise<{ url: string }> {
  return request(`/admin/documents/${uuid}/pages/${page}/image`, { method: 'GET' });
}

// ----------------------------------------------------------------------------
// Admin — Knowledge Center: lens hierarchy, coverage gaps, bounded edit,
// source viewer, sandbox (Sprint 3)
// ----------------------------------------------------------------------------

export type Lens = 'territory' | 'sector' | 'validity' | 'topic';
export type GapKind =
  | 'unanswerable'
  | 'expired_no_successor'
  | 'suspected_mistag'
  | 'date_expired_active'
  | 'unscoped';

export interface HierarchyNode {
  key: string;
  label: string;
  child_kind: 'group' | 'leaf-parent' | 'leaf';
  count?: number;
  meta?: string | null;
  gap_kind?: GapKind | null;
  // leaf-only fields
  // Sprint 7b-1 (ADR-0021): which knowledge class a leaf is. A 'document' leaf
  // opens the document card; a 'reference_fact' leaf opens the fact card.
  knowledge_type?: 'document' | 'reference_fact';
  doc_uuid?: string;
  document_type?: string | null;
  retrieval_status?: string;
  tagging_status?: string;
  authority_level?: string;
  validity_start?: string | null;
  validity_end?: string | null;
  // reference-fact leaf fields
  fact_uuid?: string;
  status?: string; // needs_review | verified
  source?: string; // admin_manual | ai_agent (ai_agent is 7b-2)
  topic?: string | null;
  is_ai_proposed?: boolean; // always false in 7b-1 — fuchsia is reserved for 7b-2
}

export interface CoverageGaps {
  gaps: {
    unanswerable: Record<string, unknown>[];
    expired_no_successor: Record<string, unknown>[];
    suspected_mistag: Record<string, unknown>[];
    date_expired_active: Record<string, unknown>[];
  };
  counts: Record<GapKind | string, number>;
}

export interface SandboxResult {
  answer: string;
  citations: Citation[];
  persisted: boolean;
  trace: {
    outcome?: string;
    retrieval?: { returned: number; top_score: number };
    draft_answer?: string;
    draft_citations?: Citation[];
    synthesis?: { citation_count?: number; confidence?: number; authority_used?: string[] };
    grounding?: {
      checked?: boolean;
      grounded?: boolean;
      claims?: { claim: string; grounded: boolean }[];
      ungrounded?: string[];
    };
    floor_decision?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

export function getHierarchy(lens: Lens): Promise<{ lens: Lens; nodes: HierarchyNode[] }> {
  return request(`/admin/hierarchy?lens=${lens}`, { method: 'GET' });
}

export function getHierarchyChildren(lens: Lens, parentKey: string): Promise<{ nodes: HierarchyNode[] }> {
  const qs = new URLSearchParams({ lens, parent: parentKey }).toString();
  return request(`/admin/hierarchy/children?${qs}`, { method: 'GET' });
}

export function getCoverageGaps(): Promise<CoverageGaps> {
  return request('/admin/coverage-gaps', { method: 'GET' });
}

export function getDocumentSourceUrl(uuid: string): Promise<{ url: string; content_type: string | null; filename: string | null }> {
  return request(`/admin/documents/${uuid}/source`, { method: 'GET' });
}

export function runSandbox(uuid: string, question: string): Promise<SandboxResult> {
  return request(`/admin/documents/${uuid}/sandbox`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export interface LifecyclePatch {
  validity_start?: string | null;
  validity_end?: string | null;
  retrieval_status?: string;
  tagging_status?: string;
  confirm_scope_change?: boolean;
}

export function updateLifecycle(uuid: string, patch: LifecyclePatch): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function addTopic(uuid: string, topicId: number): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}/topics`, { method: 'POST', body: JSON.stringify({ topic_id: topicId }) });
}

export function removeTopic(uuid: string, topicId: number): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}/topics/${topicId}`, { method: 'DELETE' });
}

// ----------------------------------------------------------------------------
// Employee chat (Sprint 2b-1)
// ----------------------------------------------------------------------------

export interface Citation {
  chunk_id: number | null; // null for a salary-table citation (structured data, not a chunk)
  document_id: number;
  document_uuid: string | null;
  document_title: string | null;
  authority_level: string | null;
  page_from: number | null;
  page_to: number | null;
  page_number: number | null;
  snippet: string;
  is_salary_table?: boolean;
  is_reference_fact?: boolean; // a verified structured reference fact (chunk_id = null), Sprint 7c
}

// A constrained job category for the single-turn salary disambiguation pick (§4).
// The id is FK-validated server-side to the employee's convenio — a free-text or
// out-of-convenio value is impossible.
export interface JobCategoryOption {
  id: number;
  name: string;
  group_code: string | null;
}

// One turn's outcome (Sprint 2b-2). 'needs_category' renders the constrained pick.
export type ChatOutcome = 'answer' | 'escalate' | 'needs_category';

// The structured "how I got here" trace. Rendered read-only; never contains the
// API key or any secret (the backend builds it without them).
export interface MessageTrace {
  profile?: Record<string, unknown>;
  scope_filters?: Record<string, unknown>;
  // The router decision (ADR-0016): null only for guardrail-escalated turns that
  // never reached the router. Otherwise the label + confidence + source.
  router_decision: {
    label: string;
    confidence: number;
    source: string; // 'deterministic_salary' | 'llm' | 'fail_safe'
    subqueries?: string[];
    model?: string | null;
    note?: string | null;
    [k: string]: unknown;
  } | null;
  guardrail_check?: { fired: boolean; reason: string | null; rule: string | null };
  // Salary path detail (Sprint 2b-2): category + year + the resolved figures.
  salary?: {
    outcome?: string;
    year?: number | null;
    year_selection?: string;
    category_source?: string; // 'profile' | 'picked_unverified'
    job_category_id?: number | null;
    note?: string | null;
    [k: string]: unknown;
  };
  // Reference-fact path detail (Sprint 7c): the resolved verified fact + how its
  // scope/validity was selected. authority_used is always structured_reference.
  reference_fact?: {
    outcome?: string;
    topic_id?: number | null;
    fact_id?: number | null;
    match_kind?: string; // 'job_category' | 'group_label' | 'convenio_wide'
    validity_selection?: string | null; // 'single' | 'most_recent_validity' | 'ambiguous_conflict'
    group_label?: string | null;
    value?: string | null;
    note?: string | null;
    [k: string]: unknown;
  };
  // Composition path detail (Sprint 7c Phase 2, ADR-0023): a verified fact merged
  // with governing convenio prose into one grounded answer. The convenio always
  // governs; a same-point conflict escalates (never blends).
  composition?: {
    detected?: boolean;
    governing_on_topic_chunks?: number;
    governing_top_score?: number;
    check_a?: boolean;
    conflict?: { conflict: boolean; unit: string | null; fact_values: string[]; prose_values: string[] };
    synthesis_error?: string;
    [k: string]: unknown;
  };
  retrieval?: {
    eligible_total: number;
    returned: number;
    top_score: number;
    passes?: { kind: string; query: string; returned: number; eligible_total: number; top_score: number }[];
    chunks?: { chunk_id: number; document_id: number; page_from: number | null; page_to: number | null; score: number | null; authority_level: string | null }[];
  };
  synthesis?: {
    provider?: string;
    model?: string;
    citation_count?: number;
    confidence?: number;
    authority_used?: string[];
    [k: string]: unknown;
  };
  floor_decision?: {
    path?: string;
    retrieval_score_floor?: number;
    answer_confidence_floor?: number;
    check_a_retrieval?: boolean;
    check_b_citations?: boolean;
    figure_grounding?: { checked: boolean; grounded: boolean; figures?: string[]; ungrounded?: string[] };
    grounding?: {
      checked: boolean;
      grounded?: boolean;
      claims?: { claim: string; grounded: boolean; supporting_source: number | null }[];
      ungrounded?: string[];
      gate?: string;
      [k: string]: unknown;
    };
    authority_used?: string[];
    outcome?: string;
    escalation_reason?: string | null;
    note?: string;
  };
}

export interface ChatResponse {
  session_uuid: string;
  message_id: number;
  outcome: ChatOutcome;
  escalated: boolean;
  escalation_reason: string | null;
  escalation_uuid: string | null;
  answer: string;
  citations: Citation[];
  categories: JobCategoryOption[]; // populated only on a 'needs_category' outcome
  authority_used: string[];
  trace: MessageTrace;
}

export function sendChatMessage(
  question: string,
  sessionUuid?: string | null,
  selectedJobCategoryId?: number | null,
): Promise<ChatResponse> {
  return request('/chat/message', {
    method: 'POST',
    body: JSON.stringify({
      question,
      session_uuid: sessionUuid ?? null,
      selected_job_category_id: selectedJobCategoryId ?? null,
    }),
  });
}

// One persisted message in a session (Sprint 4). `hr_agent` is a HUMAN reply —
// attributed as "Recursos Humanos" (author_label), never mistakable for the bot.
// Assistant turns carry citations + the trace; user/hr_agent turns do not.
export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'hr_agent';
  content: string;
  created_at: string | null;
  author_label: string | null;
  outcome: ChatOutcome | null;
  escalated: boolean;
  authority_used: string[];
  citations: Citation[];
  trace: MessageTrace | null;
}

// Hydrate the employee's OWN most-recent session (Q-D). Self-scoped; the UI
// loads this on mount and polls so a human reply appears without a refresh.
export function getChatSession(): Promise<{ session_uuid: string | null; messages: ConversationMessage[] }> {
  return request('/chat/session', { method: 'GET' });
}

// ----------------------------------------------------------------------------
// Admin — Answer model key handling (Sprint 2b-1, ADR-0015)
// ----------------------------------------------------------------------------

export interface AnswerModelStatus {
  configured: boolean;
  masked_key: string | null; // ••••1234 — reconstructed without decrypting; never the raw key
  provider: string;
  configured_at: string | null;
}

export function getAnswerModelStatus(): Promise<AnswerModelStatus> {
  return request('/admin/answer-model/status', { method: 'GET' });
}

export function setAnswerModelKey(apiKey: string): Promise<AnswerModelStatus> {
  return request('/admin/answer-model', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey }),
  });
}

export function clearAnswerModelKey(): Promise<{ configured: boolean }> {
  return request('/admin/answer-model/key', { method: 'DELETE' });
}

// ----------------------------------------------------------------------------
// Admin — Guardrails configuration (Sprint 6, ADR-0019)
//
// The admin layer ON TOP of the hardcoded GuardrailService baseline. Every knob
// is additive / raise-only: the server applies stricter_of(baseline, admin) and
// REJECTS a below-floor value (422) — it is never clamped. The client mirrors
// the inline floor for fast feedback, but the SERVER is authoritative.
// ----------------------------------------------------------------------------

/** A threshold knob: the admin override (null = use the floor), the hardcoded floor, and the effective (stricter_of) value. */
export interface GuardrailThreshold {
  admin: number | null;
  floor: number;
  effective: number;
}

export interface GuardrailBlockedTopic {
  id: number;
  pattern: string;
  kind: 'blocked_topic' | 'off_domain';
  enabled: boolean;
  created_at: string | null;
  disabled_at: string | null;
}

export interface GuardrailHistoryEntry {
  field: string;
  old_value: string | null;
  new_value: string | null;
  actor: string | null;
  note: string | null;
  created_at: string | null;
}

export interface GuardrailConfig {
  can_manage: boolean;
  thresholds: {
    retrieval_score_floor: GuardrailThreshold;
    answer_confidence_floor: GuardrailThreshold;
    router_confidence_floor: GuardrailThreshold;
  };
  confidence_is_tiebreaker: boolean;
  off_domain_message: { value: string | null; default: string };
  tone_constraints: { value: string | null; max_len: number };
  convert_by_reason: { baseline: string[]; allowed: string[]; locked: string[] };
  blocked_topics: GuardrailBlockedTopic[];
  history: GuardrailHistoryEntry[];
}

/** The fields a super_admin may write. Only present fields are applied (partial save); a null value reverts/clears. */
export interface GuardrailConfigUpdate {
  retrieval_score_floor?: number | null;
  answer_confidence_floor?: number | null;
  router_confidence_floor?: number | null;
  off_domain_message?: string | null;
  tone_constraints?: string | null;
  convert_allowed_reasons?: string[];
}

export function getGuardrails(): Promise<GuardrailConfig> {
  return request('/admin/guardrails', { method: 'GET' });
}

export function updateGuardrails(update: GuardrailConfigUpdate): Promise<GuardrailConfig> {
  return request('/admin/guardrails', { method: 'POST', body: JSON.stringify(update) });
}

export function addGuardrailBlockedTopic(
  pattern: string,
  kind: 'blocked_topic' | 'off_domain',
): Promise<GuardrailConfig> {
  return request('/admin/guardrails/blocked-topics', {
    method: 'POST',
    body: JSON.stringify({ pattern, kind }),
  });
}

export function disableGuardrailBlockedTopic(id: number): Promise<GuardrailConfig> {
  return request(`/admin/guardrails/blocked-topics/${id}`, { method: 'DELETE' });
}

// ----------------------------------------------------------------------------
// Admin — Escalation board + the flywheel (Sprint 4)
// ----------------------------------------------------------------------------

export type EscalationStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export interface EscalationCardSummary {
  uuid: string;
  status: EscalationStatus;
  reason: string;
  reason_label: string;
  question: string | null;
  employee: {
    uuid: string;
    full_name: string;
    convenio: { id: number; numero: string; name: string } | null;
  } | null;
  assigned_to: { id: number; full_name: string } | null;
  topic: { id: number; name: string } | null;
  created_at: string | null;
  resolved_at: string | null;
}

export interface EscalationEvent {
  type: string;
  old_value: string | null;
  new_value: string | null;
  actor: string | null;
  note: string | null;
  created_at: string | null;
}

export interface EscalationDetail {
  card: EscalationCardSummary;
  conversation: ConversationMessage[];
  // Sprint-5 tightening (ADR-0018 §4.4): true when the caller lacks
  // escalation.work AND history.view_all (e.g. knowledge_editor) — the messages
  // are withheld server-side and `conversation` arrives empty.
  conversation_restricted?: boolean;
  resolution: {
    resolution_text: string;
    converted_to_document_id: number | null;
    document: { uuid: string; title: string } | null;
  } | null;
  events: EscalationEvent[];
}

export interface EscalationList {
  cards: EscalationCardSummary[];
  counts: Record<string, number>;
  statuses: EscalationStatus[];
}

export interface EscalationFilters {
  status?: string;
  reason?: string;
  assigned_to?: number;
  convenio_id?: number;
  unassigned?: boolean;
}

export function listEscalations(filters: EscalationFilters = {}): Promise<EscalationList> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return request(`/admin/escalations${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export function getEscalation(uuid: string): Promise<EscalationDetail> {
  return request(`/admin/escalations/${uuid}`, { method: 'GET' });
}

export function updateEscalation(
  uuid: string,
  patch: { status?: EscalationStatus; assigned_to?: number | null },
): Promise<{ card: EscalationCardSummary }> {
  return request(`/admin/escalations/${uuid}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function replyEscalation(
  uuid: string,
  content: string,
): Promise<{ message: { id: number; role: string; content: string; author_label: string; created_at: string | null } }> {
  return request(`/admin/escalations/${uuid}/reply`, { method: 'POST', body: JSON.stringify({ content }) });
}

export interface ResolveResult {
  card: EscalationCardSummary;
  document: { uuid: string; title: string } | null;
  publish: {
    chunks_written: number;
    page_count: number;
    round_trip: { lossless: boolean; chunk_count: number; expected_len: number; embedded_len: number };
  } | null;
}

// Sprint 7d (ADR-0024) — one overlapping passage of the scope's official convenio,
// as the semantic fence returns it in a 409 body. The score is shown next to the
// text because a number alone is not evidence: the human judges the passage.
export interface SemanticPassage {
  chunk_id: number | null;
  document_id: number | null;
  document_title: string | null;
  page_from: number | null;
  excerpt: string;
  score: number;
  probe_excerpt?: string | null;
}

export function resolveEscalation(
  uuid: string,
  payload: {
    resolution_text: string;
    convert: boolean;
    topic_id?: number | null;
    confirm_scope_change?: boolean;
    // Sprint 7d: satisfies ONLY the review band (`publish_requires_acknowledgement`).
    // Per-attempt and never stored; it can never unblock `publish_blocked`.
    acknowledge_semantic_overlap?: boolean;
  },
): Promise<ResolveResult> {
  return request(`/admin/escalations/${uuid}/resolve`, { method: 'POST', body: JSON.stringify(payload) });
}

// ----------------------------------------------------------------------------
// Admin — Employee directory (Sprint 5, ADR-0004). CRUD + search/filter + CSV
// bootstrap. Behind directory.manage; every change writes employee_audit_log.
// ----------------------------------------------------------------------------

export interface EmployeeRef {
  id: number;
  numero?: string;
  code?: string | null;
  name: string;
}

// Sprint 7f (ADR-0028) — an employee's structured group scope. NULL is normal and
// means "unresolved", which is what makes a group-scoped question escalate rather
// than guess, so the UI states it explicitly instead of showing an empty cell.
export interface EmployeeGroupScope {
  id: number;
  label: string;       // as printed in the convenio: "resto áreas"
  path_label: string;  // "Grupo 2 › resto áreas" for a sub-area
  code_normalized: string;
  is_sub_area: boolean;
}

export interface EmployeeListRow {
  uuid: string;
  full_name: string;
  email: string;
  status: string;
  convenio: { id: number; numero: string; name: string } | null;
  territory: { id: number; code: string | null; name: string } | null;
  job_category: { id: number; name: string } | null;
  convenio_group: EmployeeGroupScope | null;
  employment_type: string;
  profile_last_reviewed_at: string | null;
}

export interface EmployeeDetail {
  uuid: string;
  email: string;
  full_name: string;
  employee_external_id: string | null;
  convenio: { id: number; numero: string; name: string } | null;
  job_category: { id: number; name: string; group_code: string | null } | null;
  convenio_group: EmployeeGroupScope | null;
  territory: { id: number; code: string | null; name: string; level: string } | null;
  work_location: string | null;
  employment_type: string;
  start_date: string | null;
  status: string;
  profile_last_reviewed_at: string | null;
  convenio_id: number | null;
  job_category_id: number | null;
  convenio_group_id: number | null;
  territory_id: number | null;
}

export interface EmployeeAuditEntry {
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string | null;
}

export interface EmployeeWritePayload {
  email: string;
  full_name: string;
  employee_external_id?: string | null;
  convenio_id: number;
  job_category_id?: number | null;
  convenio_group_id?: number | null;
  territory_id: number;
  work_location?: string | null;
  employment_type: string;
  start_date?: string | null;
  status?: string;
  confirm_email_change?: boolean;
}

export interface CsvReportRow {
  row_number: number;
  email: string;
  full_name: string;
  action: 'create' | 'update' | 'skip';
  status: 'pass' | 'fail';
  errors: string[];
}

export interface CsvReport {
  ok: boolean;
  error?: string;
  summary: { total: number; valid: number; invalid: number; created: number; updated: number };
  rows: CsvReportRow[];
}

export function listEmployees(params: Record<string, string>): Promise<Paginated<EmployeeListRow>> {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/employees${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export function getEmployee(uuid: string): Promise<{ employee: EmployeeDetail; audit_log: EmployeeAuditEntry[] }> {
  return request(`/admin/employees/${uuid}`, { method: 'GET' });
}

export function createEmployee(payload: EmployeeWritePayload): Promise<{ employee: EmployeeDetail }> {
  return request('/admin/employees', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEmployee(uuid: string, payload: EmployeeWritePayload): Promise<{ employee: EmployeeDetail }> {
  return request(`/admin/employees/${uuid}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function markEmployeeReviewed(uuid: string): Promise<{ employee: EmployeeDetail }> {
  return request(`/admin/employees/${uuid}/mark-reviewed`, { method: 'POST' });
}

export function getJobCategories(convenioId: number): Promise<{ items: JobCategoryOption[] }> {
  return request(`/admin/job-categories?convenio_id=${convenioId}`, { method: 'GET' });
}

// A node of a convenio's APPROVED group structure, flattened parent-first with a
// depth so the picker can render two indented levels without knowing the tree
// rules. Proposed nodes are never returned (Sprint 7f, ADR-0028).
export interface ConvenioGroupOption {
  id: number;
  parent_id: number | null;
  depth: 0 | 1;
  code_normalized: string;
  label: string;
  path_label: string;
}

// `suggested_group_id` is a DEFAULT, never an assignment: where the employee's
// job category maps to exactly one approved node, the form pre-selects it and
// says so. Nothing is written until an admin saves.
export function getConvenioGroups(
  convenioId: number,
  jobCategoryId?: number | null,
): Promise<{ items: ConvenioGroupOption[]; suggested_group_id: number | null }> {
  const category = jobCategoryId ? `&job_category_id=${jobCategoryId}` : '';
  return request(`/admin/groups?convenio_id=${convenioId}${category}`, { method: 'GET' });
}

// --- Sprint 7f Phase 2 — the Groups review surface ---------------------------
// The AI proposes a convenio's group tree; a human approves it node by node.
// Every node arrives `ai_agent`/`needs_review` and is invisible to the answer
// path until approved.

export interface GroupConvenioRow {
  id: number;
  name: string;
  territory: string | null;
  pending: number;
  approved: number;
  rejected: number;
  group_scoped_facts: number;
}

/** A fact whose `group_label` resolves to a node, as shown on that node. */
export interface GroupBoundFact {
  fact_id: number;
  fact_status: string;
  group_label: string | null;
  value: string;
  kind: string;
  bound: boolean;
}

export interface GroupCategoryRow {
  membership_id: number;
  job_category_id: number;
  name: string | null;
  group_code_evidence: string | null;
  status: string;
  source: string;
}

export interface GroupNode {
  id: number;
  convenio_id: number;
  parent_id: number | null;
  label: string;
  code_normalized: string;
  /** Which `GroupCodeNormalizer` rule produced the key — shown before approval. */
  normalization_rule: string;
  source_excerpt: string | null;
  status: 'needs_review' | 'approved' | 'rejected';
  source: 'ai_agent' | 'admin_manual';
  proposal_batch_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  bound_fact_count: number;
  categories: GroupCategoryRow[];
  would_bind_facts: GroupBoundFact[];
  children: GroupNode[];
}

/** A fact the planner refuses to resolve — surfaced so it is not lost silently. */
export interface UnbindableFact {
  fact_id: number;
  fact_uuid: string;
  fact_status: string;
  group_label: string | null;
  value: string;
  status: string;
  kind: string;
  reason: string | null;
  already_bound: boolean;
  /** Labels of the nodes a human bound this to, despite the planner's refusal. */
  bound_to: string[];
}

export interface ConvenioGroupTree {
  convenio: { id: number; name: string; territory: string | null };
  tree: GroupNode[];
  orphans: GroupNode[];
  /** Flat, parent-first, for the manual-binding picker on the unbound list. */
  approved_nodes: Array<{ id: number; path_label: string }>;
  unbindable_facts: UnbindableFact[];
}

export interface BindingDiffFact {
  fact_id: number;
  fact_uuid: string;
  fact_status: string;
  group_label: string | null;
  value: string;
  validity_start: string | null;
  validity_end: string | null;
  kind: string;
  /** A compound fact lands on more than one node; the reviewer must see all of them. */
  also_binds_to_node_ids: number[];
  already_bound: boolean;
}

export interface BindingDiff {
  group: GroupNode;
  would_bind: BindingDiffFact[];
  needs_manual_binding: Array<{
    fact_id: number;
    group_label: string | null;
    value: string;
    kind: string;
    reason: string | null;
  }>;
  note: string;
}

export function listGroupConvenios(): Promise<{ convenios: GroupConvenioRow[] }> {
  return request('/admin/convenio-groups', { method: 'GET' });
}

export function getConvenioGroupTree(convenioId: number): Promise<ConvenioGroupTree> {
  return request(`/admin/convenio-groups/convenio/${convenioId}`, { method: 'GET' });
}

/** A READ. Approving writes only the facts sent back from this diff. */
export function getGroupBindingDiff(groupId: number): Promise<BindingDiff> {
  return request(`/admin/convenio-groups/${groupId}/binding-diff`, { method: 'GET' });
}

export function approveConvenioGroup(
  groupId: number,
  payload: { confirmed_fact_ids: number[]; confirmed_category_ids?: number[]; note?: string },
): Promise<{ status: string; group: GroupNode; bound_fact_ids: number[] }> {
  return request(`/admin/convenio-groups/${groupId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateConvenioGroup(
  groupId: number,
  payload: { label?: string; source_excerpt?: string | null; parent_id?: number | null },
): Promise<{ status: string; group: GroupNode }> {
  return request(`/admin/convenio-groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function rejectConvenioGroup(groupId: number, reason?: string): Promise<{ status: string; group: GroupNode }> {
  return request(`/admin/convenio-groups/${groupId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

/**
 * Bind facts to an already-approved node. Binding is a separate decision from
 * approval, so approving a node with a fact unticked is not final.
 *
 * `override` is the lane for a label the planner refuses to read and a human
 * decides anyway ("Grupo 2 excepto área cinco" does mean `resto áreas`, but
 * only because someone read the convenio). It is recorded as asserted rather
 * than read, and it cannot bind a fact whose label resolves elsewhere.
 */
export function bindGroupFacts(
  groupId: number,
  payload: { fact_ids: number[]; override?: boolean; note?: string },
): Promise<{ status: string; group: GroupNode; bound_fact_ids: number[] }> {
  return request(`/admin/convenio-groups/${groupId}/bind`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function unbindGroupFact(groupId: number, factId: number): Promise<{ status: string; removed: number }> {
  return request(`/admin/convenio-groups/${groupId}/bindings/${factId}`, { method: 'DELETE' });
}

export function proposeConvenioGroups(convenioId: number): Promise<{ status: string; convenio_id: number }> {
  return request(`/admin/convenio-groups/convenio/${convenioId}/propose`, { method: 'POST' });
}

function uploadCsv(path: string, file: File): Promise<CsvReport> {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: form }).then(async (res) => {
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, (data && (data.message as string)) || `Upload failed (${res.status})`, data ?? null);
    return data as CsvReport;
  });
}

export function validateEmployeeCsv(file: File): Promise<CsvReport> {
  return uploadCsv('/admin/employees/import/validate', file);
}

export function importEmployeeCsv(file: File): Promise<CsvReport> {
  return uploadCsv('/admin/employees/import', file);
}

// ----------------------------------------------------------------------------
// Admin — Admin & role management (Sprint 5). Behind admin.manage (super_admin).
// ----------------------------------------------------------------------------

export interface AdminRow {
  uuid: string;
  email: string;
  full_name: string;
  status: string;
  roles: string[];
  abilities: Record<string, boolean>;
}

export function listAdmins(): Promise<{ admins: AdminRow[]; roles: string[] }> {
  return request('/admin/admins', { method: 'GET' });
}

export function createAdmin(payload: { email: string; full_name: string; status?: string; roles?: string[] }): Promise<{ admin: AdminRow }> {
  return request('/admin/admins', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAdmin(uuid: string, payload: { full_name?: string; status?: string }): Promise<{ admin: AdminRow }> {
  return request(`/admin/admins/${uuid}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function syncAdminRoles(uuid: string, roles: string[]): Promise<{ admin: AdminRow }> {
  return request(`/admin/admins/${uuid}/roles`, { method: 'PUT', body: JSON.stringify({ roles }) });
}

// ----------------------------------------------------------------------------
// Admin — Full conversation History (Sprint 5, ADR-0018). Behind
// history.view_all (super_admin + auditor). EVERY access is logged server-side.
// ----------------------------------------------------------------------------

export interface HistoryRow {
  session_uuid: string;
  employee: {
    uuid: string;
    full_name: string;
    convenio: { numero: string; name: string } | null;
    territory: { code: string | null; name: string } | null;
  } | null;
  started_at: string | null;
  last_activity_at: string | null;
  message_count: number;
  escalated: boolean;
  escalation_reason: string | null;
}

export interface HistoryConversation {
  session_uuid: string;
  employee: { uuid: string; full_name: string; convenio: { numero: string; name: string } | null } | null;
  started_at: string | null;
  last_activity_at: string | null;
  messages: ConversationMessage[];
}

export interface HistorySearchMatch {
  session_uuid: string | null;
  employee: { uuid: string; full_name: string } | null;
  role: string;
  snippet: string;
  last_activity_at: string | null;
}

export interface HistoryFilters {
  employee_uuid?: string;
  convenio_id?: number;
  territory_id?: number;
  from?: string;
  to?: string;
  reason?: string;
  outcome?: 'answered' | 'escalated';
}

export function listHistory(filters: HistoryFilters = {}): Promise<Paginated<HistoryRow>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return request(`/admin/history/conversations${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export function getHistoryConversation(sessionUuid: string): Promise<HistoryConversation> {
  return request(`/admin/history/conversations/${sessionUuid}`, { method: 'GET' });
}

export function searchHistory(q: string): Promise<{ query: string; matches: HistorySearchMatch[] }> {
  return request(`/admin/history/search?q=${encodeURIComponent(q)}`, { method: 'GET' });
}

// ----------------------------------------------------------------------------
// Admin — Sprint 7a: managed vocabulary growth (propose → approve, ADR-0011/0020)
// ----------------------------------------------------------------------------

export type VocabularyFacet = 'territory' | 'sector' | 'convenio';

export interface VariantSuggestion {
  type: VocabularyFacet;
  id: number;
  name: string;
  similarity: number;
}

export interface VocabularyProposal {
  id: number;
  facet: VocabularyFacet;
  proposed_value: string;
  variant_of: { type: string; id: number; similarity: number | null } | null;
  resolution: 'alias' | 'new_value' | null;
  status: 'proposed' | 'approved' | 'rejected';
  proposed_by_source: 'ai_agent' | 'admin_manual';
  proposed_by: string | null;
  approved_by: string | null;
  source_document: { uuid: string; title: string } | null;
  review_task_id: number | null;
  note: string | null;
  created_at: string | null;
}

export function listVocabularyProposals(status = 'proposed'): Promise<{ proposals: VocabularyProposal[]; can_approve: boolean }> {
  return request(`/admin/vocabulary-proposals?status=${encodeURIComponent(status)}`, { method: 'GET' });
}

export function suggestVocabularyVariant(facet: VocabularyFacet, value: string): Promise<{ variant: VariantSuggestion | null; threshold: number }> {
  const qs = new URLSearchParams({ facet, value }).toString();
  return request(`/admin/vocabulary-proposals/suggest?${qs}`, { method: 'GET' });
}

export interface ProposeVocabularyPayload {
  facet: VocabularyFacet;
  value: string;
  source_document_uuid?: string | null;
  review_task_id?: number | null;
  note?: string | null;
  // Super_admin propose-and-approve in one action (requires vocabulary.approve).
  approve_now?: boolean;
  resolution?: 'alias' | 'new_value';
  target_id?: number | null;
  level?: 'national' | 'regional' | 'provincial';
}

export function proposeVocabulary(payload: ProposeVocabularyPayload): Promise<{ proposal: VocabularyProposal; approved?: unknown }> {
  return request('/admin/vocabulary-proposals', { method: 'POST', body: JSON.stringify(payload) });
}

export function approveVocabularyProposal(
  id: number,
  payload: { resolution: 'alias' | 'new_value'; target_id?: number | null; level?: 'national' | 'regional' | 'provincial' },
): Promise<{ status: string; result: unknown; proposal: VocabularyProposal }> {
  return request(`/admin/vocabulary-proposals/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) });
}

export function rejectVocabularyProposal(id: number, note?: string): Promise<{ status: string; proposal: VocabularyProposal }> {
  return request(`/admin/vocabulary-proposals/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
}

// ----------------------------------------------------------------------------
// Admin — Sprint 7a: expiry queue + lineage write-side (human-confirmed)
// ----------------------------------------------------------------------------

export interface SuccessorCandidate {
  uuid: string;
  title: string;
  validity_start: string | null;
  validity_end: string | null;
  retrieval_status: string;
}

export interface ExpiryTask {
  task_id: number;
  due_date: string | null;
  past: boolean;
  document: {
    uuid: string;
    title: string;
    convenio: { id: number; numero: string; name: string } | null;
    validity_start: string | null;
    validity_end: string | null;
    retrieval_status: string;
  } | null;
  is_unscoped: boolean;
  successor_candidates: SuccessorCandidate[];
  // Sprint 7d (ADR-0024) part C — the INERT AI succession suggestion. Rendered
  // fuchsia while `is_ai_proposed`; confirming it goes through the unchanged 7a
  // `resolveExpiryTask` write-side, which is the only writer of lineage.
  ai_proposal: SuccessionProposal | null;
  ai_proposal_status: 'proposed' | 'confirmed' | 'rejected' | null;
  ai_proposed_at: string | null;
  is_ai_proposed: boolean;
}

export interface SuccessionProposal {
  // null = nothing could be proposed; `reason` says why (never an empty box).
  relationship: 'successor' | 'conflict' | 'coexisting_sibling' | 'uncertain' | null;
  reason?: string | null;
  candidate_document_id?: number;
  candidate_document_uuid?: string;
  candidate_title?: string;
  candidate_retrieval_status?: string;
  max_score?: number;
  mean_top3?: number;
  thresholds?: { overlap: number; sibling_ceiling: number };
  validity?: { expiring: [string | null, string | null]; candidate: [string | null, string | null] };
  passages?: {
    expiring_chunk_id: number | null;
    candidate_chunk_id: number | null;
    expiring_excerpt: string;
    candidate_excerpt: string;
    score: number;
  }[];
  uncertainty?: { field: string; reason: string } | null;
  source: 'ai_agent';
}

export function getExpiryQueue(): Promise<{ tasks: ExpiryTask[] }> {
  return request('/admin/review/expiry', { method: 'GET' });
}

export interface ResolveExpiryPayload {
  action: 'link_successor' | 'dismiss' | 'escalate';
  successor_uuid?: string;
  retire_predecessor?: boolean;
  confirm_scope_change?: boolean;
  note?: string;
}

export function resolveExpiryTask(taskId: number, payload: ResolveExpiryPayload): Promise<Record<string, unknown>> {
  return request(`/admin/review/expiry/${taskId}/resolve`, { method: 'POST', body: JSON.stringify(payload) });
}

// Sprint 7d (ADR-0024) part C — (re-)ask for the inert successor suggestion, and
// reject one. Neither writes lineage or retrieval_status: rejecting a suggestion
// leaves the expiry task OPEN, because the document is still expiring.
export function proposeSuccession(taskId: number): Promise<{ status: string; task_id: number }> {
  return request(`/admin/review/expiry/${taskId}/propose-succession`, { method: 'POST' });
}

export function rejectSuccessionProposal(
  taskId: number,
  note?: string,
): Promise<{ status: string; ai_proposal_status: string; task_status: string }> {
  return request(`/admin/review/expiry/${taskId}/reject-proposal`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

export async function uploadDocuments(files: FileList, asReference = false): Promise<{ results: unknown[] }> {
  const form = new FormData();
  Array.from(files).forEach((file) => {
    form.append('files[]', file);
    // webkitRelativePath preserves the folder grouping (province/Antiguo/…).
    form.append('relative_paths[]', (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
  });
  // Sprint 7b-1 (ADR-0021): mark a Structured Reference SOURCE upload — a
  // non-salary .docx/.xlsx read for content + fed to the manual fact path. The
  // deliberate routing tag (Invariant 2): never salary, never embedded.
  if (asReference) form.append('as_reference', '1');

  const token = getToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}/admin/documents/upload`, { method: 'POST', headers, body: form });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data && (data.message as string)) || `Upload failed (${res.status})`);
  return data as { results: unknown[] };
}

// ----------------------------------------------------------------------------
// Admin — Structured Reference Knowledge (Sprint 7b-1, ADR-0021). A non-vectorized
// scoped-fact class with the MANUAL create/verify path. No AI (the ai_agent lane
// is 7b-2), no answering (that is 7c) — these endpoints STORE + DISPLAY only.
// Authority is structurally bounded: a fact can only ever be `structured_reference`.
// ----------------------------------------------------------------------------

/** The one authority level a reference fact may carry (INVARIANT 1). */
export const REFERENCE_AUTHORITY_LEVEL = 'structured_reference';

// Sprint 7b-2: the structured uncertainty flag {field, reason} (not a flat
// boolean) so "scope unclear" / "compound group" / "possible version" are
// distinguishable and sortable.
export interface FactUncertainty {
  field: string; // scope | group | version | value
  reason: string;
}

export type ReferenceFactStatus = 'needs_review' | 'verified' | 'rejected';

export interface ReferenceFactRow {
  uuid: string;
  value: string;
  convenio: string | null;
  territory: string | null;
  sector: string | null;
  job_category: string | null;
  group_label: string | null; // Sprint 7b-2 — the group AS WRITTEN
  topic: string | null;
  status: ReferenceFactStatus;
  source: 'admin_manual' | 'ai_agent';
  authority_level: string;
  validity_start: string | null;
  validity_end: string | null;
  // Sprint 7b-2 — the AI review-queue safety fields.
  confidence: number | null;
  uncertainty: FactUncertainty | null;
  source_excerpt: string | null;
  is_ai_proposed: boolean;
  is_possible_duplicate: boolean;
  // Sprint 7d — the 7b-2 flag is now actionable, so the row says whether it is
  // still waiting on a human. A resolved duplicate keeps its lineage and leaves
  // the "needs attention" set.
  resolution: FactResolution | null;
  is_unresolved_duplicate: boolean;
}

export interface ReferenceFactProvenanceEvent {
  facet: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  actor_id: number | null;
  confidence: number | null;
  note: string | null;
  created_at: string;
}

export interface ReferenceFactCard {
  uuid: string;
  value: string;
  raw_values: Record<string, unknown> | null;
  scope: {
    convenio: { id: number; numero: string; name: string } | null;
    territory: { name: string; level: string } | null; // derived (read-only)
    sector: { name: string } | null; // derived (read-only)
    job_category: { id: number; name: string; group_code: string | null } | null;
    group_label: string | null; // Sprint 7b-2 — the group AS WRITTEN
  };
  topic: { id: number; name: string } | null;
  validity_start: string | null;
  validity_end: string | null;
  authority_level: string;
  source: 'admin_manual' | 'ai_agent';
  status: ReferenceFactStatus;
  is_ai_proposed: boolean; // ai_agent + needs_review → fuchsia until verified
  // Sprint 7b-2 — the segmentation metadata the reviewer judges against.
  confidence: number | null;
  uncertainty: FactUncertainty | null;
  source_excerpt: string | null;
  proposal_batch_id: string | null;
  duplicate_of: { uuid: string; value: string } | null; // the version FLAG (7d resolves)
  // Sprint 7d — the human's verdict and the resulting version lineage. The
  // duplicate link is RETAINED after resolution: the flag is resolved, not erased.
  resolution: FactResolution | null;
  resolved_by: string | null;
  resolved_at: string | null;
  superseded_by: { uuid: string; value: string; validity_start: string | null } | null;
  is_unresolved_duplicate: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  source_document: { uuid: string; title: string; source_filename: string | null } | null;
  source_locator: string | null;
  provenance: ReferenceFactProvenanceEvent[];
}

export interface ReferenceSourceDoc {
  id: number;
  uuid: string;
  title: string;
  source_filename: string | null;
}

export interface ReferenceSourceContent {
  uuid: string;
  title: string;
  pages: { page_number: number; text: string }[];
}

export interface CreateReferenceFactPayload {
  convenio_id: number;
  job_category_id?: number | null;
  topic_id?: number | null;
  value: string;
  raw_values?: Record<string, unknown> | null;
  validity_start?: string | null;
  validity_end?: string | null;
  source_document_id?: number | null;
  source_locator?: string | null;
}

export type UpdateReferenceFactPayload = Partial<CreateReferenceFactPayload> & {
  confirm_scope_change?: boolean;
};

export function listReferenceFacts(params: Record<string, string> = {}): Promise<{ facts: Paginated<ReferenceFactRow> }> {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/reference-facts${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export function getReferenceFact(uuid: string): Promise<ReferenceFactCard> {
  return request(`/admin/reference-facts/${uuid}`, { method: 'GET' });
}

export function createReferenceFact(payload: CreateReferenceFactPayload): Promise<{ status: string; uuid: string }> {
  return request('/admin/reference-facts', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateReferenceFact(uuid: string, payload: UpdateReferenceFactPayload): Promise<{ status: string }> {
  return request(`/admin/reference-facts/${uuid}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function verifyReferenceFact(uuid: string): Promise<{ status: string; fact_status: string }> {
  return request(`/admin/reference-facts/${uuid}/verify`, { method: 'POST' });
}

// Sprint 7b-2 — reject an AI proposal (auditable, no delete) and (re-)run the
// segmentation agent on a reference source.
export function rejectReferenceFact(uuid: string, reason?: string): Promise<{ status: string; fact_status: string }> {
  return request(`/admin/reference-facts/${uuid}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

// ----------------------------------------------------------------------------
// Sprint 7d (ADR-0024) — the fact VERSION resolution surface. 7b-2 could only
// FLAG a duplicate; this resolves it. `supersede` closes the older fact's
// validity window and never deletes, so a question dated in the past still gets
// the answer that was true then.
// ----------------------------------------------------------------------------

export type FactResolution = 'superseded' | 'supersedes' | 'coexists' | 'rejected_duplicate';

export interface FactPairSide {
  uuid: string;
  id: number;
  value: string;
  raw_values: Record<string, unknown> | null;
  convenio: string | null;
  convenio_name: string | null;
  territory: string | null;
  sector: string | null;
  job_category: string | null;
  group_label: string | null;
  topic: string | null;
  validity_start: string | null;
  validity_end: string | null;
  status: ReferenceFactStatus;
  source: 'admin_manual' | 'ai_agent';
  confidence: number | null;
  uncertainty: FactUncertainty | null;
  source_excerpt: string | null;
  source_document: { uuid: string; title: string; source_filename: string | null } | null;
  source_locator: string | null;
  resolution: FactResolution | null;
  resolved_by: string | null;
  resolved_at: string | null;
  superseded_by_id: number | null;
}

export interface FactDuplicatePair {
  pair: [FactPairSide, FactPairSide];
  differing_fields: string[];
  resolved: boolean;
  // Only the validity dates can justify a direction, so the UI pre-selects from
  // this and never infers one itself; `possible: false` carries the reason.
  supersede_candidate:
    | { possible: true; newer_uuid: string; older_uuid: string; would_close_older_at: string }
    | { possible: false; reason: string };
}

export function getFactDuplicatePair(uuid: string): Promise<FactDuplicatePair> {
  return request(`/admin/reference-facts/${uuid}/duplicate-pair`, { method: 'GET' });
}

export interface ResolveFactDuplicatePayload {
  action: 'supersede' | 'coexist' | 'reject';
  newer_uuid?: string; // required for supersede — the human names the direction
  note?: string;
}

export function resolveFactDuplicate(
  uuid: string,
  payload: ResolveFactDuplicatePayload,
): Promise<Record<string, unknown>> {
  return request(`/admin/reference-facts/${uuid}/resolve-duplicate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function segmentReferenceSource(uuid: string): Promise<{ status: string; document_uuid: string }> {
  return request(`/admin/reference-sources/${uuid}/segment`, { method: 'POST' });
}

export function listReferenceSources(): Promise<{ sources: ReferenceSourceDoc[] }> {
  return request('/admin/reference-facts/sources', { method: 'GET' });
}

export function getReferenceSourceContent(uuid: string): Promise<ReferenceSourceContent> {
  return request(`/admin/reference-sources/${uuid}/content`, { method: 'GET' });
}
