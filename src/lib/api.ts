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
  has_open_conflict: boolean;
  has_open_review: boolean;
  empty_text: boolean;
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
  doc_uuid?: string;
  document_type?: string | null;
  retrieval_status?: string;
  tagging_status?: string;
  authority_level?: string;
  validity_start?: string | null;
  validity_end?: string | null;
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

export function resolveEscalation(
  uuid: string,
  payload: { resolution_text: string; convert: boolean; topic_id?: number | null; confirm_scope_change?: boolean },
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

export interface EmployeeListRow {
  uuid: string;
  full_name: string;
  email: string;
  status: string;
  convenio: { id: number; numero: string; name: string } | null;
  territory: { id: number; code: string | null; name: string } | null;
  job_category: { id: number; name: string } | null;
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
  territory: { id: number; code: string | null; name: string; level: string } | null;
  work_location: string | null;
  employment_type: string;
  start_date: string | null;
  status: string;
  profile_last_reviewed_at: string | null;
  convenio_id: number | null;
  job_category_id: number | null;
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

export async function uploadDocuments(files: FileList): Promise<{ results: unknown[] }> {
  const form = new FormData();
  Array.from(files).forEach((file) => {
    form.append('files[]', file);
    // webkitRelativePath preserves the folder grouping (province/Antiguo/…).
    form.append('relative_paths[]', (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
  });

  const token = getToken();
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}/admin/documents/upload`, { method: 'POST', headers, body: form });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data && (data.message as string)) || `Upload failed (${res.status})`);
  return data as { results: unknown[] };
}
