import { Injectable, NotFoundException } from '@nestjs/common';
import { AuctionMode, AuctionStatus, DKPTransactionType, ItemTier, Prisma } from '@prisma/client';
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

  async getAuctionDiagnostics(auctionId: string): Promise<AuctionDiagnosticSummary> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
                dimensionalLayer: true,
                attendancePercentage: true,
              },
            },
          },
          orderBy: [{ isValid: 'desc' }, { bidAmount: 'desc' }, { createdAt: 'asc' }],
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
          },
          orderBy: { createdAt: 'desc' },
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
          orderBy: { updatedAt: 'desc' },
        },
        bidInvalidationVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction was not found.');
    }

    const now = new Date();
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
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { OR: auditOr },
      include: {
        actor: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    const activeLocks = auction.dkpLocks.filter((lock) => !lock.released);
    const activeLockByPlayer = new Map(activeLocks.map((lock) => [lock.playerId, lock]));
    const validBids = auction.bids.filter((bid) => bid.isValid);
    const invalidBids = auction.bids.filter((bid) => !bid.isValid);
    const minimumLayer = auction.minimumLayer ?? (auction.itemTier === ItemTier.T4 ? 4 : null);
    const validBidsAtMinimumLayer = minimumLayer
      ? validBids.filter((bid) => bid.player.dimensionalLayer >= minimumLayer)
      : validBids;
    const validBidsWithActiveLocks = validBids.filter((bid) => activeLockByPlayer.has(bid.playerId));
    const issues: AuctionDiagnosticSummary['issues'] = [];

    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      issues.push({
        severity: 'high',
        title: 'Leilao OPEN vencido',
        description: 'Este leilao ja passou do horario de fim e deve ser processado pelo job de finalizacao, nao pelo relist.',
      });
    }

    for (const bid of validBids) {
      const activeLock = activeLockByPlayer.get(bid.playerId);
      if (!activeLock) {
        issues.push({
          severity: 'high',
          title: 'Bid valido sem lock ativo',
          description: `${bid.player.nickname} tem bid valido sem DKP travado.`,
          metadata: { bidId: bid.id, playerId: bid.playerId },
        });
      } else if (activeLock.amount !== bid.bidAmount) {
        issues.push({
          severity: 'medium',
          title: 'Lock diferente do bid',
          description: `${bid.player.nickname} tem lock de ${activeLock.amount} DKP para bid de ${bid.bidAmount} DKP.`,
          metadata: { bidId: bid.id, lockId: activeLock.id },
        });
      }
    }

    for (const lock of activeLocks) {
      const validBid = validBids.find((bid) => bid.playerId === lock.playerId);
      if (!validBid) {
        issues.push({
          severity: 'high',
          title: 'Lock ativo sem bid valido',
          description: `${lock.player.nickname} tem DKP travado sem bid valido neste leilao.`,
          metadata: { lockId: lock.id, playerId: lock.playerId },
        });
      }
    }

    if (auction.status === AuctionStatus.PENDING_REVIEW && validBids.length === 0) {
      issues.push({
        severity: 'high',
        title: 'Review sem bid valido',
        description: 'Este leilao esta em review, mas nao possui nenhum bid valido.',
      });
    }

    if (auction.status === AuctionStatus.OPEN && auction.itemTier === ItemTier.T4 && minimumLayer && validBids.length > 0 && validBidsAtMinimumLayer.length === 0) {
      issues.push({
        severity: 'medium',
        title: 'Sem bid na camada minima atual',
        description: `Camada minima atual ${minimumLayer}. Ao finalizar vencido, a regra expande para a proxima camada.`,
      });
    }

    let outcome: AuctionDiagnosticSummary['outcome'] = 'NO_ACTION';
    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      if (auction.itemTier === ItemTier.T4 && minimumLayer && minimumLayer > 1 && validBidsAtMinimumLayer.length === 0) {
        outcome = 'EXPAND_LAYER';
      } else if (validBids.length === 0) {
        outcome = 'RELIST';
      } else if (auction.requiresStaffReview || auction.auctionMode !== AuctionMode.STANDARD) {
        outcome = 'PENDING_REVIEW';
      } else {
        outcome = 'FINISH_STANDARD';
      }
    }
    const stateReason = this.getAuctionStateReason({
      status: auction.status,
      endsAt: auction.endsAt,
      auctionMode: auction.auctionMode,
      requiresStaffReview: auction.requiresStaffReview,
      minimumLayer,
      reopensAt: auction.reopensAt,
      outcome,
      validBids: validBids.length,
    }, now);

    return {
      generatedAt: now,
      outcome,
      auction: {
        id: auction.id,
        itemName: auction.itemName,
        itemTier: auction.itemTier,
        itemType: auction.itemType,
        auctionMode: auction.auctionMode,
        status: auction.status,
        minimumBid: auction.minimumBid,
        minimumLayer: auction.minimumLayer,
        requiresStaffReview: auction.requiresStaffReview,
        endsAt: auction.endsAt,
        createdAt: auction.createdAt,
        updatedAt: auction.updatedAt,
      },
      stateReason,
      counts: {
        bids: auction.bids.length,
        validBids: validBids.length,
        invalidBids: invalidBids.length,
        activeLocks: activeLocks.length,
        validBidsWithActiveLocks: validBidsWithActiveLocks.length,
        validBidsAtMinimumLayer: validBidsAtMinimumLayer.length,
        cancellationRequests: auction.bidCancellationRequests.length,
        approvalVotes: auction.reviewVotes.filter((vote) => vote.action === 'APPROVE').length,
        rejectionVotes: auction.reviewVotes.filter((vote) => vote.action === 'REJECT').length,
        invalidationVotes: auction.bidInvalidationVotes.length,
        auditLogs: auditLogs.length,
      },
      issues,
      bids: auction.bids.map((bid) => {
        const activeLock = activeLockByPlayer.get(bid.playerId);
        return {
          id: bid.id,
          playerId: bid.playerId,
          nickname: bid.player.nickname,
          dimensionalLayer: bid.player.dimensionalLayer,
          attendancePercentage: bid.player.attendancePercentage,
          bidAmount: bid.bidAmount,
          isValid: bid.isValid,
          hasActiveLock: Boolean(activeLock),
          activeLockAmount: activeLock?.amount,
          createdAt: bid.createdAt,
        };
      }),
      locks: auction.dkpLocks.map((lock) => ({
        id: lock.id,
        playerId: lock.playerId,
        nickname: lock.player.nickname,
        amount: lock.amount,
        released: lock.released,
        createdAt: lock.createdAt,
      })),
      cancellationRequests: auction.bidCancellationRequests.map((request) => ({
        id: request.id,
        bidId: request.bidId,
        playerId: request.playerId,
        playerName: request.player.nickname,
        reason: request.reason,
        status: request.status,
        reviewNote: request.reviewNote,
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt,
      })),
      reviewVotes: auction.reviewVotes.map((vote) => ({
        id: vote.id,
        action: vote.action,
        playerId: vote.playerId,
        voterName: vote.voter.discordNickname ?? vote.voter.discordUsername,
        reason: vote.reason,
        updatedAt: vote.updatedAt,
      })),
      bidInvalidationVotes: auction.bidInvalidationVotes.map((vote) => ({
        id: vote.id,
        bidId: vote.bidId,
        voterName: vote.voter.discordNickname ?? vote.voter.discordUsername,
        reason: vote.reason,
        updatedAt: vote.updatedAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata as Record<string, unknown> | null,
        createdAt: log.createdAt,
        actorName: log.actor ? log.actor.discordNickname ?? log.actor.discordUsername : null,
      })),
    };
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

  private getAuctionStateReason(
    auction: {
      status: AuctionStatus;
      endsAt: Date;
      auctionMode: AuctionMode;
      requiresStaffReview: boolean;
      minimumLayer?: number | null;
      reopensAt?: Date | null;
      outcome: AuctionDiagnosticSummary['outcome'];
      validBids: number;
    },
    now: Date,
  ): AuctionDiagnosticSummary['stateReason'] {
    if (auction.status === AuctionStatus.OPEN && auction.endsAt > now) {
      return {
        title: 'Leilao aberto',
        description: `A automacao ainda nao deve finalizar: encerra em ${auction.endsAt.toISOString()}.`,
        tone: 'blue',
      };
    }

    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      const descriptions: Record<AuctionDiagnosticSummary['outcome'], string> = {
        NO_ACTION: 'O leilao venceu, mas o diagnostico nao encontrou acao automatica pendente.',
        FINISH_STANDARD: 'O leilao venceu com bid valido e pode finalizar pelo fluxo STANDARD.',
        PENDING_REVIEW: auction.requiresStaffReview || auction.auctionMode !== AuctionMode.STANDARD
          ? 'O leilao venceu e precisa entrar em review por regra de modo/tier.'
          : 'O leilao venceu e precisa de revisao antes da entrega.',
        EXPAND_LAYER: `Leilao T4 venceu sem bid apto na camada minima atual ${auction.minimumLayer ?? '-'}; a regra deve expandir a camada.`,
        RELIST: 'O leilao venceu sem bid valido; a regra deve relistar ou reiniciar o ciclo conforme tier/camada.',
      };
      return {
        title: 'Leilao vencido aguardando processamento',
        description: descriptions[auction.outcome],
        tone: auction.outcome === 'FINISH_STANDARD' ? 'green' : 'gold',
      };
    }

    if (auction.status === AuctionStatus.PENDING_REVIEW) {
      return {
        title: 'Aguardando review da Staff',
        description: auction.validBids > 0
          ? `${auction.validBids} bid(s) valido(s) aguardam decisao Staff.`
          : 'O leilao esta em review, mas o diagnostico nao encontrou bid valido.',
        tone: auction.validBids > 0 ? 'gold' : 'red',
      };
    }

    if (auction.status === AuctionStatus.FINISHED) {
      return {
        title: 'Leilao finalizado',
        description: 'O fluxo de vitoria ja foi processado; confira AUCTION_WIN e entrega na timeline.',
        tone: 'green',
      };
    }

    if (auction.status === AuctionStatus.RELISTED) {
      return {
        title: 'Leilao relistado',
        description: auction.reopensAt
          ? `O leilao esta aguardando reabertura em ${auction.reopensAt.toISOString()}.`
          : 'O leilao foi marcado para relist sem horario de reabertura registrado.',
        tone: 'gold',
      };
    }

    return {
      title: 'Leilao cancelado',
      description: 'O leilao foi cancelado e nao deve consumir DKP nem gerar entrega.',
      tone: 'red',
    };
  }
}
