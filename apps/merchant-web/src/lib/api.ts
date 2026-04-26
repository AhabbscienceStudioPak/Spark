/**
 * Merchant web API client.
 * Base URL points to the API gateway (port 3000).
 * JWT stored in localStorage, auto-attached to every request.
 * 401 responses redirect to /login.
 */
import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('merchant_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthRoute = error.config?.url?.includes('/auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('merchant_token');
        localStorage.removeItem('merchant_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  display_name: string;
  merchant_id: string | null;
}

export async function loginMerchant(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
    '/auth/login',
    { email, password },
  );
  localStorage.setItem('merchant_token', res.data.access_token);
  localStorage.setItem('merchant_refresh', res.data.refresh_token);
  localStorage.setItem('merchant_user', JSON.stringify(res.data.user));
  return res.data.user;
}

export function logoutMerchant(): void {
  const refresh = localStorage.getItem('merchant_refresh');
  if (refresh) {
    api.post('/auth/logout', { refresh_token: refresh }).catch(() => {});
  }
  localStorage.removeItem('merchant_token');
  localStorage.removeItem('merchant_refresh');
  localStorage.removeItem('merchant_user');
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('merchant_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

// ── API helpers ───────────────────────────────────────────────────────────────

export async function getPerformance(merchantId: string, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const res = await api.get(`/api/v1/merchants/${merchantId}/performance?${params}`);
  return res.data.data;
}

export async function getCampaignRules(merchantId: string) {
  const res = await api.get(`/api/v1/merchants/${merchantId}/campaign-rules`);
  return res.data.data;
}

export async function createCampaignRule(merchantId: string, rule: object) {
  const res = await api.post(`/api/v1/merchants/${merchantId}/campaign-rules`, rule);
  return res.data.data;
}

export async function toggleCampaignRule(merchantId: string, ruleId: string, isActive: boolean) {
  const res = await api.patch(`/api/v1/merchants/${merchantId}/campaign-rules/${ruleId}/toggle`, { is_active: isActive });
  return res.data.data;
}

export async function getPendingOffers(merchantId: string) {
  const res = await api.get(`/api/v1/offers?merchant_id=${merchantId}&status=pending_approval`);
  return res.data.data ?? [];
}

export async function approveOffer(offerId: string) {
  const res = await api.patch(`/api/v1/offers/${offerId}/approve`);
  return res.data.data;
}

export async function rejectOffer(offerId: string, reason: string) {
  const res = await api.patch(`/api/v1/offers/${offerId}/reject`, { reason });
  return res.data.data;
}
