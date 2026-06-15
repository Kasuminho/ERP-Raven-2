'use client';

import { useMemo, useState } from 'react';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { notifyToast } from '@/components/ui/toaster';
import { useBusinessRules, useResetBusinessRule, useUpdateBusinessRule } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { BusinessRule } from '@/types/api';

type Drafts = Record<string, string>;

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function groupRules(rules: BusinessRule[]): Array<[string, BusinessRule[]]> {
  const groups = rules.reduce<Record<string, BusinessRule[]>>((acc, rule) => {
    acc[rule.category] = [...(acc[rule.category] ?? []), rule];
    return acc;
  }, {});

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function StaffBusinessRulesPage() {
  const locale = useLocaleStore((state) => state.locale);
  const rules = useBusinessRules();
  const updateRule = useUpdateBusinessRule();
  const resetRule = useResetBusinessRule();
  const [drafts, setDrafts] = useState<Drafts>({});

  const groupedRules = useMemo(() => groupRules(rules.data ?? []), [rules.data]);

  function draftFor(rule: BusinessRule): string {
    return drafts[rule.key] ?? prettyJson(rule.value);
  }

  async function saveRule(rule: BusinessRule) {
    try {
      const parsed = JSON.parse(draftFor(rule));
      await updateRule.mutateAsync({ key: rule.key, value: parsed });
      setDrafts((current) => {
        const next = { ...current };
        delete next[rule.key];
        return next;
      });
      notifyToast({ title: t(locale, 'ruleSaved'), tone: 'success' });
    } catch {
      notifyToast({ title: t(locale, 'invalidJson'), tone: 'error' });
    }
  }

  async function restoreRule(rule: BusinessRule) {
    await resetRule.mutateAsync(rule.key);
    setDrafts((current) => {
      const next = { ...current };
      delete next[rule.key];
      return next;
    });
    notifyToast({ title: t(locale, 'ruleReset'), tone: 'success' });
  }

  const busy = updateRule.isPending || resetRule.isPending;

  return (
    <div className="space-y-6">
      <div className="max-w-4xl space-y-2">
        <p className="text-sm uppercase text-primary">{t(locale, 'governanceDeck')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'businessRules')}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, 'businessRulesHelp')}</p>
      </div>

      {rules.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : null}

      {!rules.isLoading && groupedRules.length === 0 ? (
        <EmptyState title={t(locale, 'businessRules')}>{t(locale, 'businessRulesEmpty')}</EmptyState>
      ) : null}

      <div className="space-y-6">
        {groupedRules.map(([category, categoryRules]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h2 className="font-[var(--font-cinzel)] text-xl font-semibold">{category}</h2>
              <Badge tone="muted">{categoryRules.length}</Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {categoryRules.map((rule) => (
                <Card key={rule.key} className="overflow-hidden">
                  <CardHeader className="border-b border-border/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{rule.label}</CardTitle>
                        <p className="font-mono text-xs text-primary/90">{rule.key}</p>
                      </div>
                      <Badge tone={rule.isActive ? 'green' : 'muted'}>{rule.isActive ? 'ACTIVE' : 'OFF'}</Badge>
                    </div>
                    {rule.description ? <p className="text-sm text-muted-foreground">{rule.description}</p> : null}
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <label className="text-sm font-semibold" htmlFor={`rule-${rule.key}`}>
                      {t(locale, 'ruleValueJson')}
                    </label>
                    <textarea
                      id={`rule-${rule.key}`}
                      value={draftFor(rule)}
                      onChange={(event) => setDrafts((current) => ({ ...current, [rule.key]: event.target.value }))}
                      spellCheck={false}
                      className="min-h-72 w-full resize-y rounded-md border border-border bg-background/80 p-3 font-mono text-xs leading-relaxed outline-none ring-primary/35 transition focus:ring-2"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={busy} onClick={() => saveRule(rule)}>
                        <Save className="h-4 w-4" />
                        {t(locale, 'save')}
                      </Button>
                      <Button type="button" variant="secondary" disabled={busy} onClick={() => restoreRule(rule)}>
                        <RotateCcw className="h-4 w-4" />
                        {t(locale, 'resetDefault')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
