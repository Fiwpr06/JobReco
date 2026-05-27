import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';
// Note: We'll use a simple toast implementation later or shadcn's toast.

export const api = axios.create({
  baseURL: typeof window !== "undefined" 
    ? "" 
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'),
  timeout: 30000, // 30s — Hệ thống matching có thể chậm
});

// Request interceptor: inject JWT
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token = (session as any)?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors globally
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    
    // [MED-7 FIX] Only retry on network errors (no HTTP response at all),
    // not on genuine HTTP 500 errors. Use exponential backoff and fewer retries.
    if (config && !error.response) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 5) {
        config._retryCount += 1;
        const delay = Math.min(2000 * Math.pow(2, config._retryCount - 1), 16000);
        console.warn(`Backend not reachable. Retrying in ${delay / 1000}s... (Attempt ${config._retryCount}/5)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    if (status === 401) {
      // Clear session, redirect to login only if they had a session
      const session = await getSession();
      if (session) {
        signOut({ callbackUrl: '/auth/login' });
      }
    }
    if (status === 429) {
      console.warn('Rate limit reached: 429 Too Many Requests');
    }
    if (status === 500) {
      console.error('Backend Error 500: Hệ thống có thể đang gặp sự cố.');
    }
    return Promise.reject(error);
  }
);
