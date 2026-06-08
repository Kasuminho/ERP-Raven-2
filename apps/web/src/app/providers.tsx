'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Toaster, notifyToast } from '@/components/ui/toaster';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || 'A acao falhou. Tente novamente.';
  }

  return error instanceof Error ? error.message : 'A acao falhou. Tente novamente.';
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 20_000,
            gcTime: 30 * 60_000,
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
            onError: (error) => {
              notifyToast({
                title: 'Algo deu errado',
                description: getErrorMessage(error),
                tone: 'error',
              });
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <ImageLightbox />
      <Toaster />
    </QueryClientProvider>
  );
}
