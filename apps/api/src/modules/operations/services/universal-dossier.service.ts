import { Injectable, NotFoundException } from '@nestjs/common';
import { PlayerClass, PlayerCombatProfileChangeStatus, ProgressReviewStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { UniversalDossier, UniversalDossierRiskFlag, UniversalDossierType } from '../operations.types';

@Injectable()
export class UniversalDossierService {
  constructor(private readonly prisma: PrismaService) {}

  async getUniversalDossier(type: UniversalDossierType, id: string): Promise<UniversalDossier> {
    if (type === 'player') return this.getPlayerDossier(id);
    if (type === 'request') return this.getRequestDossier(id);
    if (type === 'interest') return this.getInterestDossier(id);
    if (type === 'drop') return this.getDropDossier(id);
    if (type === 'event') return this.getEventDossier(id);

    throw new NotFoundException('Tipo de dossie nao suportado.');
  }

  private async getPlayerDossier(playerId: string): Promise<UniversalDossier> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        user: { select: { discordId: true, discordUsername: true, discordNickname: true } },
        dkpTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        dkpLocks: { where: { released: false }, orderBy: { createdAt: 'desc' }, take: 10 },
        itemRequests: { orderBy: { updatedAt: 'desc' }, take: 5 },
        dropHistories: {
          orderBy: { deliveredAt: 'desc' },
          take: 5,
          include: { itemCatalog: { select: { itemTier: true } } },
        },
        progressUpdates: { orderBy: { createdAt: 'desc' }, take: 20 },
        combatProfile: true,
        combatProfileRequests: { where: { status: PlayerCombatProfileChangeStatus.APPROVED }, orderBy: { reviewedAt: 'desc' }, take: 10 },
        auctionDisputes: { orderBy: { createdAt: 'desc' }, take: 10 },
        attendances: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!player) throw new NotFoundException('Player nao encontrado.');

    const totalDkp = player.dkpTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const lockedDkp = player.dkpLocks.reduce((sum, lock) => sum + lock.amount, 0);
    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'Player', targetId: player.id },
      { metadata: { path: ['playerId'], equals: player.id } },
      { metadata: { path: ['discordId'], equals: player.user.discordId } },
    ]);
    const summary = [
      { label: 'Player', value: player.nickname },
      { label: 'Discord', value: player.user.discordNickname ?? player.user.discordUsername },
      { label: 'Classe', value: player.class },
      { label: 'Camada', value: String(player.dimensionalLayer) },
      { label: 'CP', value: String(player.combatPower) },
      { label: 'Attendance', value: `${player.attendancePercentage.toFixed(2)}%` },
      { label: 'DKP total/locked/available', value: `${totalDkp}/${lockedDkp}/${totalDkp - lockedDkp}` },
    ];
    const riskFlags = this.buildPlayerRiskFlags(player, totalDkp, lockedDkp);
    const markdown = this.buildUniversalMarkdown('Dossie Staff - Player', player.id, summary, [
      '## Risk flags operacionais',
      ...this.markdownList(riskFlags.map((flag) => `[${flag.severity}] ${flag.label}: ${flag.explanation} (${flag.evidenceHref})`)),
      '',
      '## Requests recentes',
      ...this.markdownList(player.itemRequests.map((request) => `${request.itemName}: rank ${request.rankPosition}, restante ${request.remainingQuantity}/${request.totalQuantity}`)),
      '',
      '## Drops recentes',
      ...this.markdownList(player.dropHistories.map((drop) => `${drop.itemName ?? 'Item'} em ${drop.deliveredAt?.toISOString() ?? drop.createdAt.toISOString()}`)),
      '',
      '## Progresso recente',
      ...this.markdownList(player.progressUpdates.map((progress) => `${progress.category}: ${progress.reviewStatus} em ${progress.createdAt.toISOString()}`)),
    ], auditLogs);

    return {
      generatedAt: new Date(),
      type: 'player',
      id: player.id,
      title: `Dossie Staff - ${player.nickname}`,
      summary,
      riskFlags,
      internalLinks: [
        { label: 'Perfil Staff', href: `/dashboard/staff/players/${player.id}` },
        { label: 'Comparar players', href: `/dashboard/staff/compare?playerIds=${player.id}` },
      ],
      auditLogs,
      markdown,
    };
  }

  private async getRequestDossier(requestId: string): Promise<UniversalDossier> {
    const request = await this.prisma.itemRequest.findUnique({
      where: { id: requestId },
      include: {
        player: { select: { id: true, nickname: true, dimensionalLayer: true } },
        itemCatalog: { select: { id: true, namePt: true, nameEn: true, itemTier: true, itemType: true, category: true } },
      },
    });
    if (!request) throw new NotFoundException('Request nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'ItemRequest', targetId: request.id },
      { metadata: { path: ['requestId'], equals: request.id } },
      { metadata: { path: ['itemRequestId'], equals: request.id } },
    ]);
    const summary = [
      { label: 'Item', value: request.itemName },
      { label: 'Player', value: request.player?.nickname ?? request.playerName },
      { label: 'Rank', value: String(request.rankPosition) },
      { label: 'Quantidade', value: `${request.remainingQuantity}/${request.totalQuantity}` },
      { label: 'Update', value: request.updateProofStatus ?? 'sem update pendente' },
      { label: 'Catalogo', value: request.itemCatalog ? `${request.itemCatalog.namePt} / ${request.itemCatalog.nameEn}` : 'sem vinculo' },
    ];

    return {
      generatedAt: new Date(),
      type: 'request',
      id: request.id,
      title: `Dossie Staff - Request ${request.itemName}`,
      summary,
      internalLinks: [
        { label: 'Requests player', href: '/dashboard/item-requests' },
        ...(request.playerId ? [{ label: 'Perfil Staff', href: `/dashboard/staff/players/${request.playerId}` }] : []),
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Request', request.id, summary, [
        '## Contexto',
        `Criado em: ${request.createdAt.toISOString()}`,
        `Atualizado em: ${request.updatedAt.toISOString()}`,
        `Thread: ${request.threadId ?? '-'}`,
        `Ultimo reminder: ${request.lastReminderStage ?? '-'} em ${request.lastReminderAt?.toISOString() ?? '-'}`,
      ], auditLogs),
    };
  }

  private async getInterestDossier(postId: string): Promise<UniversalDossier> {
    const post = await this.prisma.itemInterestPost.findUnique({
      where: { id: postId },
      include: {
        itemCatalog: { select: { namePt: true, nameEn: true, itemTier: true, itemType: true } },
        entries: {
          include: { player: { select: { id: true, nickname: true, dimensionalLayer: true, attendancePercentage: true } } },
          orderBy: { createdAt: 'asc' },
        },
        votes: true,
      },
    });
    if (!post) throw new NotFoundException('Interesse nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'ItemInterestPost', targetId: post.id },
      { targetType: 'ItemInterest', targetId: post.id },
      { metadata: { path: ['postId'], equals: post.id } },
    ]);
    const selected = post.entries.find((entry) => entry.id === post.selectedEntryId);
    const summary = [
      { label: 'Titulo', value: post.title },
      { label: 'Item', value: `${post.itemCatalog.namePt} / ${post.itemCatalog.nameEn}` },
      { label: 'Status', value: post.status },
      { label: 'Modo', value: post.mode },
      { label: 'Interessados', value: String(post.entries.length) },
      { label: 'Votos', value: String(post.votes.length) },
      { label: 'Selecionado', value: selected?.player.nickname ?? '-' },
    ];

    return {
      generatedAt: new Date(),
      type: 'interest',
      id: post.id,
      title: `Dossie Staff - Interesse ${post.title}`,
      summary,
      internalLinks: [
        { label: 'Interesses Staff', href: '/dashboard/staff/interests' },
        { label: 'Interesses player', href: '/dashboard/interests' },
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Interesse', post.id, summary, [
        '## Interessados',
        ...this.markdownList(post.entries.map((entry) => `${entry.player.nickname}: layer ${entry.player.dimensionalLayer}, presenca ${entry.player.attendancePercentage.toFixed(2)}%, transmutar=${entry.isTransmuteRequest ? 'sim' : 'nao'}`)),
      ], auditLogs),
    };
  }

  private async getDropDossier(dropId: string): Promise<UniversalDossier> {
    const drop = await this.prisma.dropHistory.findUnique({
      where: { id: dropId },
      include: {
        player: { select: { id: true, nickname: true } },
        itemCatalog: { select: { namePt: true, nameEn: true, itemTier: true, itemType: true } },
        auction: { select: { id: true, itemName: true, status: true } },
        itemInterestEntry: { include: { post: { select: { id: true, title: true } }, player: { select: { nickname: true } } } },
      },
    });
    if (!drop) throw new NotFoundException('Drop nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'DropHistory', targetId: drop.id },
      ...(drop.auctionId ? [{ targetType: 'Auction', targetId: drop.auctionId }] : []),
      { metadata: { path: ['dropHistoryId'], equals: drop.id } },
    ]);
    const summary = [
      { label: 'Item', value: drop.itemName ?? drop.itemCatalog?.namePt ?? 'Item sem nome' },
      { label: 'Player', value: drop.player?.nickname ?? drop.nicknameIngame ?? '-' },
      { label: 'Origem leilao', value: drop.auction?.itemName ?? '-' },
      { label: 'Origem interesse', value: drop.itemInterestEntry?.post.title ?? '-' },
      { label: 'Entregue em', value: drop.deliveredAt?.toISOString() ?? '-' },
      { label: 'Prova', value: drop.proofImageUrl ? 'sim' : 'nao' },
    ];

    return {
      generatedAt: new Date(),
      type: 'drop',
      id: drop.id,
      title: `Dossie Staff - Drop ${summary[0].value}`,
      summary,
      internalLinks: [
        { label: 'Drops Staff', href: '/dashboard/staff/drops' },
        ...(drop.playerId ? [{ label: 'Perfil Staff', href: `/dashboard/staff/players/${drop.playerId}` }] : []),
        ...(drop.auctionId ? [{ label: 'Diagnostico do leilao', href: `/dashboard/staff/auction-diagnostics?auctionId=${drop.auctionId}` }] : []),
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Drop', drop.id, summary, [
        '## Origem',
        `AuctionId: ${drop.auctionId ?? '-'}`,
        `ItemInterestEntryId: ${drop.itemInterestEntryId ?? '-'}`,
        `Thread: ${drop.threadId ?? '-'}`,
      ], auditLogs),
    };
  }

  private async getEventDossier(eventId: string): Promise<UniversalDossier> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: { select: { discordUsername: true, discordNickname: true } },
        attendances: { include: { player: { select: { id: true, nickname: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');

    const present = event.attendances.filter((attendance) => attendance.attended);
    const absent = event.attendances.filter((attendance) => !attendance.attended);
    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'Event', targetId: event.id },
      { metadata: { path: ['eventId'], equals: event.id } },
      { metadata: { path: ['attendanceBatchId'], equals: event.attendanceBatchId ?? '' } },
    ]);
    const summary = [
      { label: 'Evento', value: event.name },
      { label: 'Tipo', value: event.type },
      { label: 'Status', value: event.status },
      { label: 'DKP', value: String(event.dkpReward) },
      { label: 'Presentes/ausentes', value: `${present.length}/${absent.length}` },
      { label: 'Lote', value: event.attendanceBatchId ?? '-' },
      { label: 'Finalizado em', value: event.finalizedAt?.toISOString() ?? '-' },
    ];

    return {
      generatedAt: new Date(),
      type: 'event',
      id: event.id,
      title: `Dossie Staff - Evento ${event.name}`,
      summary,
      internalLinks: [
        { label: 'Eventos Admin', href: '/dashboard/admin/events' },
        { label: 'Dia Staff', href: '/dashboard/staff/day' },
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Evento', event.id, summary, [
        '## Presenca',
        `Presentes: ${present.map((attendance) => attendance.player.nickname).join(', ') || '-'}`,
        `Ausentes: ${absent.map((attendance) => attendance.player.nickname).join(', ') || '-'}`,
      ], auditLogs),
    };
  }

  private markdownList(items: string[]): string[] {
    if (items.length === 0) return ['- Nenhum registro.'];
    return items.map((item) => `- ${item}`);
  }

  private buildPlayerRiskFlags(
    player: Prisma.PlayerGetPayload<{
      include: {
        dropHistories: { include: { itemCatalog: { select: { itemTier: true } } } };
        progressUpdates: true;
        combatProfile: true;
        combatProfileRequests: true;
        auctionDisputes: true;
        attendances: true;
      };
    }>,
    totalDkp: number,
    lockedDkp: number,
  ): UniversalDossierRiskFlag[] {
    const now = Date.now();
    const days = (value: Date | null | undefined) => value ? Math.floor((now - value.getTime()) / 86_400_000) : null;
    const flags: UniversalDossierRiskFlag[] = [];
    const playerHref = `/dashboard/staff/players/${player.id}`;
    const add = (flag: UniversalDossierRiskFlag) => flags.push(flag);
    const joinedDays = days(player.joinedAt) ?? 999;
    const recentCutoff = new Date(now - 30 * 86_400_000);
    const sixtyDaysCutoff = new Date(now - 60 * 86_400_000);

    if (joinedDays <= 14) {
      add({
        key: 'trial',
        label: 'Trial/recente',
        severity: 'info',
        explanation: `Entrou ha ${joinedDays} dias; validar contexto antes de decisao sensivel.`,
        evidenceHref: playerHref,
      });
    }
    if (player.attendancePercentage < 60) {
      add({
        key: 'low-attendance',
        label: 'Baixa presenca',
        severity: player.attendancePercentage < 40 ? 'danger' : 'warning',
        explanation: `Presenca registrada em ${player.attendancePercentage.toFixed(2)}%.`,
        evidenceHref: `${playerHref}?tab=attendance`,
      });
    }
    const lastPresent = player.attendances.find((attendance) => attendance.attended)?.createdAt;
    const absentDays = days(lastPresent);
    if (absentDays === null || absentDays >= 14) {
      add({
        key: 'recent-absence',
        label: 'Ausencia recente',
        severity: absentDays === null || absentDays >= 30 ? 'danger' : 'warning',
        explanation: absentDays === null ? 'Nenhuma presenca recente encontrada nos registros carregados.' : `Ultima presenca ha ${absentDays} dias.`,
        evidenceHref: `${playerHref}?tab=attendance`,
      });
    }
    const expensiveDrop = player.dropHistories.find((drop) => {
      const deliveredAt = drop.deliveredAt ?? drop.createdAt;
      const tier = drop.itemCatalog?.itemTier;
      return deliveredAt >= recentCutoff && (tier === 'T4' || tier === 'LEGENDARY');
    });
    if (expensiveDrop) {
      add({
        key: 'recent-expensive-loot',
        label: 'Loot caro recente',
        severity: 'warning',
        explanation: `${expensiveDrop.itemName ?? 'Item caro'} entregue ha ${days(expensiveDrop.deliveredAt ?? expensiveDrop.createdAt)} dias.`,
        evidenceHref: '/dashboard/staff/drops',
      });
    }
    const latestApprovedProgress = player.progressUpdates.find((progress) => progress.reviewStatus === ProgressReviewStatus.APPROVED);
    const approvedProgressDays = days(latestApprovedProgress?.reviewedAt ?? latestApprovedProgress?.createdAt);
    if (approvedProgressDays === null || approvedProgressDays > 21) {
      add({
        key: 'stale-approved-progress',
        label: 'Sem progresso aprovado recente',
        severity: approvedProgressDays === null || approvedProgressDays > 45 ? 'danger' : 'warning',
        explanation: approvedProgressDays === null ? 'Nenhum progresso aprovado recente encontrado.' : `Ultimo progresso aprovado ha ${approvedProgressDays} dias.`,
        evidenceHref: `${playerHref}?tab=progress`,
      });
    }
    if (!player.combatProfile?.declaredBuild || !player.combatProfile.preferredRole || player.combatProfile.acceptedRoles.length === 0) {
      add({
        key: 'incomplete-build',
        label: 'Build incompleta',
        severity: 'warning',
        explanation: 'Perfil de combate sem build declarada, papel preferido ou papeis aceitos completos.',
        evidenceHref: '/dashboard/staff/players',
      });
    }
    if (
      player.class === PlayerClass.VANGUARD
      || player.class === PlayerClass.DIVINE_CASTER
      || player.class === PlayerClass.DEATHBRINGER
    ) {
      add({
        key: 'critical-class',
        label: 'Classe critica',
        severity: 'info',
        explanation: `${player.class} costuma pesar em composicao, escala e prioridade operacional.`,
        evidenceHref: '/dashboard/staff/players',
      });
    }
    const recentDisputes = player.auctionDisputes.filter((dispute) => dispute.createdAt >= sixtyDaysCutoff).length;
    if (recentDisputes >= 2) {
      add({
        key: 'many-disputes',
        label: 'Muita contestacao',
        severity: recentDisputes >= 3 ? 'danger' : 'warning',
        explanation: `${recentDisputes} contestacoes nos ultimos 60 dias.`,
        evidenceHref: '/dashboard/staff/reviews',
      });
    }
    const recentClassChanges = player.combatProfileRequests.filter((request) => (request.reviewedAt ?? request.createdAt) >= sixtyDaysCutoff).length;
    if (recentClassChanges >= 2) {
      add({
        key: 'many-class-changes',
        label: 'Muita troca de classe/build',
        severity: recentClassChanges >= 3 ? 'danger' : 'warning',
        explanation: `${recentClassChanges} mudancas de perfil de combate aprovadas nos ultimos 60 dias.`,
        evidenceHref: '/dashboard/staff/players',
      });
    }
    const lockedShare = totalDkp > 0 ? Math.round((lockedDkp / totalDkp) * 100) : 0;
    if (lockedDkp >= 500 || lockedShare >= 50) {
      add({
        key: 'high-locked-dkp',
        label: 'DKP travado alto',
        severity: lockedDkp >= 1000 || lockedShare >= 75 ? 'danger' : 'warning',
        explanation: `${lockedDkp} DKP travado (${lockedShare}% do saldo positivo calculado).`,
        evidenceHref: '/dashboard/staff/dkp',
      });
    }

    return flags;
  }

  private async loadDossierAuditLogs(or: Prisma.AuditLogWhereInput[]): Promise<UniversalDossier['auditLogs']> {
    const logs = await this.prisma.auditLog.findMany({
      where: { OR: or },
      include: {
        actor: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      actorName: log.actor?.discordNickname ?? log.actor?.discordUsername ?? null,
      createdAt: log.createdAt,
    }));
  }

  private buildUniversalMarkdown(
    title: string,
    id: string,
    summary: UniversalDossier['summary'],
    sections: string[],
    auditLogs: UniversalDossier['auditLogs'],
  ): string {
    return [
      `# ${title}`,
      '',
      `Gerado em: ${new Date().toISOString()}`,
      `ID: ${id}`,
      '',
      '## Resumo',
      ...this.markdownList(summary.map((item) => `${item.label}: ${item.value}`)),
      '',
      ...sections,
      '',
      '## Audit logs recentes',
      ...this.markdownList(auditLogs.map((log) => `${log.createdAt.toISOString()} - ${log.action} (${log.targetType}/${log.targetId ?? '-'}) por ${log.actorName ?? 'sistema'}`)),
    ].join('\n');
  }
}
