/**
 * Axios client with:
 * - JWT Bearer token on every request
 * - Automatic token refresh on 401 (single retry)
 * - Auth endpoints bypass token requirement
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Auth endpoints don't need a token
  const isAuthRoute = config.url?.startsWith('/auth/');
  if (!isAuthRoute) {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.startsWith('/auth/')) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post<{ access_token: string; refresh_token: string }>(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
        );

        const { access_token, refresh_token: newRefresh } = res.data;
        await SecureStore.setItemAsync('auth_token', access_token);
        await SecureStore.setItemAsync('refresh_token', newRefresh);

        // Flush queued requests
        refreshQueue.forEach((cb) => cb(access_token));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear tokens, user must log in again
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('auth_user');
        refreshQueue = [];
        // The auth store will detect this and redirect to login
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
