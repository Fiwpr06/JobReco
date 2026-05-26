import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';
// Note: We'll use a simple toast implementation later or shadcn's toast.

export const api = axios.create({
  baseURL: typeof window !== "undefined" 
    ? "" 
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'),
  timeout: 30000, // 30s — AI matching can be slow
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
    
    // Retry logic for slow FastAPI backend startup (ECONNREFUSED converted to 500 by Next.js)
    if (config && (!status || status === 500)) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 10) {
        config._retryCount += 1;
        console.warn(`Backend not ready or 500 error. Retrying request in 4s... (Attempt ${config._retryCount}/10)`);
        await new Promise(resolve => setTimeout(resolve, 4000));
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
      // We will handle the toast notification at the component or query level 
      // or use a global event bus. For now, logging to console.
      console.warn('Rate limit reached: 429 Too Many Requests');
    }
    if (status === 500) {
      console.error('Backend Error 500: AI service might be down.');
    }
    return Promise.reject(error);
  }
);
