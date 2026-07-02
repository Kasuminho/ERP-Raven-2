import { Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus, DKPTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OperationsService } from '../operations.service';
import {
  AuctionDiagnosticOption,
  AuctionDiagnosticSummary,
  AuctionDossier,
  AuctionFinalizationPreview,
  AuctionTimelineEvent,
  UniversalDossier,
  UniversalDossierType,
} from '../operations.types';

@Injectable()
export class AuctionDiagnosticsService {
  constructor(
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
  ) {}

  async getAuctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    const auctions = await this.prisma.auction.findMany({
      select: {
        id: true,
        itemName: true,
        endsAt: true,
      },
      orderBy: { endsAt: 'desc' },
      take: 100,
    });

    const auctionIds = auctions.map((auction) => auction.id);
    const wins = auctionIds.length
      ? await this.prisma.dKPTransaction.findMany({
          where: {
            type: DKPTransactionType.AUCTION_WIN,
            referenceId: { in: auctionIds },
          },
          include: {
            player: {
              select: {
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const winnerByAuctionId = new Map(wins.map((win) => [win.referenceId, win.player.nickname]));

    return auctions.map((auction) => ({
      id: auction.id,
      itemName: auction.itemName,
      winnerName: winnerByAuctionId.get(auction.id) ?? null,
      endedAt: auction.endsAt,
    }));
  }

  getAuctionDiagnostics(auctionId: string): Promise<AuctionDiagnosticSummary> {
    return this.operations.getAuctionDiagnostics(auctionId);
  }

  getAuctionFinalizationPreview(auctionId: string): Promise<AuctionFinalizationPreview> {
    return this.operations.getAuctionFinalizationPreview(auctionId);
  }

  getAuctionDossier(auctionId: string): Promise<AuctionDossier> {
    return this.operations.getAuctionDossier(auctionId);
  }

  getUniversalDossier(type: UniversalDossierType, id: string): Promise<UniversalDossier> {
    return this.operations.getUniversalDossier(type, id);
  }

  async getAuctionTimeline(auctionId: string): Promise<AuctionTimelineEvent[]> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        createdBy: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
        bids: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        dkpLocks: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bidCancellationRequests: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
            reviewedBy: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reviewVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
        bidInvalidationVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
            bid: {
              include: {
                player: {
                  select: {
                    id: true,
                    nickname: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
        dropHistory: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction was not found.');
    }

    const bidIds = auction.bids.map((bid) => bid.id);
    const lockIds = auction.dkpLocks.map((lock) => lock.id);
    const cancellationIds = auction.bidCancellationRequests.map((request) => request.id);
    const relatedTargetIds = [auction.id, ...bidIds, ...lockIds, ...cancellationIds];
    const auditOr: Prisma.AuditLogWhereInput[] = [
      { targetId: { in: relatedTargetIds } },
      { metadata: { path: ['auctionId'], equals: auction.id } },
      ...bidIds.map((bidId) => ({ metadata: { path: ['bidId'], equals: bidId } })),
      ...lockIds.map((lockId) => ({ metadata: { path: ['releasedLockId'], equals: lockId } })),
    ];
    const [transactions, auditLogs] = await Promise.all([
      this.prisma.dKPTransaction.findMany({
        where: {
          referenceId: auction.id,
          type: { in: [DKPTransactionType.AUCTION_LOCK, DKPTransactionType.AUCTION_REFUND, DKPTransactionType.AUCTION_WIN] },
        },
        include: {
          player: {
            select: {
              id: true,
              nickname: true,
            },
          },
          createdBy: {
            select: {
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: { OR: auditOr },
        include: {
          actor: {
            select: {
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 120,
      }),
    ]);

    const events: AuctionTimelineEvent[] = [
      {
        id: `auction-created:${auction.id}`,
        type: 'AUCTION_CREATED',
        title: 'Leilao criado',
        description: `${auction.itemName} abriu com minimo de ${auction.minimumBid} DKP em modo ${auction.auctionMode}.`,
        occurredAt: auction.createdAt,
        tone: 'blue',
        actorName: this.userLabel(auction.createdBy),
        targetId: auction.id,
        metadata: {
          itemTier: auction.itemTier,
          itemType: auction.itemType,
          minimumLayer: auction.minimumLayer,
          requiresStaffReview: auction.requiresStaffReview,
        },
      },
      {
        id: `auction-ends:${auction.id}`,
        type: 'AUCTION_ENDS_AT',
        title: auction.endsAt <= new Date() ? 'Horario de encerramento passou' : 'Encerramento planejado',
        description: auction.endsAt <= new Date()
          ? 'O horario configurado para o fim do leilao ja passou.'
          : 'Horario planejado para a automacao avaliar o fechamento.',
        occurredAt: auction.endsAt,
        tone: auction.endsAt <= new Date() ? 'gold' : 'muted',
        targetId: auction.id,
      },
    ];

    if (auction.updatedAt.getTime() !== auction.createdAt.getTime()) {
      events.push({
        id: `auction-status:${auction.id}:${auction.updatedAt.toISOString()}`,
        type: 'AUCTION_STATUS_CURRENT',
        title: 'Estado atual do leilao',
        description: `Status atual: ${auction.status}.`,
        occurredAt: auction.updatedAt,
        tone: auction.status === AuctionStatus.FINISHED ? 'green' : auction.status === AuctionStatus.CANCELLED ? 'red' : 'gold',
        targetId: auction.id,
      });
    }

    for (const bid of auction.bids) {
      events.push({
        id: `bid:${bid.id}`,
        type: 'BID_CREATED',
        title: bid.isValid ? 'Bid registrado' : 'Bid registrado e invalidado',
        description: `${bid.player.nickname} registrou bid de ${bid.bidAmount} DKP.`,
        occurredAt: bid.createdAt,
        tone: bid.isValid ? 'blue' : 'red',
        actorName: bid.player.nickname,
        targetId: bid.id,
        metadata: { playerId: bid.playerId, bidAmount: bid.bidAmount, isValid: bid.isValid },
      });
    }

    for (const lock of auction.dkpLocks) {
      events.push({
        id: `lock:${lock.id}`,
        type: 'DKP_LOCK_CREATED',
        title: lock.released ? 'Lock de DKP criado e liberado' : 'Lock de DKP criado',
        description: `${lock.player.nickname} travou ${lock.amount} DKP neste leilao.`,
        occurredAt: lock.createdAt,
        tone: lock.released ? 'muted' : 'gold',
        actorName: lock.player.nickname,
        targetId: lock.id,
        metadata: { playerId: lock.playerId, amount: lock.amount, released: lock.released },
      });
    }

    for (const request of auction.bidCancellationRequests) {
      events.push({
        id: `cancel-request:${request.id}`,
        type: 'BID_CANCELLATION_REQUESTED',
        title: 'Cancelamento de bid solicitado',
        description: `${request.player.nickname} pediu cancelamento do bid.`,
        occurredAt: request.createdAt,
        tone: 'gold',
        actorName: request.player.nickname,
        targetId: request.id,
        metadata: { bidId: request.bidId, status: request.status, reason: request.reason },
      });

      if (request.reviewedAt) {
        events.push({
          id: `cancel-review:${request.id}`,
          type: 'BID_CANCELLATION_REVIEWED',
          title: request.status === 'APPROVED' ? 'Cancelamento aprovado' : 'Cancelamento rejeitado',
          description: request.reviewNote ?? `Pedido ficou com status ${request.status}.`,
          occurredAt: request.reviewedAt,
          tone: request.status === 'APPROVED' ? 'green' : request.status === 'REJECTED' ? 'red' : 'gold',
          actorName: this.userLabel(request.reviewedBy),
          targetId: request.id,
          metadata: { bidId: request.bidId, status: request.status },
        });
      }
    }

    for (const vote of auction.reviewVotes) {
      events.push({
        id: `review-vote:${vote.id}`,
        type: 'REVIEW_VOTE',
        title: vote.action === 'APPROVE' ? 'Voto de aprovacao' : 'Voto de rejeicao',
        description: vote.reason ?? `Voto ${vote.action} registrado na review.`,
        occurredAt: vote.updatedAt,
        tone: vote.action === 'APPROVE' ? 'green' : 'red',
        actorName: this.userLabel(vote.voter),
        targetId: vote.id,
        metadata: { playerId: vote.playerId, action: vote.action },
      });
    }

    for (const vote of auction.bidInvalidationVotes) {
      events.push({
        id: `bid-invalidation:${vote.id}`,
        type: 'BID_INVALIDATION_VOTE',
        title: 'Voto para invalidar bid',
        description: `${this.userLabel(vote.voter) ?? 'Staff'} votou para invalidar o bid de ${vote.bid.player.nickname}.`,
        occurredAt: vote.updatedAt,
        tone: 'red',
        actorName: this.userLabel(vote.voter),
        targetId: vote.bidId,
        metadata: { bidId: vote.bidId, playerId: vote.bid.playerId, reason: vote.reason },
      });
    }

    for (const transaction of transactions) {
      const transactionLabels: Record<DKPTransactionType, { title: string; tone: AuctionTimelineEvent['tone'] }> = {
        [DKPTransactionType.AUCTION_LOCK]: { title: 'Transacao de lock registrada', tone: 'gold' },
        [DKPTransactionType.AUCTION_REFUND]: { title: 'Reembolso de lock registrado', tone: 'blue' },
        [DKPTransactionType.AUCTION_WIN]: { title: 'Vitoria consumiu DKP', tone: 'green' },
        [DKPTransactionType.EVENT_REWARD]: { title: 'Transacao de evento', tone: 'muted' },
        [DKPTransactionType.ADMIN_ADJUSTMENT]: { title: 'Ajuste administrativo', tone: 'muted' },
      };
      const label = transactionLabels[transaction.type];
      events.push({
        id: `transaction:${transaction.id}`,
        type: transaction.type,
        title: label.title,
        description: `${transaction.player.nickname}: ${transaction.amount} DKP.`,
        occurredAt: transaction.createdAt,
        tone: label.tone,
        actorName: this.userLabel(transaction.createdBy),
        targetId: transaction.id,
        metadata: { playerId: transaction.playerId, amount: transaction.amount },
      });
    }

    if (auction.dropHistory) {
      events.push({
        id: `drop:${auction.dropHistory.id}`,
        type: 'DROP_DELIVERED',
        title: 'Entrega registrada',
        description: `${auction.dropHistory.player?.nickname ?? auction.dropHistory.nicknameIngame ?? 'Player'} recebeu ${auction.dropHistory.itemName ?? auction.itemName}.`,
        occurredAt: auction.dropHistory.deliveredAt ?? auction.dropHistory.createdAt,
        tone: 'green',
        actorName: auction.dropHistory.staffDiscordId ?? null,
        targetId: auction.dropHistory.id,
        metadata: { playerId: auction.dropHistory.playerId, proofImageUrl: auction.dropHistory.proofImageUrl },
      });
    }

    for (const log of auditLogs) {
      events.push({
        id: `audit:${log.id}`,
        type: 'AUDIT_LOG',
        title: log.action,
        description: `${log.targetType}${log.targetId ? ` / ${log.targetId}` : ''}`,
        occurredAt: log.createdAt,
        tone: 'muted',
        actorName: log.actor ? this.userLabel(log.actor) : null,
        targetId: log.targetId,
        metadata: log.metadata as Record<string, unknown> | null,
      });
    }

    return events.sort((left, right) => {
      const byTime = left.occurredAt.getTime() - right.occurredAt.getTime();
      if (byTime !== 0) return byTime;
      return left.type.localeCompare(right.type);
    });
  }

  private userLabel(user?: { discordNickname?: string | null; discordUsername: string } | null): string | null {
    if (!user) return null;
    return user.discordNickname ?? user.discordUsername;
  }
}
