'use client';

import { Globe } from 'lucide-react';
import { Locale, useLocaleStore } from '@/store/locale-store';
import { useUpdatePreferences } from '@/hooks/use-profile-api';
import { useAuthStore } from '@/store/auth-store';

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const authenticated = useAuthStore((state) => state.authenticated);
  const updatePreferences = useUpdatePreferences();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    if (authenticated) {
      updatePreferences.mutate({ locale: newLocale });
    }
  };

  return (
    <div className={`flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/60 p-1 text-xs backdrop-blur-md ${className ?? ''}`}>
      <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 gap-1">
        {(['pt', 'en', 'es'] as const).map((lang) => {
          const active = locale === lang;
          const label = lang === 'pt' ? 'PT' : lang === 'en' ? 'EN' : 'ES';
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleLocaleChange(lang)}
              className={`flex-1 rounded px-2 py-1 text-center font-bold tracking-wider transition-all ${
                active
                  ? 'border border-primary/40 bg-primary/25 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
