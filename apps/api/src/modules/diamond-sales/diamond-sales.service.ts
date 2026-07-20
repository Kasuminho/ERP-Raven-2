import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiamondSaleBuyerType, DiamondSaleRecipientMode, DiamondSaleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { NotificationService } from '../discord/services/notification.service';
import { CreateDiamondSaleDto } from './dto';

const saleInclude = {
  itemCatalog: true,
  buyerPlayer: { select: { id: true, nickname: true, isActive: true } },
  recipients: {
    orderBy: [{ deliveredAt: 'asc' }, { playerNickname: 'asc' }],
    include: { player: { select: { id: true, nickname: true, isActive: true } } },
  },
} satisfies Prisma.DiamondSaleInclude;

type SaleWithRecipients = Prisma.DiamondSaleGetPayload<{ include: typeof saleInclude }>;

@Injectable()
export class DiamondSalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async getSetup() {
    const [items, activePlayers] = await Promise.all([
      this.prisma.itemCatalog.findMany({
        where: { isActive: true, diamondSaleEnabled: true },
        orderBy: [{ itemTier: 'asc' }, { namePt: 'asc' }],
      }),
      this.prisma.player.findMany({
        where: { isActive: true },
        select: { id: true, nickname: true, class: true, dimensionalLayer: true },
        orderBy: { nickname: 'asc' },
      }),
    ]);

