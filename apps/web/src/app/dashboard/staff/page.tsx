'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, BellRing, Calculator, CalendarCheck, Clipboard, ClipboardList, Coins, Database, FileText, Gem, HandCoins, HandHeart, HeartHandshake, MessageSquareText, PackageCheck, PackagePlus, Rocket, Scale, ScrollText, SearchCheck, Send, ShieldAlert, SlidersHorizontal, Sunrise, Swords, Trophy, UsersRound } from 'lucide-react';
import { AuditTimeline } from '@/components/dashboard/audit-timeline';
import { OperationTaskList } from '@/components/dashboard/operation-task-list';
import { StaffHealthPanel } from '@/components/dashboard/staff-health-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notifyToast } from '@/components/ui/toaster';
import { useRecentAudit, useStaffHealth, useStaffMorningBriefing, useStaffOperations } from '@/hooks/use-staff-operations-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { StaffMorningBriefing } from '@/types/api';

type StaffTool = {
  href: string;
  titleKey: Parameters<typeof t>[1];
  descriptionKey: Parameters<typeof t>[1];
  icon: typeof UsersRound;
};

type StaffWorkGroupKey = 'resolve' | 'audit' | 'configure' | 'communicate' | 'deploy';

const tools: StaffTool[] = [
  { href: '/dashboard/staff/day', titleKey: 'staffDay', descriptionKey: 'staffDayDescription', icon: CalendarCheck },
  { href: '/dashboard/staff/war-room', titleKey: 'warRoom', descriptionKey: 'warRoomDescription', icon: Swords },
  { href: '/dashboard/staff/meeting', titleKey: 'staffMeeting', descriptionKey: 'staffMeetingDescription', icon: HeartHandshake },
  { href: '/dashboard/staff/season', titleKey: 'seasonSummary', descriptionKey: 'seasonSummaryDescription', icon: Trophy },
  { href: '/dashboard/staff/guild-progress', titleKey: 'guildProgress', descriptionKey: 'guildProgressDescription', icon: BarChart3 },
  { href: '/dashboard/staff/auction-simulator', titleKey: 'auctionSimulator', descriptionKey: 'auctionSimulatorDescription', icon: Calculator },
  { href: '/dashboard/staff/auction-diagnostics', titleKey: 'auctionDiagnostics', descriptionKey: 'auctionDiagnosticsDescription', icon: SearchCheck },
  { href: '/dashboard/staff/fairness', titleKey: 'lootFairness', descriptionKey: 'lootFairnessDescription', icon: Scale },
  { href: '/dashboard/staff/compare', titleKey: 'playerCompare', descriptionKey: 'playerCompareDescription', icon: UsersRound },
  { href: '/dashboard/staff/legacy-audit', titleKey: 'legacyAudit', descriptionKey: 'legacyAuditDescription', icon: Database },
  { href: '/dashboard/staff/dossier', titleKey: 'universalDossier', descriptionKey: 'universalDossierDescription', icon: FileText },
  { href: '/dashboard/staff/discord-templates', titleKey: 'discordTemplates', descriptionKey: 'discordTemplatesDescription', icon: MessageSquareText },
  { href: '/dashboard/staff/discord-webhooks', titleKey: 'discordWebhooks', descriptionKey: 'discordWebhooksDescription', icon: Send },
  { href: '/dashboard/staff/deploy', titleKey: 'deploymentPanel', descriptionKey: 'deploymentPanelDescription', icon: Rocket },
  { href: '/dashboard/staff/health', titleKey: 'operationalHealth', descriptionKey: 'operationalHealthDescription', icon: Activity },
  { href: '/dashboard/staff/integrity', titleKey: 'integrityPanel', descriptionKey: 'integrityPanelDescription', icon: ShieldAlert },
  { href: '/dashboard/staff/rules', titleKey: 'businessRules', descriptionKey: 'businessRulesDescription', icon: SlidersHorizontal },
  { href: '/dashboard/staff/players', titleKey: 'players', descriptionKey: 'staffPlayersDescription', icon: UsersRound },
  { href: '/dashboard/staff/recruitment', titleKey: 'recruitment', descriptionKey: 'recruitmentDescription', icon: UsersRound },
  { href: '/dashboard/staff/item-audit', titleKey: 'auditTimeline', descriptionKey: 'staffDropsDescription', icon: ClipboardList },
  { href: '/dashboard/staff/item-audit/items', titleKey: 'items', descriptionKey: 'staffDropsDescription', icon: ClipboardList },
  { href: '/dashboard/staff/dkp', titleKey: 'dkp', descriptionKey: 'staffDkpDescription', icon: Coins },
  { href: '/dashboard/staff/economy', titleKey: 'dkpLedger', descriptionKey: 'staffDkpDescription', icon: BarChart3 },
  { href: '/dashboard/staff/reviews', titleKey: 'reviews', descriptionKey: 'staffReviewsDescription', icon: ShieldAlert },
  { href: '/dashboard/staff/bid-cancellations', titleKey: 'bidCancellations', descriptionKey: 'bidCancellationsShortDescription', icon: ShieldAlert },
  { href: '/dashboard/staff/deliveries', titleKey: 'delivered', descriptionKey: 'staffDeliveriesDescription', icon: PackageCheck },
  { href: '/dashboard/staff/diamond-sales', titleKey: 'diamondSales', descriptionKey: 'staffDiamondSalesDescription', icon: Gem },
  { href: '/dashboard/admin/events', titleKey: 'events', descriptionKey: 'staffEventsDescription', icon: CalendarCheck },
  { href: '/dashboard/admin/items', titleKey: 'items', descriptionKey: 'staffItemsDescription', icon: PackagePlus },
  { href: '/dashboard/staff/interests', titleKey: 'interests', descriptionKey: 'staffInterestsDescription', icon: HandHeart },
  { href: '/dashboard/staff/wishlist', titleKey: 'wishlist', descriptionKey: 'staffWishlistDescription', icon: Gem },
  { href: '/dashboard/staff/codex', titleKey: 'codex', descriptionKey: 'staffCodexDescription', icon: ScrollText },
  { href: '/dashboard/staff/daoshi', titleKey: 'daoshi', descriptionKey: 'staffDaoshiDescription', icon: HandCoins },
  { href: '/dashboard/staff/progress', titleKey: 'progress', descriptionKey: 'staffProgressDescription', icon: Activity },
  { href: '/dashboard/admin/announcements', titleKey: 'announcements', descriptionKey: 'staffAnnouncementsDescription', icon: BellRing },
  { href: '/dashboard/staff/drops', titleKey: 'drops', descriptionKey: 'staffDropsDescription', icon: Gem },
];

