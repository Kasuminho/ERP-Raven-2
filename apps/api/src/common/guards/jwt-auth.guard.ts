import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest<{ user?: { userId?: string }; path?: string }>();
    if (request.path === '/auth/me') return true;
    const player = request.user?.userId
      ? await this.prisma.player.findFirst({ where: { userId: request.user.userId }, orderBy: { createdAt: 'asc' }, select: { isActive: true } })
      : null;
    if (player && !player.isActive) {
      throw new ForbiddenException({ code: 'PLAYER_INACTIVE', message: 'Aguardando liberacao da Staff.' });
    }
    return true;
  }
}
