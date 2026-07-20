import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Request } from 'express';
import { BusinessRulesService } from '../../modules/business-rules/business-rules.service';

@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  private readonly writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  private readonly sensitivePrefixes = [
    '/announcements',
    '/auctions',
    '/automation/finalize',
    '/automation/relist',
    '/business-rules',
    '/codex',
    '/daoshi',
    '/dkp',
    '/drops',
    '/diamond-sales',
    '/events',
    '/item-interests',
    '/item-requests',
    '/operations/staff/discord-webhooks',
    '/operations/staff/weekly/post',
    '/players/me/progress',
    '/players/progress',
    '/staff-review',
    '/uploads',
  ];

  constructor(private readonly businessRules: BusinessRulesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!this.writeMethods.has(request.method.toUpperCase())) {
      return true;
    }

    const path = this.normalizedPath(request);
    if (this.isMaintenanceToggle(path, request.method)) {
      return true;
    }

    if (!this.isSensitiveWrite(path)) {
      return true;
    }

    const maintenance = await this.businessRules.getMaintenanceMode();
    if (!maintenance.enabled) {
      return true;
    }

    throw new ServiceUnavailableException({
      code: 'MAINTENANCE_MODE',
      message: maintenance.message,
    });
  }

  private normalizedPath(request: Request): string {
    return request.path.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  }

  private isMaintenanceToggle(path: string, method: string): boolean {
    return method.toUpperCase() === 'PATCH' && path === '/business-rules/maintenanceMode';
  }

  private isSensitiveWrite(path: string): boolean {
    return this.sensitivePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }
}
