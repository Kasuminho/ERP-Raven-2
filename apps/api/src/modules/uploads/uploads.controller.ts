import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ImageStorageService } from './image-storage.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly storage: ImageStorageService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const uploadDir = join(process.cwd(), 'uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          callback(null, uploadDir);
        },
        filename: (_req, file, callback) => {
          const safeExt = extname(file.originalname || '').toLowerCase() || '.png';
          callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  async uploadImage(@UploadedFile() file: { path: string; filename: string; mimetype: string; size: number }): Promise<{ url: string; fileId?: string; mimetype: string; size: number }> {
    this.storage.ensureLocalUploadDir();
    return this.storage.store(file);
  }
}
