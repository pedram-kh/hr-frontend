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
  uuid: string;
  email: string;
  full_name: string;
  status: string;
  roles?: string[];
  profile?: EmployeeProfile;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
    throw new ApiError(res.status, message);
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
  pages: DocumentPage[];
  empty_text: boolean;
  review_tasks: ReviewTask[];
  provenance: ProvenanceEvent[];
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

export function reassignFacet(uuid: string, facet: string, valueId: number): Promise<{ status: string }> {
  return request(`/admin/documents/${uuid}/facets/${facet}`, {
    method: 'PATCH',
    body: JSON.stringify({ value_id: valueId }),
  });
}

export function getVocabulary(type: string): Promise<{ items: VocabularyItem[] }> {
  return request(`/admin/vocabulary/${type}`, { method: 'GET' });
}

export function getPageImageUrl(uuid: string, page: number): Promise<{ url: string }> {
  return request(`/admin/documents/${uuid}/pages/${page}/image`, { method: 'GET' });
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
