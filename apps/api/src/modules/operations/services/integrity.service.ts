import { Injectable } from '@nestjs/common';
import {
  AuctionStatus,
  CodexRequestStatus,
  DKPTransactionType,
  EventStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { IntegrityIssue, IntegritySummary, LegacyAuditSummary } from '../operations.types';

const DAYS = 24 * 60 * 60 * 1000;

@Injectable()
export class IntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  async getIntegritySummary(): Promise<IntegritySummary> {
    const now = new Date();
    const oldCodexDate = new Date(now.getTime() - 7 * DAYS);
    const [
      validBids,
      activeLocks,
      expiredOpenAuctions,
      staleSentCodex,
      finalizedEvents,
      eventTransactions,
      incompletePlayers,
      codexImageDeleteFailures,
    ] = await Promise.all([
      this.prisma.auctionBid.findMany({
        where: {
          isValid: true,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: { select: { id: true, itemName: true, status: true } }, player: { select: { nickname: true } } },
        take: 500,
      }),
      this.prisma.dKPLock.findMany({
        where: {
          released: false,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: { select: { id: true, itemName: true, status: true } }, player: { select: { nickname: true } } },
        take: 500,
      }),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { lt: now } },
        orderBy: { endsAt: 'asc' },
        take: 50,
      }),
      this.prisma.codexRequest.findMany({
        where: { status: CodexRequestStatus.SENT, sentAt: { lt: oldCodexDate } },
        include: { player: { select: { nickname: true } } },
        orderBy: { sentAt: 'asc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { status: EventStatus.FINALIZED },
        select: { id: true, name: true, finalizedAt: true },
        orderBy: { finalizedAt: 'desc' },
        take: 200,
      }),
      this.prisma.dKPTransaction.findMany({
        where: { type: DKPTransactionType.EVENT_REWARD, referenceId: { not: null } },
        select: { referenceId: true },
        take: 1000,
      }),
      this.prisma.player.findMany({
        where: {
          isActive: true,
          OR: [
            { nickname: { equals: '' } },
            { dimensionalLayer: { lt: 1 } },
          ],
        },
        select: { id: true, nickname: true, dimensionalLayer: true, userId: true },
        take: 50,
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'CODEX_REQUEST_IMAGE_DELETE_FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const lockByBidKey = new Set(activeLocks.map((lock) => `${lock.auctionId}:${lock.playerId}`));
    const bidByLockKey = new Set(validBids.map((bid) => `${bid.auctionId}:${bid.playerId}`));
    const eventIdsWithTransactions = new Set(eventTransactions.map((transaction) => transaction.referenceId).filter(Boolean));
    const issues: IntegrityIssue[] = [];

    for (const bid of validBids.filter((bid) => !lockByBidKey.has(`${bid.auctionId}:${bid.playerId}`)).slice(0, 50)) {
      issues.push({
        id: `bid-lock-${bid.id}`,
        type: 'BID_WITHOUT_LOCK',
        severity: 'high',
        title: 'Bid valido sem lock',
        description: `${bid.player.nickname} tem bid valido em ${bid.auction.itemName}, mas sem DKP travado.`,
        href: `/dashboard/auctions/${bid.auctionId}`,
        createdAt: bid.createdAt,
        metadata: { auctionId: bid.auctionId, playerId: bid.playerId, bidId: bid.id },
      });
    }

    for (const lock of activeLocks.filter((lock) => !bidByLockKey.has(`${lock.auctionId}:${lock.playerId}`)).slice(0, 50)) {
      issues.push({
        id: `lock-bid-${lock.id}`,
        type: 'LOCK_WITHOUT_BID',
        severity: 'high',
        title: 'Lock ativo sem bid valido',
        description: `${lock.player.nickname} tem ${lock.amount} DKP travado em ${lock.auction.itemName}, mas sem bid valido.`,
        href: `/dashboard/auctions/${lock.auctionId}`,
        createdAt: lock.createdAt,
        metadata: { auctionId: lock.auctionId, playerId: lock.playerId, lockId: lock.id },
      });
    }

    for (const auction of expiredOpenAuctions) {
      issues.push({
        id: `expired-auction-${auction.id}`,
        type: 'EXPIRED_OPEN_AUCTION',
        severity: 'medium',
        title: 'Leilao aberto vencido',
        description: `${auction.itemName} passou do horario de fechamento e ainda esta OPEN.`,
        href: `/dashboard/auctions/${auction.id}`,
        createdAt: auction.endsAt,
        metadata: { auctionId: auction.id, endsAt: auction.endsAt.toISOString() },
      });
    }

    for (const request of staleSentCodex) {
      issues.push({
        id: `codex-sent-${request.id}`,
        type: 'STALE_SENT_CODEX',
        severity: 'medium',
        title: 'Codex enviado sem confirmacao',
        description: `${request.player.nickname} tem codex enviado ha mais de 7 dias sem confirmar ou pedir retry.`,
        href: '/dashboard/staff/codex',
        createdAt: request.sentAt ?? request.updatedAt,
        metadata: { codexRequestId: request.id, playerId: request.playerId },
      });
    }

    for (const event of finalizedEvents.filter((event) => !eventIdsWithTransactions.has(event.id)).slice(0, 50)) {
      issues.push({
        id: `event-dkp-${event.id}`,
        type: 'FINALIZED_EVENT_WITHOUT_DKP',
        severity: 'high',
        title: 'Evento finalizado sem DKP',
        description: `${event.name} esta finalizado, mas nao encontrei transacao EVENT_REWARD vinculada.`,
        href: '/dashboard/admin/events',
        createdAt: event.finalizedAt ?? undefined,
        metadata: { eventId: event.id },
      });
    }

    for (const player of incompletePlayers) {
      issues.push({
        id: `player-incomplete-${player.id}`,
        type: 'INCOMPLETE_PLAYER_PROFILE',
        severity: 'low',
        title: 'Player com perfil incompleto',
        description: `${player.nickname || player.id} precisa revisar dados operacionais do perfil.`,
        href: `/dashboard/staff/item-audit?discordId=${player.userId ?? ''}`,
        metadata: { playerId: player.id, dimensionalLayer: player.dimensionalLayer },
      });
    }

    for (const log of codexImageDeleteFailures) {
      issues.push({
        id: `codex-image-${log.id}`,
        type: 'CONFIRMED_CODEX_IMAGE_PRESENT',
        severity: 'low',
        title: 'Falha ao limpar imagem de codex',
        description: 'Houve falha auditada ao tentar remover imagem/prova de codex no Google Drive.',
        href: '/dashboard/staff/codex',
        createdAt: log.createdAt,
        metadata: { auditLogId: log.id, targetId: log.targetId, metadata: log.metadata },
      });
    }

    const ordered = issues.sort((left, right) => {
      const weight = { high: 0, medium: 1, low: 2 };
      return weight[left.severity] - weight[right.severity]
        || new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    }).slice(0, 150);

    return {
      generatedAt: now,
      counts: {
        high: ordered.filter((issue) => issue.severity === 'high').length,
        medium: ordered.filter((issue) => issue.severity === 'medium').length,
        low: ordered.filter((issue) => issue.severity === 'low').length,
        total: ordered.length,
      },
      issues: ordered,
    };
  }

  async getLegacyAudit(): Promise<LegacyAuditSummary> {
    const [unlinkedDrops, unlinkedRequests, itemsWithoutTier, itemsWithoutType, inactiveItems, recentUnlinkedDrops, recentUnlinkedRequests] = await Promise.all([
      this.prisma.dropHistory.count({ where: { playerId: null } }),
      this.prisma.itemRequest.count({ where: { playerId: null } }),
      this.prisma.itemCatalog.count({ where: { itemTier: null } }),
      this.prisma.itemCatalog.count({ where: { itemType: null } }),
      this.prisma.itemCatalog.count({ where: { isActive: false } }),
      this.prisma.dropHistory.findMany({
        where: { playerId: null },
        select: { id: true, discordId: true, nicknameIngame: true, itemName: true, deliveredAt: true },
        orderBy: { deliveredAt: 'desc' },
        take: 20,
      }),
      this.prisma.itemRequest.findMany({
        where: { playerId: null },
        select: { id: true, discordId: true, playerName: true, itemName: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { generatedAt: new Date(), unlinkedDrops, unlinkedRequests, itemsWithoutTier, itemsWithoutType, inactiveItems, recentUnlinkedDrops, recentUnlinkedRequests };
  }
}