    return { items, activePlayers, activePlayerCount: activePlayers.length };
  }

  async listSales(): Promise<SaleWithRecipients[]> {
    return this.prisma.diamondSale.findMany({
      include: saleInclude,
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
  }

  async getSale(saleId: string): Promise<SaleWithRecipients> {
    const sale = await this.prisma.diamondSale.findUnique({ where: { id: saleId }, include: saleInclude });
    if (!sale) {
      throw new NotFoundException('Venda por diamantes nao encontrada.');
    }
    return sale;
  }

  async createSale(dto: CreateDiamondSaleDto, actorId: string): Promise<SaleWithRecipients> {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.itemCatalog.findUnique({ where: { id: dto.itemCatalogId } });
      if (!item || !item.isActive) {
        throw new NotFoundException('Item ativo nao encontrado.');
      }
      if (!item.diamondSaleEnabled) {
        throw new BadRequestException('Este item nao esta habilitado para venda por diamantes.');
      }

      const activePlayers = await tx.player.findMany({
        where: { isActive: true },
        select: { id: true, nickname: true },
        orderBy: { nickname: 'asc' },
      });
      if (activePlayers.length === 0) {
        throw new BadRequestException('Nao ha jogadores ativos para abrir a partilha.');
      }

      const excludedIds = new Set(dto.excludedPlayerIds ?? []);
      if (dto.recipientMode === DiamondSaleRecipientMode.ALL_ACTIVE && excludedIds.size > 0) {
        throw new BadRequestException('O modo todos os ativos nao aceita exclusoes manuais.');
      }

      const activeIds = new Set(activePlayers.map((player) => player.id));
      const invalidExcluded = [...excludedIds].filter((id) => !activeIds.has(id));
      if (invalidExcluded.length > 0) {
        throw new BadRequestException('Toda exclusao deve pertencer ao snapshot atual de jogadores ativos.');
      }

      let buyerPlayerId: string | undefined;
      let buyerName: string;
      if (dto.buyerType === DiamondSaleBuyerType.GUILD_MEMBER) {
        if (!dto.buyerPlayerId) {
          throw new BadRequestException('Selecione o player comprador da guilda.');
        }
        const buyer = await tx.player.findUnique({ where: { id: dto.buyerPlayerId }, select: { id: true, nickname: true } });
        if (!buyer) {
          throw new BadRequestException('Player comprador da guilda nao encontrado.');
        }
        buyerPlayerId = buyer.id;
        buyerName = buyer.nickname;
        excludedIds.add(buyer.id);
      } else {
        if (dto.buyerPlayerId) {
          throw new BadRequestException('Comprador externo nao pode ser vinculado a um player da guilda.');
        }
        buyerName = dto.buyerName?.trim() ?? '';
        if (!buyerName) {
          throw new BadRequestException('Informe o nome do comprador externo.');
        }
      }

      const recipients = activePlayers.filter((player) => !excludedIds.has(player.id));
      if (recipients.length === 0) {
        throw new BadRequestException('A partilha precisa ter pelo menos um destinatario.');
      }

      const shareAmount = Math.floor(dto.diamondTotal / recipients.length);
      const remainderAmount = dto.diamondTotal - (shareAmount * recipients.length);
      const itemName = item.namePt.trim().toLowerCase() === item.nameEn.trim().toLowerCase()
        ? item.namePt
        : `${item.namePt} / ${item.nameEn}`;

      const sale = await tx.diamondSale.create({
        data: {
          itemCatalogId: item.id,
          itemName,
          buyerType: dto.buyerType,
          buyerPlayerId,
          buyerName,
          diamondCustodian: dto.diamondCustodian.trim(),
          diamondTotal: dto.diamondTotal,
          itemProofImageUrl: dto.itemProofImageUrl.trim(),
          saleProofImageUrl: dto.saleProofImageUrl.trim(),
          recipientMode: dto.recipientMode,
          shareAmount,
          remainderAmount,
          activePlayerCount: activePlayers.length,
          recipientCount: recipients.length,
          createdById: actorId,
          recipients: {
            create: recipients.map((player) => ({
              playerId: player.id,
              playerNickname: player.nickname,
              diamondAmount: shareAmount,
            })),
          },
        },
        include: saleInclude,
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'DIAMOND_SALE_OPENED',
          targetType: 'DiamondSale',
          targetId: sale.id,
          metadata: {
            itemCatalogId: item.id,
            buyerType: dto.buyerType,
            buyerPlayerId: buyerPlayerId ?? null,
            diamondTotal: dto.diamondTotal,
            activePlayerCount: activePlayers.length,
            recipientCount: recipients.length,
            shareAmount,
            remainderAmount,
            excludedPlayerIds: [...excludedIds],
          } satisfies Prisma.InputJsonObject,
        },
      });

      return sale;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async deliverShare(saleId: string, recipientId: string, proofImageUrl: string, actorId: string): Promise<SaleWithRecipients> {
    const result = await this.prisma.$transaction(async (tx) => {
      const recipient = await tx.diamondSaleRecipient.findFirst({
        where: { id: recipientId, saleId },
        include: { sale: true },
      });
      if (!recipient) {
        throw new NotFoundException('Destinatario desta partilha nao encontrado.');
      }
      if (recipient.sale.status !== DiamondSaleStatus.OPEN) {
        throw new BadRequestException('Esta partilha ja foi concluida.');
      }
      if (recipient.deliveredAt) {
        throw new BadRequestException('O envio para este jogador ja foi registrado.');
      }

      const deliveredAt = new Date();
      await tx.diamondSaleRecipient.update({
        where: { id: recipient.id },
        data: { proofImageUrl: proofImageUrl.trim(), deliveredAt, deliveredById: actorId },
      });

      const remaining = await tx.diamondSaleRecipient.count({ where: { saleId, deliveredAt: null } });
      const justCompleted = remaining === 0;
      if (justCompleted) {
        await tx.diamondSale.update({
          where: { id: saleId },
          data: { status: DiamondSaleStatus.COMPLETED, completedAt: deliveredAt, completedById: actorId },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'DIAMOND_SHARE_DELIVERED',
          targetType: 'DiamondSaleRecipient',
          targetId: recipient.id,
          metadata: {
            saleId,
            playerId: recipient.playerId,
            diamondAmount: recipient.diamondAmount,
            remaining,
            completed: justCompleted,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return {
        sale: await tx.diamondSale.findUniqueOrThrow({ where: { id: saleId }, include: saleInclude }),
        justCompleted,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.justCompleted) {
      return this.publishCompletedSale(result.sale, actorId);
    }
    return result.sale;
  }

  async republishSale(saleId: string, actorId: string): Promise<SaleWithRecipients> {
    const sale = await this.getSale(saleId);
    if (sale.status !== DiamondSaleStatus.COMPLETED) {
      throw new BadRequestException('A partilha precisa estar concluida antes da publicacao.');
    }
    if (sale.discordPublishedAt) {
      throw new BadRequestException('Esta partilha ja foi publicada no Discord.');
    }
    return this.publishCompletedSale(sale, actorId);
  }

  private async publishCompletedSale(sale: SaleWithRecipients, actorId: string): Promise<SaleWithRecipients> {
    try {
      await this.notificationService.notifyDiamondSaleCompleted({
        saleId: sale.id,
        itemName: sale.itemName,
        diamondTotal: sale.diamondTotal,
        shareAmount: sale.shareAmount,
        remainderAmount: sale.remainderAmount,
        recipients: sale.recipients.map((recipient) => ({
          playerName: recipient.playerNickname,
          diamondAmount: recipient.diamondAmount,
          proofImageUrl: recipient.proofImageUrl!,
        })),
      });

      await this.prisma.diamondSale.update({ where: { id: sale.id }, data: { discordPublishedAt: new Date() } });
      await this.auditService.log({
        actorId,
        action: 'DIAMOND_SALE_PUBLISHED',
        targetType: 'DiamondSale',
        targetId: sale.id,
        metadata: { recipientCount: sale.recipientCount, diamondTotal: sale.diamondTotal },
      });
    } catch (error) {
      await this.auditService.log({
        actorId,
        action: 'DIAMOND_SALE_PUBLICATION_FAILED',
        targetType: 'DiamondSale',
        targetId: sale.id,
        metadata: { message: error instanceof Error ? error.message : 'Unknown Discord publication error.' },
      });
    }

    return this.getSale(sale.id);
  }
}
