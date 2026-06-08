'use client';

import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

export function AttendanceCard({ percentage = 0, participated = 0, eligible = 0 }: { percentage?: number; participated?: number; eligible?: number }) {
  const locale = useLocaleStore((state) => state.locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, 'attendance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-md border bg-secondary/20">
            <CalendarCheck className="h-6 w-6 text-cyan-200" />
          </div>
          <div>
            <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">{participated} {t(locale, 'of')} {eligible} {t(locale, 'finalizedEvents')}</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-secondary" style={{ width: `${Math.min(100, percentage)}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
