'use client';

import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export function EligibilityBadge({ status }: { status?: string }) {
  const locale = useLocaleStore((state) => state.locale);

  if (status === 'ELIGIBLE') return <Badge tone="green">{t(locale, 'eligible')}</Badge>;
  if (status === 'NEEDS_STAFF_REVIEW') return <Badge tone="gold">{t(locale, 'staffReview')}</Badge>;
  if (status === 'INELIGIBLE') return <Badge tone="red">{t(locale, 'ineligible')}</Badge>;
  return <Badge>{t(locale, 'unknown')}</Badge>;
}
