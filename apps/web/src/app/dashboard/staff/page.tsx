'use client';

import Link from 'next/link';
import { Activity, BarChart3, BellRing, Calculator, CalendarCheck, ClipboardList, Coins, Database, Gem, HandCoins, HandHeart, HeartHandshake, MessageSquareText, PackageCheck, PackagePlus, Scale, ScrollText, ShieldAlert, SlidersHorizontal, Trophy, UsersRound } from 'lucide-react';
import { AuditTimeline } from '@/components/dashboard/audit-timeline';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { StaffHealthPanel } from '@/components/dashboard/staff-health-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRecentAudit, useStaffHealth, useStaffOperations } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';

type StaffTool = {
  href: string;
  titleKey: Parameters<typeof t>[1];
  descriptionKey: Parameters<typeof t>[1];
  icon: typeof UsersRound;
};

const tools: StaffTool[] = [
  { href: '/dashboard/staff/day', titleKey: 'staffDay', descriptionKey: 'staffDayDescription', icon: CalendarCheck },
  { href: '/dashboard/staff/meeting', titleKey: 'staffMeeting', descriptionKey: 'staffMeetingDescription', icon: HeartHandshake },
  { href: '/dashboard/staff/season', titleKey: 'seasonSummary', descriptionKey: 'seasonSummaryDescription', icon: Trophy },
  { href: '/dashboard/staff/auction-simulator', titleKey: 'auctionSimulator', descriptionKey: 'auctionSimulatorDescription', icon: Calculator },
  { href: '/dashboard/staff/fairness', titleKey: 'lootFairness', descriptionKey: 'lootFairnessDescription', icon: Scale },
  { href: '/dashboard/staff/compare', titleKey: 'playerCompare', descriptionKey: 'playerCompareDescription', icon: UsersRound },
  { href: '/dashboard/staff/legacy-audit', titleKey: 'legacyAudit', descriptionKey: 'legacyAuditDescription', icon: Database },
  { href: '/dashboard/staff/discord-templates', titleKey: 'discordTemplates', descriptionKey: 'discordTemplatesDescription', icon: MessageSquareText },
  { href: '/dashboard/staff/health', titleKey: 'operationalHealth', descriptionKey: 'operationalHealthDescription', icon: Activity },
  { href: '/dashboard/staff/rules', titleKey: 'businessRules', descriptionKey: 'businessRulesDescription', icon: SlidersHorizontal },
  { href: '/dashboard/staff/players', titleKey: 'players', descriptionKey: 'staffPlayersDescription', icon: UsersRound },
  { href: '/dashboard/staff/item-audit', titleKey: 'auditTimeline', descriptionKey: 'staffDropsDescription', icon: ClipboardList },
  { href: '/dashboard/staff/item-audit/items', titleKey: 'items', descriptionKey: 'staffDropsDescription', icon: ClipboardList },
  { href: '/dashboard/staff/dkp', titleKey: 'dkp', descriptionKey: 'staffDkpDescription', icon: Coins },
  { href: '/dashboard/staff/economy', titleKey: 'dkpLedger', descriptionKey: 'staffDkpDescription', icon: BarChart3 },
  { href: '/dashboard/staff/reviews', titleKey: 'reviews', descriptionKey: 'staffReviewsDescription', icon: ShieldAlert },
  { href: '/dashboard/staff/bid-cancellations', titleKey: 'bidCancellations', descriptionKey: 'bidCancellationsShortDescription', icon: ShieldAlert },
  { href: '/dashboard/staff/deliveries', titleKey: 'delivered', descriptionKey: 'staffDeliveriesDescription', icon: PackageCheck },
  { href: '/dashboard/admin/events', titleKey: 'events', descriptionKey: 'staffEventsDescription', icon: CalendarCheck },
  { href: '/dashboard/admin/items', titleKey: 'items', descriptionKey: 'staffItemsDescription', icon: PackagePlus },
  { href: '/dashboard/staff/interests', titleKey: 'interests', descriptionKey: 'staffInterestsDescription', icon: HandHeart },
  { href: '/dashboard/staff/codex', titleKey: 'codex', descriptionKey: 'staffCodexDescription', icon: ScrollText },
  { href: '/dashboard/staff/daoshi', titleKey: 'daoshi', descriptionKey: 'staffDaoshiDescription', icon: HandCoins },
  { href: '/dashboard/staff/progress', titleKey: 'progress', descriptionKey: 'staffProgressDescription', icon: Activity },
  { href: '/dashboard/admin/announcements', titleKey: 'announcements', descriptionKey: 'staffAnnouncementsDescription', icon: BellRing },
  { href: '/dashboard/staff/drops', titleKey: 'drops', descriptionKey: 'staffDropsDescription', icon: Gem },
];

export default function StaffHubPage() {
  const locale = useLocaleStore((state) => state.locale);
  const operations = useStaffOperations();
  const health = useStaffHealth();
  const audit = useRecentAudit(12);
  const counts = operations.data?.counts;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'governanceDeck')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffTools')}</h1>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {tools.map((tool) => (
          <Link
            key={`shortcut-${tool.href}`}
            href={tool.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card/80 px-3 py-2 text-sm font-semibold transition hover:border-primary/60 hover:bg-card"
          >
            <tool.icon className="h-4 w-4 text-primary" />
            <span>{t(locale, tool.titleKey)}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Reviews', counts?.reviews ?? 0],
          ['Entregas', counts?.deliveries ?? 0],
          ['Codex', counts?.codex ?? 0],
          ['Progresso', counts?.progress ?? 0],
          ['Interesses', counts?.interests ?? 0],
          ['Requests', counts?.itemRequests ?? 0],
          ['Eventos', counts?.events ?? 0],
          ['Anuncios', counts?.announcements ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Badge tone={Number(value) > 0 ? 'gold' : 'muted'}>{value}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <OperationTaskList
          title="Central de pendencias da Staff"
          tasks={operations.data?.tasks ?? []}
          emptyText="Fila limpa. Nada exigindo acao da Staff agora."
        />
        <StaffHealthPanel health={health.data} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full transition hover:border-primary/55 hover:bg-card">
              <CardContent className="space-y-2 p-4">
                <tool.icon className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">{t(locale, tool.titleKey)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t(locale, tool.descriptionKey)}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <AuditTimeline logs={audit.data ?? []} />
    </div>
  );
}
