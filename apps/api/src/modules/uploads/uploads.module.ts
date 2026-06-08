import { Module } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [ImageStorageService],
  exports: [ImageStorageService],
})
export class UploadsModule {}