const toolGroups: Array<{
  key: StaffWorkGroupKey;
  label: string;
  description: string;
  hrefs: string[];
}> = [
  {
    key: 'resolve',
    label: 'Resolver agora',
    description: 'Pendencias, entregas, reviews, eventos e filas que pedem acao.',
    hrefs: ['/dashboard/staff/day', '/dashboard/staff/war-room', '/dashboard/staff/meeting', '/dashboard/staff/reviews', '/dashboard/staff/bid-cancellations', '/dashboard/staff/deliveries', '/dashboard/staff/diamond-sales', '/dashboard/admin/events', '/dashboard/staff/interests', '/dashboard/staff/wishlist', '/dashboard/staff/recruitment', '/dashboard/staff/codex', '/dashboard/staff/progress'],
  },
  {
    key: 'audit',
    label: 'Auditar',
    description: 'Diagnosticos, dossies, historico de drops, integridade e comparacoes.',
    hrefs: ['/dashboard/staff/auction-diagnostics', '/dashboard/staff/auction-simulator', '/dashboard/staff/guild-progress', '/dashboard/staff/integrity', '/dashboard/staff/legacy-audit', '/dashboard/staff/dossier', '/dashboard/staff/drops', '/dashboard/staff/item-audit', '/dashboard/staff/item-audit/items', '/dashboard/staff/fairness', '/dashboard/staff/compare'],
  },
  {
    key: 'configure',
    label: 'Configurar',
    description: 'Regras, catalogo, players, economia, DKP e Daoshi.',
    hrefs: ['/dashboard/staff/rules', '/dashboard/admin/items', '/dashboard/staff/players', '/dashboard/staff/dkp', '/dashboard/staff/economy', '/dashboard/staff/daoshi'],
  },
  {
    key: 'communicate',
    label: 'Comunicar',
    description: 'Anuncios, temporada e payloads Discord antes de postar.',
    hrefs: ['/dashboard/admin/announcements', '/dashboard/staff/season', '/dashboard/staff/discord-templates', '/dashboard/staff/discord-webhooks'],
  },
  {
    key: 'deploy',
    label: 'Operar deploy',
    description: 'Versao, health, smoke e protocolo de publicacao.',
    hrefs: ['/dashboard/staff/deploy', '/dashboard/staff/health'],
  },
];

const morningTone = {
  high: 'red',
  medium: 'gold',
  low: 'blue',
} as const;

