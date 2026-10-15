import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

// ── Typed API error shape ─────────────────────────────────────────────────────

interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number | undefined,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Returns true for 401 (expired session) */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Returns true for 403 (wrong role) */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /** Returns true for 429 (quota / rate limit) */
  isRateLimit(): boolean {
    return this.status === 429;
  }
}

// ── Axios client factory ──────────────────────────────────────────────────────

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,       // Send the httpOnly amp_token cookie
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  // Request interceptor — inject request-id for distributed tracing
  client.interceptors.request.use((config) => {
    config.headers['x-request-id'] = crypto.randomUUID();
    return config;
  });

  // Response interceptor — convert error responses to ApiError
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const errPayload = error.response?.data?.error;

      if (errPayload) {
        throw new ApiError(errPayload.code, errPayload.message, status, errPayload.details);
      }

      if (error.code === 'ECONNABORTED') {
        throw new ApiError('TIMEOUT', 'The request timed out. Please try again.', undefined);
      }

      throw new ApiError(
        'NETWORK_ERROR',
        'A network error occurred. Please check your connection.',
        undefined,
      );
    },
  );

  return client;
}

/** Singleton Axios instance — import this everywhere instead of using `fetch`. */
export const apiClient = createApiClient();
