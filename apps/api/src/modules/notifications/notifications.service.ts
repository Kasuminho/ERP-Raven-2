import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationAudience, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Notification[]> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    return this.prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          player ? { playerId: player.id } : undefined,
        ].filter(Boolean) as Prisma.NotificationWhereInput[],
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const notifications = await this.listForUser(userId);

    return { count: notifications.filter((notification) => !notification.readAt).length };
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const notifications = await this.listForUser(userId);
    const allowed = notifications.some((notification) => notification.id === notificationId);

    if (!allowed) {
      throw new NotFoundException('Notification not found.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const notifications = await this.listForUser(userId);
    const unreadIds = notifications.filter((notification) => !notification.readAt).map((notification) => notification.id);

    if (unreadIds.length === 0) {
      return { updated: 0 };
    }

    const result = await this.prisma.notification.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  async createForPlayer(data: {
    playerId: string;
    type: string;
    title: string;
    body: string;
    href?: string;
    metadata?: Prisma.InputJsonObject;
    deduplicationKey?: string;
  }): Promise<Notification> {
    try {
      return await this.prisma.notification.create({
        data: {
          playerId: data.playerId,
          audience: NotificationAudience.PLAYER,
          type: data.type,
          title: data.title,
          body: data.body,
          href: data.href,
          metadata: data.metadata,
          deduplicationKey: data.deduplicationKey,
        },
      });
    } catch (error) {
      if (data.deduplicationKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.notification.findUnique({ where: { deduplicationKey: data.deduplicationKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
