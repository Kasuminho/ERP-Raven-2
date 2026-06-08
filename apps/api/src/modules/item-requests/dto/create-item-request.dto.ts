export class CreateItemRequestDto {
  itemCatalogId!: string;
  playerId!: string;
  quantity!: number;
  imageUrl?: string;
  threadId?: string;
  threadChannelId?: string;
}
