import { Injectable } from '@nestjs/common';
import { OperationsService } from '../operations.service';
import {
  AuctionDiagnosticOption,
  AuctionDiagnosticSummary,
  AuctionDossier,
  AuctionFinalizationPreview,
  AuctionTimelineEvent,
  UniversalDossier,
  UniversalDossierType,
} from '../operations.types';

@Injectable()
export class AuctionDiagnosticsService {
  constructor(private readonly operations: OperationsService) {}

  getAuctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    return this.operations.getAuctionDiagnosticOptions();
  }

  getAuctionDiagnostics(auctionId: string): Promise<AuctionDiagnosticSummary> {
    return this.operations.getAuctionDiagnostics(auctionId);
  }

  getAuctionFinalizationPreview(auctionId: string): Promise<AuctionFinalizationPreview> {
    return this.operations.getAuctionFinalizationPreview(auctionId);
  }

  getAuctionDossier(auctionId: string): Promise<AuctionDossier> {
    return this.operations.getAuctionDossier(auctionId);
  }

  getUniversalDossier(type: UniversalDossierType, id: string): Promise<UniversalDossier> {
    return this.operations.getUniversalDossier(type, id);
  }

  getAuctionTimeline(auctionId: string): Promise<AuctionTimelineEvent[]> {
    return this.operations.getAuctionTimeline(auctionId);
  }
}
