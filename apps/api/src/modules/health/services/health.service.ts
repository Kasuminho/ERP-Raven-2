import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { PrismaService } from '@database/prisma.service';
import { HealthCheckResult, HealthReport, HealthState } from '../health.types';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getReport(): Promise<HealthReport> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkDiscordConfig(),
      this.checkGoogleDriveConfig(),
      this.checkWebhookConfig(),
      this.checkVerifiedBackup(),
      this.checkPublicWeb(),
    ]);

    return {
      status: this.getWorstStatus(checks),
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const [players, users, auditLogs] = await Promise.all([
        this.prisma.player.count(),
        this.prisma.user.count(),
        this.prisma.auditLog.count(),
      ]);

      return {
        name: 'database',
        status: 'ok',
        metadata: {
          latencyMs: Date.now() - startedAt,
          players,
          users,
          auditLogs,
        },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        message: this.errorMessage(error),
        metadata: { latencyMs: Date.now() - startedAt },
      };
    }
  }

  private checkDiscordConfig(): HealthCheckResult {
    const missing = this.missingEnv([
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
      'DISCORD_CALLBACK_URL',
      'DISCORD_GUILD_ID',
    ]);

    return {
      name: 'discord',
      status: missing.length > 0 ? 'degraded' : 'ok',
      message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
      metadata: {
        botTokenConfigured: Boolean(this.config.get<string>('discord.botToken')),
        staffRoleConfigured: Boolean(this.config.get<string>('discord.staffRoleId')),
      },
    };
  }

  private checkGoogleDriveConfig(): HealthCheckResult {
    if (process.env.IMAGE_STORAGE_PROVIDER !== 'google_drive') {
      return {
        name: 'googleDrive',
        status: 'ok',
        metadata: { provider: process.env.IMAGE_STORAGE_PROVIDER || 'local' },
      };
    }

    const missing = this.missingEnv(['GOOGLE_DRIVE_FOLDER_ID', 'GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON']);
    let serviceAccountJsonValid = false;

    if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) {
      try {
        JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON);
        serviceAccountJsonValid = true;
      } catch {
        serviceAccountJsonValid = false;
      }
    }

    return {
      name: 'googleDrive',
      status: missing.length > 0 || !serviceAccountJsonValid ? 'degraded' : 'ok',
      message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : (!serviceAccountJsonValid ? 'Invalid service account JSON.' : undefined),
      metadata: {
        provider: 'google_drive',
        folderConfigured: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
        serviceAccountJsonValid,
        publicPermission: process.env.GOOGLE_DRIVE_PUBLIC_PERMISSION === 'true',
      },
    };
  }

  private checkWebhookConfig(): HealthCheckResult {
    const required = [
      'DISCORD_ANNOUNCEMENTS_WEBHOOK_URL',
      'DISCORD_AUCTIONS_WEBHOOK_URL',
      'DISCORD_DROPS_WEBHOOK_URL',
      'DISCORD_ATTENDANCE_WEBHOOK_URL',
      'DISCORD_STAFF_REVIEW_WEBHOOK_URL',
      'DISCORD_STAFF_UPDATES_WEBHOOK_URL',
    ];
    const missing = this.missingEnv(required);

    return {
      name: 'webhooks',
      status: missing.length > 0 ? 'degraded' : 'ok',
      message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
      metadata: {
        required: required.length,
        configured: required.length - missing.length,
      },
    };
  }

  private async checkVerifiedBackup(): Promise<HealthCheckResult> {
    const statusFile = process.env.BACKUP_STATUS_FILE || '/app/backups/last-verified-backup.json';
    const maxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS ?? 26);

    try {
      const raw = await readFile(statusFile, 'utf8');
      const parsed = JSON.parse(raw) as {
        verifiedAt?: string;
        backupFile?: string;
        tableCount?: number;
        status?: string;
      };
      const verifiedAt = parsed.verifiedAt ? new Date(parsed.verifiedAt) : null;

      if (!verifiedAt || Number.isNaN(verifiedAt.getTime())) {
        return {
          name: 'verifiedBackup',
          status: 'degraded',
          message: 'Backup status file does not contain a valid verifiedAt.',
          metadata: { statusFile, maxAgeHours },
        };
      }

      const ageHours = (Date.now() - verifiedAt.getTime()) / (60 * 60 * 1000);
      const fresh = ageHours <= maxAgeHours && parsed.status === 'verified';

      return {
        name: 'verifiedBackup',
        status: fresh ? 'ok' : 'degraded',
        message: fresh ? undefined : `Last verified backup is ${Math.round(ageHours)}h old.`,
        metadata: {
          statusFile,
          verifiedAt: verifiedAt.toISOString(),
          ageHours: Math.round(ageHours * 10) / 10,
          maxAgeHours,
          backupFile: parsed.backupFile ?? null,
          tableCount: typeof parsed.tableCount === 'number' ? parsed.tableCount : null,
        },
      };
    } catch (error) {
      return {
        name: 'verifiedBackup',
        status: 'degraded',
        message: `No verified backup status was found: ${this.errorMessage(error)}`,
        metadata: { statusFile, maxAgeHours },
      };
    }
  }

  private async checkPublicWeb(): Promise<HealthCheckResult> {
    const publicUrl = this.config.get<string>('discord.publicUrl') || process.env.PUBLIC_APP_URL || '';

    if (!publicUrl) {
      return { name: 'publicWeb', status: 'degraded', message: 'PUBLIC_APP_URL is not configured.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const startedAt = Date.now();

    try {
      const response = await fetch(publicUrl, { method: 'GET', signal: controller.signal });

      return {
        name: 'publicWeb',
        status: response.ok ? 'ok' : 'degraded',
        message: response.ok ? undefined : `HTTP ${response.status}`,
        metadata: {
          latencyMs: Date.now() - startedAt,
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        name: 'publicWeb',
        status: 'degraded',
        message: this.errorMessage(error),
        metadata: { latencyMs: Date.now() - startedAt },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private getWorstStatus(checks: HealthCheckResult[]): HealthState {
    if (checks.some((check) => check.status === 'down')) return 'down';
    if (checks.some((check) => check.status === 'degraded')) return 'degraded';
    return 'ok';
  }

  private missingEnv(names: string[]): string[] {
    return names.filter((name) => !process.env[name]);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error.';
  }
}
