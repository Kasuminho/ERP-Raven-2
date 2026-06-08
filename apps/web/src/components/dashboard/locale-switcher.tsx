'use client';

import { Select } from '@/components/ui/select';
import { Locale, useLocaleStore } from '@/store/locale-store';

export function LocaleSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <Select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="w-full">
      <option value="pt">PT</option>
      <option value="en">EN</option>
      <option value="es">ES</option>
    </Select>
  );
}
