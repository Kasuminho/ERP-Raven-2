import axios from 'axios';
import { getPublicApiUrl } from '@/lib/public-api-url';
import { notifyToast } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth-store';

export const api = axios.create({
  baseURL: getPublicApiUrl(),
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const suppressToast = error.config?.headers?.['X-Suppress-Session-Toast'] === 'true';
    const hadSession = useAuthStore.getState().authenticated;
    if (error.response?.status === 401 && hadSession) {
      void useAuthStore.getState().logout();
      if (!suppressToast) {
        notifyToast({
          title: 'Sessao expirada',
          description: 'Entre novamente com Discord.',
          tone: 'error',
        });
      }
    }

    return Promise.reject(error);
  },
);
