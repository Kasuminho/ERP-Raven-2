import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drive_v3, google } from 'googleapis';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private driveClient?: drive_v3.Drive;

  constructor(private readonly config: ConfigService) {}

  async store(file: { path: string; filename: string; mimetype: string; size: number }): Promise<{ url: string; fileId?: string; mimetype: string; size: number }> {
    const provider = this.getProvider();

    if (provider !== 'google_drive') {
      return { url: `/uploads/${file.filename}`, mimetype: file.mimetype, size: file.size };
    }

    const folderId = this.getRequiredEnv('GOOGLE_DRIVE_FOLDER_ID');

    try {
      const drive = this.getDriveClient();
      const created = await drive.files.create({
        requestBody: {
          name: file.filename,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: createReadStream(file.path),
        },
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const fileId = created.data.id;

      if (!fileId) {
        throw new InternalServerErrorException('Google Drive did not return an uploaded file id.');
      }

      if ((this.config.get<string>('GOOGLE_DRIVE_PUBLIC_PERMISSION') ?? 'true').toLowerCase() === 'true') {
        await drive.permissions.create({
          fileId,
          requestBody: { type: 'anyone', role: 'reader' },
          supportsAllDrives: true,
        });
      }

      return {
        url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        fileId,
        mimetype: file.mimetype,
        size: file.size,
      };
    } finally {
      await this.removeLocalTempFile(file.path);
    }
  }

  async deleteByUrl(url?: string | null): Promise<boolean> {
    if (!url) {
      return false;
    }

    const fileId = this.extractGoogleDriveFileId(url);

    if (fileId) {
      const drive = this.getDriveClient();
      try {
        await drive.files.delete({ fileId, supportsAllDrives: true });
      } catch (error) {
        if (this.isGoogleDriveNotFound(error)) {
          this.logger.debug(`google_drive_file_already_deleted fileId=${fileId}`);
          return true;
        }

        throw error;
      }
      return true;
    }

    if (url.startsWith('/uploads/')) {
      await this.removeLocalTempFile(join(process.cwd(), url.replace(/^\//, '')));
      return true;
    }

    return false;
  }

  ensureLocalUploadDir(): string {
    const uploadDir = join(process.cwd(), 'uploads');

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    return uploadDir;
  }

  private getProvider(): string {
    return (this.config.get<string>('IMAGE_STORAGE_PROVIDER') ?? 'local').trim().toLowerCase();
  }

  private getDriveClient(): drive_v3.Drive {
    if (this.driveClient) {
      return this.driveClient;
    }

    const serviceAccountJson = this.getRequiredEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON');
    const credentials = this.parseServiceAccountJson(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.driveClient = google.drive({ version: 'v3', auth });
    return this.driveClient;
  }

  private getRequiredEnv(name: string): string {
    const value = this.config.get<string>(name)?.trim();

    if (!value) {
      throw new BadRequestException(`${name} is required when IMAGE_STORAGE_PROVIDER=google_drive.`);
    }

    return value;
  }

  private parseServiceAccountJson(value: string): Record<string, unknown> {
    try {
      const credentials = JSON.parse(value) as Record<string, unknown>;

      if (typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }

      return credentials;
    } catch {
      throw new BadRequestException('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON must be a valid service account JSON string.');
    }
  }

  private extractGoogleDriveFileId(url: string): string | undefined {
    const patterns = [
      /drive\.google\.com\/thumbnail\?id=([^&]+)/i,
      /drive\.google\.com\/file\/d\/([^/]+)/i,
      /drive\.google\.com\/open\?id=([^&]+)/i,
      /drive\.google\.com\/uc\?id=([^&]+)/i,
      /[?&]id=([^&]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    return undefined;
  }

  private isGoogleDriveNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const maybeError = error as { code?: number; status?: number; errors?: Array<{ reason?: string }> };
    return maybeError.code === 404
      || maybeError.status === 404
      || maybeError.errors?.some((entry) => entry.reason === 'notFound') === true;
  }

  private async removeLocalTempFile(path: string): Promise<void> {
    try {
      if (existsSync(path)) {
        await rm(path, { force: true });
      }
    } catch {
      this.logger.warn(`local_upload_cleanup_failed path=${path}`);
    }
  }
}
