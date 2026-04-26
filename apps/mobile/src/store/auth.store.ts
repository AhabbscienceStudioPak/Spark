/**
 * Auth store — login, register, token refresh, logout.
 * Tokens stored in SecureStore (encrypted on-device).
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../services/api.client';
import { registerPushToken, unregisterPushToken } from '../services/push.service';

interface User {
  id: string;
  email: string;
  role: 'consumer' | 'merchant' | 'admin';
  display_name: string;
  merchant_id: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

const KEYS = {
  accessToken: 'auth_token',
  refreshToken: 'refresh_token',
  user: 'auth_user',
} as const;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>('/auth/login', { email, password });

      await _saveTokens(res.data.access_token, res.data.refresh_token, res.data.user);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      // Register push token after login (Req 15)
      void registerPushToken();
    } catch (err: unknown) {
      const msg = _extractError(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>('/auth/register', {
        email,
        password,
        display_name: displayName,
        role: 'consumer',
      });

      await _saveTokens(res.data.access_token, res.data.refresh_token, res.data.user);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      void registerPushToken();
    } catch (err: unknown) {
      const msg = _extractError(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(KEYS.refreshToken);
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
      }
      await unregisterPushToken();
    } finally {
      await SecureStore.deleteItemAsync(KEYS.accessToken);
      await SecureStore.deleteItemAsync(KEYS.refreshToken);
      await SecureStore.deleteItemAsync(KEYS.user);
      set({ user: null, isAuthenticated: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const [accessToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(KEYS.accessToken),
        SecureStore.getItemAsync(KEYS.user),
      ]);

      if (!accessToken || !userJson) {
        set({ isLoading: false });
        return;
      }

      // Try to use the stored access token
      const user = JSON.parse(userJson) as User;
      set({ user, isAuthenticated: true, isLoading: false });

      // Silently refresh in background if token is close to expiry
      void _silentRefresh();
    } catch {
      set({ isLoading: false });
    }
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _saveTokens(accessToken: string, refreshToken: string, user: User): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
  ]);
}

async function _silentRefresh(): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync(KEYS.refreshToken);
    if (!refreshToken) return;

    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>('/auth/refresh', { refresh_token: refreshToken });

    await _saveTokens(res.data.access_token, res.data.refresh_token, res.data.user);
    useAuthStore.setState({ user: res.data.user, isAuthenticated: true });
  } catch {
    // Refresh failed — user needs to log in again
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('auth_user');
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
}

function _extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: { message?: string } | string } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'object' && detail?.message) return detail.message;
    if (typeof detail === 'string') return detail;
  }
  return 'Something went wrong. Please try again.';
}
