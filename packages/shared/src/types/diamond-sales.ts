export type DiamondSaleBuyerType = 'GUILD_MEMBER' | 'EXTERNAL';
export type DiamondSaleRecipientMode = 'ALL_ACTIVE' | 'EXCLUDE_SELECTED';
export type DiamondSaleStatus = 'OPEN' | 'COMPLETED';

export type DiamondSaleRecipientRecord<TDate = string> = {
  id: string;
  saleId: string;
  playerId: string;
  playerNickname: string;
  diamondAmount: number;
  proofImageUrl?: string | null;
  deliveredAt?: TDate | null;
  deliveredById?: string | null;
};
export type DiamondSaleRecord<TDate = string> = {
  id: string;
  itemCatalogId: string;
  itemName: string;
  buyerType: DiamondSaleBuyerType;
  buyerPlayerId?: string | null;
  buyerName: string;
  diamondCustodian: string;
  diamondTotal: number;
  itemProofImageUrl: string;
  saleProofImageUrl: string;
  recipientMode: DiamondSaleRecipientMode;
  shareAmount: number;
  remainderAmount: number;
  activePlayerCount: number;
  recipientCount: number;
  status: DiamondSaleStatus;
  openedAt: TDate;
  completedAt?: TDate | null;
  discordPublishedAt?: TDate | null;
  recipients: DiamondSaleRecipientRecord<TDate>[];
};
