'use client';

import { useEffect, useState } from 'react';

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'info';
};

function toastColor(tone: Toast['tone']): string {
  if (tone === 'success') return 'border-emerald-400/50 bg-emerald-500/15';
  if (tone === 'error') return 'border-red-400/50 bg-red-500/15';
  return 'border-primary/50 bg-primary/15';
}

export function notifyToast(toast: Omit<Toast, 'id'>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('guild-toast', { detail: toast }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { ...detail, id }].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4500);
    }

    window.addEventListener('guild-toast', onToast);
    return () => window.removeEventListener('guild-toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(360px,calc(100vw-2rem))] space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-md border p-3 text-sm shadow-lg backdrop-blur ${toastColor(toast.tone)}`}>
          <p className="font-semibold">{toast.title}</p>
          {toast.description ? <p className="mt-1 text-muted-foreground">{toast.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
