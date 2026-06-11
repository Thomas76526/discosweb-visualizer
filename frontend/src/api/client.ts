/**
 * Thin fetch wrapper for the Discosweb backend.
 *
 * Conventions:
 *   - JSON envelope: { data, error, meta? }
 *   - Errors throw ApiError so callers can branch on status
 *   - Adds a default timeout so a hung request never freezes the UI
 */

export interface ApiEnvelope<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  /** Override default base URL */
  baseUrl?: string;
  /** Request timeout in ms (default 30s) */
  timeoutMs?: number;
  /** Query string parameters */
  query?: Record<string, string | number | boolean | undefined>;
}

const DEFAULT_BASE = '/api';
const DEFAULT_TIMEOUT = 30_000;

function buildUrl(base: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base, 'http:');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return `${url.pathname}${url.search}`;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    baseUrl = DEFAULT_BASE,
    timeoutMs = DEFAULT_TIMEOUT,
    query,
    headers,
    ...rest
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildUrl(baseUrl, path, query), {
      ...rest,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      let code: string | undefined;
      try {
        const env = (await res.json()) as ApiEnvelope<unknown>;
        if (env.error) {
          message = env.error.message;
          code = env.error.code;
        }
      } catch {
        // body wasn't JSON — keep generic message
      }
      throw new ApiError(message, res.status, code);
    }

    const env = (await res.json()) as ApiEnvelope<T>;
    if (env.error) {
      throw new ApiError(env.error.message, res.status, env.error.code);
    }
    return env.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    throw new ApiError((err as Error).message ?? 'Network error', 0, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};