function MorningBriefingPanel({ briefing }: { briefing?: StaffMorningBriefing }) {
  async function copyMarkdown() {
    if (!briefing) return;

    try {
      await navigator.clipboard.writeText(briefing.markdown);
      notifyToast({ title: 'Resumo copiado', description: 'Markdown Staff pronto para colar na pauta.', tone: 'success' });
    } catch {
      notifyToast({ title: 'Nao consegui copiar', description: 'O navegador bloqueou o clipboard desta vez.', tone: 'error' });
    }
  }

  if (!briefing) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Carregando resumo matinal...</p>
        </CardContent>
      </Card>
    );
  }

  const countRows = [
    ['Urgentes', briefing.counts.urgent],
    ['Leiloes vencidos', briefing.counts.expiredOpenAuctions],
    ['Leiloes 24h', briefing.counts.endingAuctions24h],
    ['Reviews', briefing.counts.reviews],
    ['Entregas', briefing.counts.deliveries],
    ['Integridade alta', briefing.counts.integrityHigh],
    ['Saude', briefing.counts.healthAlerts],
  ];

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Sunrise className="h-5 w-5 text-primary" />
              <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">{briefing.title}</h2>
            </div>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{briefing.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">Gerado em {new Date(briefing.generatedAt).toLocaleString()}</p>
          </div>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => void copyMarkdown()}>
            <Clipboard className="h-4 w-4" />
            Copiar pauta
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {countRows.map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-white/10 bg-background/45 p-3">
              <p className="text-xs uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {briefing.sections.map((section) => (
            <div key={section.key} className="rounded-lg border border-white/10 bg-background/45 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{section.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                </div>
                <Badge tone={morningTone[section.priority]}>{section.count}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {section.tasks.slice(0, 3).map((task) => (
                  <Link key={`${section.key}-${task.type}-${task.id}`} href={task.href} className="block rounded-md border border-white/10 bg-black/15 p-2 text-sm transition hover:border-primary/35">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{task.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    </div>
                  </Link>
                ))}
                {section.tasks.length === 0 ? <p className="text-sm text-muted-foreground">Sem itens nesta secao.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffHubPage() {
  const locale = useLocaleStore((state) => state.locale);
  const operations = useStaffOperations();
  const briefing = useStaffMorningBriefing();
  const health = useStaffHealth();
  const audit = useRecentAudit(12);
  const counts = operations.data?.counts;
  const [activeGroupKey, setActiveGroupKey] = useState<StaffWorkGroupKey>('resolve');
  const activeGroup = toolGroups.find((group) => group.key === activeGroupKey) ?? toolGroups[0];
  const groupStats: Record<StaffWorkGroupKey, number> = {
    resolve: (counts?.reviews ?? 0) + (counts?.deliveries ?? 0) + (counts?.codex ?? 0) + (counts?.interests ?? 0) + (counts?.progress ?? 0) + (counts?.events ?? 0),
    audit: (briefing.data?.counts.integrityHigh ?? 0) + (briefing.data?.counts.healthAlerts ?? 0),
    configure: 0,
    communicate: counts?.announcements ?? 0,
    deploy: briefing.data?.counts.healthAlerts ?? 0,
  };
  const actionItems = useMemo(() => {
    const briefingTasks = (briefing.data?.sections ?? []).flatMap((section) => section.tasks);
    const tasks = [...(operations.data?.tasks ?? []), ...briefingTasks]
      .filter((task) => activeGroup.hrefs.some((href) => task.href.startsWith(href)))
      .filter((task, index, list) => list.findIndex((candidate) => candidate.id === task.id && candidate.type === task.type) === index);

    return tasks.slice(0, 4);
  }, [activeGroup, briefing.data, operations.data]);

  return (
    <div className="space-y-8 pt-3 sm:pt-4 lg:pt-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'governanceDeck')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'staffTools')}</h1>
      </div>
      <MorningBriefingPanel briefing={briefing.data} />
      <section className="space-y-4">
        <div>
          <p className="page-kicker">Ferramentas por jornada</p>
          <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">Escolha o trabalho da vez</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {toolGroups.map((group) => (
            <Button
              key={group.key}
              type="button"
              variant={activeGroup.key === group.key ? 'primary' : 'secondary'}
              className="h-auto min-h-10 px-3 py-2"
              onClick={() => setActiveGroupKey(group.key)}
            >
              <span>{group.label}</span>
              <Badge tone={groupStats[group.key] > 0 ? 'gold' : 'muted'}>{groupStats[group.key]}</Badge>
            </Button>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <div>
              <p className="page-kicker">Ferramentas</p>
              <h2 className="font-[var(--font-cinzel)] text-2xl font-bold">{activeGroup.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeGroup.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tools.filter((tool) => activeGroup.hrefs.includes(tool.href)).map((tool) => (
                <Link key={tool.href} href={tool.href} className="block h-full">
                  <Card className="h-full min-h-36 transition hover:border-primary/55 hover:bg-card">
                    <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
                      <tool.icon className="h-6 w-6 shrink-0 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">{t(locale, tool.titleKey)}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(locale, tool.descriptionKey)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
          <aside className="space-y-3 rounded-md border bg-card/60 p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Proximas acoes</p>
              <h3 className="text-lg font-semibold">{activeGroup.label}</h3>
            </div>
            <div className="space-y-2">
              {actionItems.map((task) => (
                <Link key={`${task.type}-${task.id}`} href={task.href} className="block rounded-md border bg-background/35 p-3 text-sm transition hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{task.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <Badge tone={morningTone[task.priority]}>{task.priority}</Badge>
                  </div>
                </Link>
              ))}
              {actionItems.length === 0 ? (
                <p className="rounded-md border bg-background/35 p-3 text-sm text-muted-foreground">Nenhuma acao prioritaria neste grupo agora.</p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
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
          ownerLabel="Staff"
        />
        <StaffHealthPanel health={health.data} />
      </div>
      <AuditTimeline logs={audit.data ?? []} />
    </div>
  );
}
