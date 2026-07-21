import { Injectable } from '@nestjs/common';
import {
  AuctionStatus,
  CodexRequestStatus,
  EventStatus,
  ItemInterestStatus,
  ProgressReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NoticeBoardItem, OperationTask, PlayerActionPlan, PlayerOperationsSummary } from '../operations.types';

const HOURS = 60 * 60 * 1000;

function isBossRequest(request: { itemCatalog?: { category?: string | null } | null }): boolean {
  return request.itemCatalog?.category === 'creature';
}

@Injectable()
export class PlayerOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayerSummary(userId: string): Promise<PlayerOperationsSummary> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      return { tasks: [], counts: { urgent: 0, bids: 0, requests: 0, codex: 0, interests: 0, progress: 0 } };
    }

    const [requests, codexRequests, bids, openInterests, myInterestEntries, progress, progressesWithComments] = await Promise.all([
      this.prisma.itemRequest.findMany({
        where: { playerId: player.id, remainingQuantity: { gt: 0 } },
        include: { itemCatalog: true },
        orderBy: [{ rankPosition: 'asc' }, { updatedAt: 'asc' }],
        take: 8,
      }),
      this.prisma.codexRequest.findMany({
        where: {
          playerId: player.id,
          status: { in: [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY, CodexRequestStatus.SENT] },
        },
        orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
        take: 8,
      }),
      this.prisma.auctionBid.findMany({
        where: {
          playerId: player.id,
          isValid: true,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: ItemInterestStatus.OPEN, closesAt: { gt: new Date() } },
        include: { itemCatalog: true },
        orderBy: { closesAt: 'asc' },
        take: 12,
      }),
      this.prisma.itemInterestEntry.findMany({
        where: { playerId: player.id, post: { status: ItemInterestStatus.OPEN } },
        select: { postId: true },
      }),
      this.prisma.playerProgress.findMany({
        where: { playerId: player.id, reviewStatus: ProgressReviewStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.playerProgress.findMany({
        where: {
          playerId: player.id,
          comments: {
            some: {
              author: {
                players: {
                  some: {
                    roles: {
                      some: {
                        role: { name: { in: ['STAFF', 'ADMIN'] } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  discordNickname: true,
                  discordUsername: true,
                  players: {
                    select: {
                      roles: { select: { role: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const declaredInterestIds = new Set(myInterestEntries.map((entry) => entry.postId));
    const tasks: OperationTask[] = [];

    for (const request of requests) {
      if (!isBossRequest(request) && request.rankPosition === 1 && (request.warned3d || request.warned4d)) {
        tasks.push({
          id: request.id,
          type: 'ITEM_REQUEST_UPDATE',
          title: 'Atualizar Item Request',
          description: `${request.itemName} precisa de um print novo para manter sua posicao no ranking.`,
          href: '/dashboard/item-requests',
          priority: request.warned4d ? 'high' : 'medium',
          createdAt: request.updatedAt,
        });
      }
    }

    for (const request of codexRequests) {
      if (request.status === CodexRequestStatus.SENT) {
        tasks.push({
          id: request.id,
          type: 'CODEX_CONFIRMATION',
          title: 'Confirmar Codex',
          description: 'A Staff marcou o codex como enviado. Confirme se deu certo ou peca retry se quebrou.',
          href: '/dashboard/codex',
          priority: 'high',
          createdAt: request.sentAt ?? request.updatedAt,
        });
      }
    }

    for (const bid of bids) {
      tasks.push({
        id: bid.id,
        type: 'AUCTION_BID',
        title: 'Bid em andamento',
        description: `${bid.auction.itemName} esta ${bid.auction.status}. Seu bid atual: ${bid.bidAmount} DKP.`,
        href: `/dashboard/auctions/${bid.auctionId}`,
        priority: bid.auction.status === AuctionStatus.PENDING_REVIEW ? 'medium' : 'low',
        createdAt: bid.createdAt,
        metadata: {
          itemName: bid.auction.itemName,
          status: bid.auction.status,
          bidAmount: bid.bidAmount,
          dueAt: bid.auction.endsAt.toISOString(),
        },
      });
    }

    for (const post of openInterests.filter((post) => !declaredInterestIds.has(post.id)).slice(0, 5)) {
      tasks.push({
        id: post.id,
        type: 'OPEN_INTEREST',
        title: 'Interesse aberto',
        description: `${post.title} fecha em ${post.closesAt.toLocaleString('pt-BR')}.`,
        href: '/dashboard/interests',
        priority: post.closesAt.getTime() - Date.now() < 6 * HOURS ? 'medium' : 'low',
        createdAt: post.createdAt,
        metadata: {
          title: post.title,
          closesAt: post.closesAt.toISOString(),
          dueAt: post.closesAt.toISOString(),
        },
      });
    }

    for (const row of progress) {
      tasks.push({
        id: row.id,
        type: 'PROGRESS_REVIEW',
        title: 'Progresso aguardando review',
        description: `${row.category} esta pendente de validacao da Staff.`,
        href: '/dashboard/profile',
        priority: 'low',
        createdAt: row.createdAt,
        metadata: {
          category: row.category,
        },
      });
    }

    const unreadProgressComments = progressesWithComments.filter((row) => row.comments.some((comment) => {
      const isStaffComment = comment.author.players.some((authorPlayer) => authorPlayer.roles.some((roleRow) => ['STAFF', 'ADMIN'].includes(roleRow.role.name)));
      const wasRead = row.playerReadCommentsAt && comment.createdAt <= row.playerReadCommentsAt;
      return isStaffComment && !wasRead;
    }));

    for (const row of unreadProgressComments.slice(0, 5)) {
      tasks.push({
        id: row.id,
        type: 'PROGRESS_STAFF_COMMENT',
        title: 'Comentario da Staff no progresso',
        description: `${row.category} recebeu comentario da Staff. Veja antes de mandar nova atualizacao.`,
        href: '/dashboard/profile',
        priority: 'medium',
        createdAt: row.comments[0]?.createdAt ?? row.createdAt,
        metadata: {
          category: row.category,
          unreadComments: row.comments.length,
        },
      });
    }

    return {
      tasks: this.sortTasks(tasks).slice(0, 12),
      counts: {
        urgent: tasks.filter((task) => task.priority === 'high').length,
        bids: bids.length,
        requests: requests.length,
        codex: codexRequests.length,
        interests: openInterests.filter((post) => !declaredInterestIds.has(post.id)).length,
        progress: progress.length + unreadProgressComments.length,
      },
    };
  }

  async getPlayerActionPlan(userId: string): Promise<PlayerActionPlan> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });
    const now = new Date();

    if (!player) {
      return {
        generatedAt: now,
        headline: 'Plano indisponivel',
        summary: 'Nao encontrei um player ativo vinculado a esta conta.',
        cards: [],
      };
    }

    const [
      requests,
      codexRequests,
      bids,
      openInterests,
      myInterestEntries,
      pendingProgress,
      progressesWithComments,
      upcomingEvents,
      activeAuctions,
      locks,
      pendingPolicyReceipts,
    ] = await Promise.all([
      this.prisma.itemRequest.findMany({
        where: { playerId: player.id, remainingQuantity: { gt: 0 } },
        include: { itemCatalog: true },
        orderBy: [{ rankPosition: 'asc' }, { updatedAt: 'asc' }],
        take: 8,
      }),
      this.prisma.codexRequest.findMany({
        where: {
          playerId: player.id,
          status: { in: [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY, CodexRequestStatus.SENT] },
        },
        orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
        take: 8,
      }),
      this.prisma.auctionBid.findMany({
        where: {
          playerId: player.id,
          isValid: true,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: ItemInterestStatus.OPEN, closesAt: { gt: now } },
        include: { itemCatalog: true },
        orderBy: { closesAt: 'asc' },
        take: 12,
      }),
      this.prisma.itemInterestEntry.findMany({
        where: { playerId: player.id, post: { status: ItemInterestStatus.OPEN } },
        select: { postId: true },
      }),
      this.prisma.playerProgress.findMany({
        where: { playerId: player.id, reviewStatus: ProgressReviewStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.playerProgress.findMany({
        where: {
          playerId: player.id,
          comments: {
            some: {
              author: {
                players: {
                  some: {
                    roles: {
                      some: {
                        role: { name: { in: ['STAFF', 'ADMIN'] } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          comments: {
            include: {
              author: {
                select: {
                  players: {
                    select: {
                      roles: { select: { role: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.event.findMany({
        where: {
          status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
          startsAt: { gte: now },
        },
        orderBy: { startsAt: 'asc' },
        take: 3,
      }),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { gt: now } },
        orderBy: { endsAt: 'asc' },
        take: 12,
      }),
      this.prisma.dKPLock.findMany({
        where: { playerId: player.id, released: false },
        select: { auctionId: true, amount: true },
      }),
      this.prisma.guildPolicyReceipt.findMany({
        where: { playerId: player.id, acknowledgedAt: null, policy: { status: 'PUBLISHED' } },
        include: { policy: true },
        orderBy: [{ policy: { isEmergency: 'desc' } }, { policy: { effectiveAt: 'asc' } }],
        take: 5,
      }),
    ]);

    const declaredInterestIds = new Set(myInterestEntries.map((entry) => entry.postId));
    const bidAuctionIds = new Set(bids.map((bid) => bid.auctionId));
    const lockByAuctionId = new Map(locks.map((lock) => [lock.auctionId, lock.amount]));
    const cards: PlayerActionPlan['cards'] = [];

    for (const receipt of pendingPolicyReceipts) {
      cards.push(this.actionCard({
        id: receipt.policyId,
        type: receipt.policy.isEmergency ? 'GUILD_POLICY_EMERGENCY' : 'GUILD_POLICY_ACKNOWLEDGEMENT',
        title: receipt.policy.isEmergency ? 'Leia a mudanca emergencial' : `Leia a politica v${receipt.policy.version ?? '-'}`,
        description: receipt.policy.summaryPt,
        actionLabel: 'Abrir regras',
        href: '/dashboard/rules',
        priority: receipt.policy.isEmergency ? 'high' : 'medium',
        reason: 'Existe uma versao publicada sem recibo de ciencia registrado.',
        impact: 'Confirma apenas que voce abriu e entendeu a informacao; nao e concordancia juridica ampla.',
        dueAt: receipt.policy.effectiveAt,
        metadata: { policyId: receipt.policyId, version: receipt.policy.version, isEmergency: receipt.policy.isEmergency },
      }));
    }

    for (const request of codexRequests) {
      if (request.status === CodexRequestStatus.SENT) {
        cards.push(this.actionCard({
          id: request.id,
          type: 'CODEX_CONFIRMATION',
          title: 'Confirme seu codex',
          description: 'A Staff marcou o codex como enviado. Confirme se funcionou ou peca retry.',
          actionLabel: 'Abrir codex',
          href: '/dashboard/codex',
          priority: 'high',
          reason: 'Confirmacao libera a fila e evita retrabalho da Staff.',
          impact: 'Mantem sua progressao e limpa uma pendencia operacional.',
          dueAt: request.sentAt ?? request.updatedAt,
        }));
      } else if (request.status === CodexRequestStatus.NEEDS_RETRY) {
        cards.push(this.actionCard({
          id: request.id,
          type: 'CODEX_RETRY',
          title: 'Codex pediu retry',
          description: 'Existe um codex com retry solicitado. Revise o envio antes de abrir outro.',
          actionLabel: 'Ver retry',
          href: '/dashboard/codex',
          priority: 'medium',
          reason: 'Retry parado costuma virar ping perdido no Discord.',
          impact: 'Ajuda a Staff a fechar a solicitacao correta.',
          dueAt: request.retryRequestedAt ?? request.updatedAt,
        }));
      }
    }

    const unreadProgressComments = progressesWithComments.filter((row) => row.comments.some((comment) => {
      const isStaffComment = comment.author.players.some((authorPlayer) => authorPlayer.roles.some((roleRow) => ['STAFF', 'ADMIN'].includes(roleRow.role.name)));
      const wasRead = row.playerReadCommentsAt && comment.createdAt <= row.playerReadCommentsAt;
      return isStaffComment && !wasRead;
    }));

    for (const row of unreadProgressComments.slice(0, 3)) {
      cards.push(this.actionCard({
        id: row.id,
        type: 'PROGRESS_STAFF_COMMENT',
        title: 'Leia o comentario da Staff',
        description: `${row.category} recebeu comentario da Staff.`,
        actionLabel: 'Abrir perfil',
        href: '/dashboard/profile',
        priority: 'high',
        reason: 'Responder o comentario certo evita mandar print errado de novo.',
        impact: 'Acelera validacao de CP/camada/progresso.',
        dueAt: row.comments[0]?.createdAt ?? row.createdAt,
        metadata: { category: row.category },
      }));
    }

    for (const request of requests.filter((row) => !isBossRequest(row) && row.rankPosition === 1 && (row.warned3d || row.warned4d)).slice(0, 3)) {
      cards.push(this.actionCard({
        id: request.id,
        type: 'ITEM_REQUEST_UPDATE',
        title: 'Atualize o print do request',
        description: `${request.itemName} esta em primeiro na fila e precisa de prova atualizada.`,
        actionLabel: 'Atualizar request',
        href: '/dashboard/item-requests',
        priority: request.warned4d ? 'high' : 'medium',
        reason: request.warned4d ? 'Ultimo aviso antes de perder prioridade.' : 'Print antigo segura a entrega.',
        impact: 'Mantem sua posicao e reduz espera da guilda.',
        dueAt: request.updatedAt,
        metadata: { itemName: request.itemName, rankPosition: request.rankPosition },
      }));
    }

    for (const bid of bids.slice(0, 3)) {
      const lockAmount = lockByAuctionId.get(bid.auctionId);
      cards.push(this.actionCard({
        id: bid.id,
        type: 'AUCTION_BID',
        title: 'Acompanhe seu bid',
        description: `${bid.auction.itemName} esta ${bid.auction.status}. Seu bid: ${bid.bidAmount} DKP.`,
        actionLabel: 'Abrir leilao',
        href: `/dashboard/auctions/${bid.auctionId}`,
        priority: bid.auction.status === AuctionStatus.PENDING_REVIEW ? 'medium' : 'low',
        reason: lockAmount ? `${lockAmount} DKP seguem travados para este leilao.` : 'Seu bid esta ativo; confira o prazo.',
        impact: 'Evita surpresa com DKP travado e prazo de resultado.',
        dueAt: bid.auction.endsAt,
        metadata: { itemName: bid.auction.itemName, status: bid.auction.status, bidAmount: bid.bidAmount },
      }));
    }

    for (const post of openInterests.filter((post) => !declaredInterestIds.has(post.id)).slice(0, 3)) {
      const closesSoon = post.closesAt.getTime() - now.getTime() <= 6 * HOURS;
      cards.push(this.actionCard({
        id: post.id,
        type: 'OPEN_INTEREST',
        title: 'Declare interesse aberto',
        description: `${post.title} fecha em ${post.closesAt.toISOString()}.`,
        actionLabel: 'Declarar interesse',
        href: '/dashboard/interests',
        priority: closesSoon ? 'medium' : 'low',
        reason: closesSoon ? 'Fecha em poucas horas.' : 'Ainda da tempo de entrar sem correr.',
        impact: 'Coloca seu nome na avaliacao de loot sem expor concorrentes.',
        dueAt: post.closesAt,
        metadata: { title: post.title },
      }));
    }

    for (const row of pendingProgress.slice(0, 2)) {
      cards.push(this.actionCard({
        id: row.id,
        type: 'PROGRESS_REVIEW',
        title: 'Progresso em analise',
        description: `${row.category} esta aguardando validacao da Staff.`,
        actionLabel: 'Ver progresso',
        href: '/dashboard/profile',
        priority: 'low',
        reason: 'Enquanto esta em analise, evite mandar duplicado sem necessidade.',
        impact: 'Mantem a fila de review limpa.',
        dueAt: row.createdAt,
        metadata: { category: row.category },
      }));
    }

    const suggestedAuction = activeAuctions.find((auction) => !bidAuctionIds.has(auction.id) && (!auction.minimumLayer || player.dimensionalLayer >= auction.minimumLayer));
    if (suggestedAuction) {
      cards.push(this.actionCard({
        id: suggestedAuction.id,
        type: 'AUCTION_AVAILABLE',
        title: 'Leilao que voce pode avaliar',
        description: `${suggestedAuction.itemName} esta aberto ate ${suggestedAuction.endsAt.toISOString()}.`,
        actionLabel: 'Ver leilao',
        href: `/dashboard/auctions/${suggestedAuction.id}`,
        priority: suggestedAuction.endsAt.getTime() - now.getTime() <= 6 * HOURS ? 'medium' : 'low',
        reason: suggestedAuction.minimumLayer ? `Sua camada ${player.dimensionalLayer} atende a minima ${suggestedAuction.minimumLayer}.` : 'Leilao aberto sem camada minima especifica.',
        impact: 'Ajuda voce a decidir se vale gastar DKP agora.',
        dueAt: suggestedAuction.endsAt,
        metadata: { itemName: suggestedAuction.itemName, itemTier: suggestedAuction.itemTier },
      }));
    }

    const nextEvent = upcomingEvents[0];
    if (nextEvent) {
      cards.push(this.actionCard({
        id: nextEvent.id,
        type: 'UPCOMING_EVENT',
        title: 'Proximo evento da guilda',
        description: `${nextEvent.name} comeca em ${nextEvent.startsAt.toISOString()}.`,
        actionLabel: 'Ver eventos',
        href: '/dashboard/attendance',
        priority: nextEvent.startsAt.getTime() - now.getTime() <= 4 * HOURS ? 'medium' : 'low',
        reason: 'Presenca alimenta DKP, elegibilidade e progressao coletiva.',
        impact: 'Nao deixar evento passar e basicamente DKP gratis nao jogado fora.',
        dueAt: nextEvent.startsAt,
        metadata: { eventType: nextEvent.type },
      }));
    }

    const sortedCards = cards.sort((left, right) => {
      const weight = { high: 0, medium: 1, low: 2 };
      const priorityDiff = weight[left.priority] - weight[right.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(left.dueAt ?? 0).getTime() - new Date(right.dueAt ?? 0).getTime();
    }).slice(0, 8);

    return {
      generatedAt: now,
      headline: sortedCards.length ? 'Seu proximo passo' : 'Tudo limpo por enquanto',
      summary: sortedCards.length
        ? `${sortedCards.length} acao(oes) priorizadas para sua rotina agora.`
        : 'Sem pendencia pessoal urgente. Aproveita para revisar leiloes, eventos e progresso antes de alguem lembrar de voce.',
      cards: sortedCards,
    };
  }

  async getNoticeBoard(userId: string): Promise<NoticeBoardItem[]> {
    const summary = await this.getPlayerSummary(userId);
    const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true } });
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * HOURS);
    const notices: NoticeBoardItem[] = [...summary.tasks.map((task) => ({ ...task }))];

    const [endingAuctions, daoshiSummary] = await Promise.all([
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { gte: now, lte: soon } },
        orderBy: { endsAt: 'asc' },
        take: 6,
      }),
      player
        ? this.prisma.daoshiCashReceipt.aggregate({
            where: { playerId: player.id, status: 'PENDING' },
            _count: true,
          })
        : Promise.resolve({ _count: 0 }),
    ]);

    for (const auction of endingAuctions) {
      notices.push({
        id: auction.id,
        type: 'AUCTION_ENDING',
        title: 'Leilao fechando em breve',
        description: `${auction.itemName} fecha em ${auction.endsAt.toLocaleString('pt-BR')}.`,
        href: `/dashboard/auctions/${auction.id}`,
        priority: auction.endsAt.getTime() - now.getTime() < 4 * HOURS ? 'medium' : 'low',
        createdAt: auction.createdAt,
      });
    }

    if (daoshiSummary._count > 0) {
      notices.push({
        id: 'daoshi-pending',
        type: 'DAOSHI_PENDING',
        title: 'Comprovante Daoshi em analise',
        description: `${daoshiSummary._count} comprovante(s) aguardando validacao da Staff.`,
        href: '/dashboard/daoshi',
        priority: 'low',
        createdAt: now,
      });
    }

    return this.sortTasks(notices).slice(0, 16);
  }

  private sortTasks<T extends { priority: 'high' | 'medium' | 'low'; createdAt?: Date | string }>(tasks: T[]): T[] {
    const weight = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((left, right) => {
      const priority = weight[left.priority] - weight[right.priority];
      if (priority !== 0) return priority;
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });
  }

  private actionCard(card: PlayerActionPlan['cards'][number]): PlayerActionPlan['cards'][number] {
    return card;
  }
}
