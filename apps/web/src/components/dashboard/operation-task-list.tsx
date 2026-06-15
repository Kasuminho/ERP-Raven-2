'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CircleDot, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { progressCategoryLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { Locale, useLocaleStore } from '@/store/locale-store';
import type { OperationTask, ProgressCategory } from '@/types/api';

const priorityTone = {
  high: 'red',
  medium: 'gold',
  low: 'blue',
} as const;

const priorityIcon = {
  high: AlertTriangle,
  medium: CircleDot,
  low: Info,
} as const;

function metadataString(task: OperationTask, key: string): string | undefined {
  const value = task.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function metadataNumber(task: OperationTask, key: string): number | undefined {
  const value = task.metadata?.[key];
  return typeof value === 'number' ? value : undefined;
}

function formatTaskDate(locale: Locale, value?: string): string {
  if (!value) return '';

  return new Date(value).toLocaleString(locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US');
}

function localizeTask(task: OperationTask, locale: Locale): { title: string; description: string } {
  switch (task.type) {
    case 'ITEM_REQUEST_UPDATE': {
      const itemName = metadataString(task, 'itemName') ?? task.title;
      return {
        title: t(locale, 'taskItemRequestUpdate'),
        description: `${itemName} ${t(locale, 'taskItemRequestUpdateHelp')}`,
      };
    }
    case 'CODEX_CONFIRMATION':
      return {
        title: t(locale, 'taskCodexConfirmation'),
        description: t(locale, 'taskCodexConfirmationHelp'),
      };
    case 'AUCTION_BID': {
      const itemName = metadataString(task, 'itemName') ?? task.title;
      const status = metadataString(task, 'status') ?? '';
      const bidAmount = metadataNumber(task, 'bidAmount');
      return {
        title: t(locale, 'taskAuctionBid'),
        description: `${itemName} ${t(locale, 'taskAuctionBidStatus')} ${status}. ${t(locale, 'currentBid')}: ${bidAmount ?? '-'} DKP.`,
      };
    }
    case 'OPEN_INTEREST': {
      const interestTitle = metadataString(task, 'title') ?? task.title;
      const closesAt = metadataString(task, 'closesAt');
      return {
        title: t(locale, 'taskOpenInterest'),
        description: `${interestTitle} ${t(locale, 'taskInterestClosesAt')} ${formatTaskDate(locale, closesAt)}.`,
      };
    }
    case 'PROGRESS_REVIEW': {
      const category = metadataString(task, 'category');
      return {
        title: t(locale, 'taskProgressReview'),
        description: `${category ? progressCategoryLabel(category as ProgressCategory, locale) : task.title} ${t(locale, 'taskProgressReviewHelp')}`,
      };
    }
    case 'PROGRESS_STAFF_COMMENT': {
      const category = metadataString(task, 'category');
      return {
        title: t(locale, 'taskProgressStaffComment'),
        description: `${category ? progressCategoryLabel(category as ProgressCategory, locale) : task.title} ${t(locale, 'taskProgressStaffCommentHelp')}`,
      };
    }
    default:
      return { title: task.title, description: task.description };
  }
}

export function OperationTaskList({
  title,
  tasks,
  emptyText,
}: {
  title: string;
  tasks: OperationTask[];
  emptyText: string;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const orderedTasks = [...tasks].sort((first, second) => {
    const weight = { high: 0, medium: 1, low: 2 };
    const priorityDiff = weight[first.priority] - weight[second.priority];

    if (priorityDiff !== 0) return priorityDiff;

    return new Date(first.createdAt ?? 0).getTime() - new Date(second.createdAt ?? 0).getTime();
  });
  const totals = orderedTasks.reduce(
    (acc, task) => {
      acc[task.priority] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {orderedTasks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge tone="red">{t(locale, 'high')} {totals.high}</Badge>
              <Badge tone="gold">{t(locale, 'medium')} {totals.medium}</Badge>
              <Badge tone="blue">{t(locale, 'low')} {totals.low}</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {orderedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : orderedTasks.map((task) => {
          const Icon = priorityIcon[task.priority];
          const localizedTask = localizeTask(task, locale);
          const ageLabel = task.createdAt ? formatTaskDate(locale, task.createdAt) : undefined;
          return (
            <div key={`${task.type}-${task.id}`} className="rounded-md border border-white/10 bg-background/38 p-3 transition hover:border-primary/25">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-primary/20 bg-primary/10">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <p className="font-semibold leading-snug">{localizedTask.title}</p>
                    <Badge tone={priorityTone[task.priority]}>{t(locale, task.priority)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{localizedTask.description}</p>
                  {ageLabel && (
                    <p className="text-xs text-muted-foreground">
                      {locale === 'pt' ? 'Aberto desde' : locale === 'es' ? 'Abierto desde' : 'Open since'}: {ageLabel}
                    </p>
                  )}
                </div>
                <Link href={task.href}>
                  <Button variant="secondary" className="w-full px-3 sm:w-auto">
                    {t(locale, 'open')} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
