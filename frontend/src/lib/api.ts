import { API_URL } from '../config';
import type {
  AskAnswer,
  BrandCount,
  ConditionCount,
  MarketStats,
  MileageDistribution,
  MileagePoint,
  PriceBucket,
  StateStats,
  VehicleAnalysis,
  YearTrend,
} from './types';

/** An API failure with a stable `code` the UI can turn into a message. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function errorFromBody(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (detail && typeof detail === 'object' && 'code' in detail) {
    const { code, message } = detail as { code: string; message?: string };
    return new ApiError(status, code, message ?? code);
  }
  if (typeof detail === 'string') return new ApiError(status, `http_${status}`, detail);
  return new ApiError(status, `http_${status}`, `Request failed with status ${status}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'network', 'The API could not be reached.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw errorFromBody(response.status, body);
  return body as T;
}

/** Hex SHA-256 of the UTF-8 bytes of `text`. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** POST a JSON body. In the cloud CloudFront signs requests to the API (origin access control),
 * and for a request with a body it needs the body's SHA-256 from the client. */
async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-amz-content-sha256': await sha256Hex(body) },
    body,
  });
}

const query = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const api = {
  stats: () => request<MarketStats>('/market/stats'),
  trend: () => request<YearTrend[]>('/market/trend'),
  conditions: () => request<ConditionCount[]>('/market/condition'),
  histogram: () => request<PriceBucket[]>('/market/histogram'),
  mileageDistribution: () => request<MileageDistribution>('/market/mileage'),
  states: () => request<StateStats[]>('/market/geo'),
  topBrands: (limit = 10) => request<BrandCount[]>(`/market/brands?limit=${limit}`),
  brands: () => request<string[]>('/brands'),
  models: (brand: string) => request<string[]>(`/models/${encodeURIComponent(brand)}`),
  vehicle: (brand: string, model: string) =>
    request<VehicleAnalysis>(`/vehicles/depreciation?${query({ brand, model })}`),
  mileage: (brand: string, model: string) =>
    request<MileagePoint[]>(`/vehicles/mileage?${query({ brand, model })}`),
  askExamples: () => request<string[]>('/ask/examples'),
  ask: (question: string) => postJson<AskAnswer>('/ask', { question }),
};
