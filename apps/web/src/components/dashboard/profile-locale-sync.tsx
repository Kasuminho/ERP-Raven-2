'use client';

import { useEffect } from 'react';
import { useMyHistory } from '@/hooks/use-guild-api';
import { Locale, useLocaleStore } from '@/store/locale-store';

const supportedLocales = new Set<Locale>(['pt', 'en', 'es']);

function isSupportedLocale(locale?: string): locale is Locale {
  return supportedLocales.has(locale as Locale);
}

export function ProfileLocaleSync() {
  const history = useMyHistory();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const preferredLocale = history.data?.player?.user?.preferredLocale;

  useEffect(() => {
    if (isSupportedLocale(preferredLocale) && preferredLocale !== locale) {
      setLocale(preferredLocale);
    }
  }, [locale, preferredLocale, setLocale]);

  return null;
}
