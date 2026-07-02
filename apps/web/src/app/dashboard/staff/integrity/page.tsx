'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useIntegritySummary } from '@/hooks/use-staff-operations-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

const tone = {
  high: 'red',
  medium: 'gold',
  low: 'blue',
} as const;

export default function StaffIntegrityPage() {
  const locale = useLocaleStore((state) => state.locale);
  const integrity = useIntegritySummary();
  const data = integrity.data;

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">Detector</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'integrityPanel')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t(locale, 'integrityPanelHelp')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['high', data?.counts.high ?? 0],
            ['medium', data?.counts.medium ?? 0],
            ['low', data?.counts.low ?? 0],
            ['total', data?.counts.total ?? 0],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">{label === 'total' ? 'Total' : t(locale, label as 'high' | 'medium' | 'low')}</span>
                <Badge tone={label === 'high' ? 'red' : label === 'medium' ? 'gold' : label === 'low' ? 'blue' : 'muted'}>{value}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              {t(locale, 'integrityPanel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.issues ?? []).map((issue) => (
              <div key={issue.id} className="rounded-md border bg-background/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <strong>{issue.title}</strong>
                      <Badge tone={tone[issue.severity]}>{t(locale, issue.severity)}</Badge>
                      <Badge tone="muted">{issue.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    {issue.createdAt && <p className="text-xs text-muted-foreground">{new Date(issue.createdAt).toLocaleString()}</p>}
                  </div>
                  {issue.href && (
                    <Link href={issue.href}>
                      <Button variant="secondary">{t(locale, 'open')} <ArrowRight className="h-4 w-4" /></Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {!integrity.isLoading && (data?.issues ?? []).length === 0 && (
              <EmptyState title={t(locale, 'noIntegrityIssues')}>
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-primary" />
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
