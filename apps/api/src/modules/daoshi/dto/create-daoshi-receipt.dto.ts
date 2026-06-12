export class CreateDaoshiReceiptDto {
  proofImageUrl!: string;
  purchaseAmount!: number;
  purchaseDate!: string;
  playerNote?: string;
}

export class CreateManualDaoshiReceiptDto {
  playerId!: string;
  purchaseAmount!: number;
  purchaseDate!: string;
  reviewNote?: string;
}
