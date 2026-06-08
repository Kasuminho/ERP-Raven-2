import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@database/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

type AuthenticatedRequest = {
  user?: {
    userId?: string;
    username?: string;
    roles?: string[];
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Authenticated user is required for this action.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { discordId: userId },
        ],
      },
      select: {
        id: true,
        players: {
          select: {
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const roles = user?.players.flatMap((player) => player.roles.map((role) => role.role.name)) ?? [];
    const hasRole = requiredRoles.some((role) => roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('STAFF or ADMIN role is required for this action.');
    }

    request.user = {
      ...request.user,
      userId: user?.id ?? userId,
      roles,
    };

    return true;
  }
}
