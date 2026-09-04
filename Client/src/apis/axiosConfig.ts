import { message } from 'antd';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = `${process.env.NEXT_PUBLIC_SERVER_URL}/api`;
const ACCESS_TOKEN_KEY = 'ACCESS_TOKEN';
const REFRESH_URL = '/auth/refresh-token';

/** Emitted when refresh fails so AuthContext can sign the user out. */
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

// When a session dies, every request in flight fails at once. The user should hear about
// it once - not once per request.
let sessionExpiredNotified = false;

/** Same text within a short window -> one toast (a burst of failing requests reads as one problem). */
const recentToasts = new Map<string, number>();
const toastOnce = (text: string) => {
   const now = Date.now();
   for (const [key, at] of recentToasts) if (now - at > 2500) recentToasts.delete(key);
   if (recentToasts.has(text)) return;
   recentToasts.set(text, now);
   message.error(text);
};

export const getAccessToken = (): string | null => {
   const raw = localStorage.getItem(ACCESS_TOKEN_KEY);
   if (!raw) return null;
   try {
      return JSON.parse(raw);
   } catch {
      return null;
   }
};

export const setAccessToken = (token: string) => {
   localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(token));
   // a fresh session may expire again later - allow the next notification
   sessionExpiredNotified = false;
};

export const clearAccessToken = () => {
   localStorage.removeItem(ACCESS_TOKEN_KEY);
};

const instance = axios.create({
   baseURL: BASE_URL,
   withCredentials: true,
});

instance.interceptors.request.use((config) => {
   const token = getAccessToken();
   if (token) {
      config.headers.authorization = `Bearer ${token}`;
   }
   return config;
});

// Single-flight: 401s arriving while a refresh is in flight all await
// this same promise, then retry together once it resolves.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
   if (!refreshPromise) {
      // Use bare axios (no interceptors) to avoid a 401 -> refresh -> 401 loop
      refreshPromise = axios
         .post(`${BASE_URL}${REFRESH_URL}`, null, { withCredentials: true })
         .then((res) => {
            const newToken: string | undefined = res.data?.data?.accessToken;
            if (!newToken) {
               throw new Error(res.data?.message || 'Refresh token failed');
            }
            setAccessToken(newToken);
            return newToken;
         })
         .finally(() => {
            // Reset after settling (success or failure) so the next 401 can refresh again
            refreshPromise = null;
         });
   }
   return refreshPromise;
};

interface RetriableConfig extends InternalAxiosRequestConfig {
   _retry?: boolean;
}

declare module 'axios' {
   export interface AxiosRequestConfig {
      /** Skip the global error toast — for screens that render their own error UI. */
      skipErrorToast?: boolean;
   }
}

instance.interceptors.response.use(
   (response: AxiosResponse) => response?.data,
   async (error: AxiosError) => {
      const originalRequest = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      const isRefreshable =
         status === 401 &&
         originalRequest &&
         !originalRequest._retry &&
         !originalRequest.url?.includes(REFRESH_URL) &&
         !!getAccessToken();

      if (isRefreshable) {
         originalRequest._retry = true;
         try {
            const newToken = await refreshAccessToken();
            originalRequest.headers.authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
         } catch {
            clearAccessToken();
            // every request that was waiting on the refresh lands here - sign out once
            if (!sessionExpiredNotified) {
               sessionExpiredNotified = true;
               window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
            }
            return Promise.reject(error);
         }
      }

      // Screens that render their own error UI opt out, otherwise the user gets a toast
      // on top of the message already shown on the page — once per attempt.
      const skipToast = error.config?.skipErrorToast;
      if (status !== 401 && !skipToast) {
         const data = error.response?.data as { message?: string } | undefined;
         toastOnce(data?.message || 'Error from server');
      }
      return Promise.reject(error);
   },
);

export default instance;
