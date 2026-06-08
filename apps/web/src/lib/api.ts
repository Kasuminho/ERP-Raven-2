import axios from 'axios';
import { getPublicApiUrl } from '@/lib/public-api-url';
import { notifyToast } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth-store';

export const api = axios.create({
  baseURL: getPublicApiUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      notifyToast({
        title: 'Sessao expirada',
        description: 'Entre novamente com Discord.',
        tone: 'error',
      });
    }

    return Promise.reject(error);
  },
);
