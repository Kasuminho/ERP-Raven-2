import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ImageStorageService } from './image-storage.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly storage: ImageStorageService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file?: { buffer: Buffer; size: number }): Promise<{ url: string; fileId?: string; mimetype: string; size: number }> {
    if (!file?.buffer?.length) throw new BadRequestException('A PNG, JPEG or WebP image is required.');
    return this.storage.storeValidated(file);
  }
}
