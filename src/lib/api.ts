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
  province: { code: string; name: string } | null;
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
