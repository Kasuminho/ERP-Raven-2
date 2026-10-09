import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { GeminiOcrService } from '../storage/services/gemini-ocr.service';
import { RavenStatusOcrService } from '../players/services/raven-status-ocr.service';

@Module({
  imports: [DatabaseModule],
  providers: [GeminiOcrService, RavenStatusOcrService],
  exports: [GeminiOcrService, RavenStatusOcrService],
})
export class OcrModule {}
