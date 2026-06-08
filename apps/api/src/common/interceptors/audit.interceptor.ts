import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/services/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string; user?: { userId?: string } }>();

    return next.handle().pipe(
      tap(() => {
        void this.auditService.log({
          action: `${request.method} ${request.url}`,
          actorId: request.user?.userId,
          targetType: 'HTTP_REQUEST',
        });
      }),
    );
  }
}
