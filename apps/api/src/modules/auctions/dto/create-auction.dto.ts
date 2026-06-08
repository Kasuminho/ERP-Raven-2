import { ItemTier, ItemType } from '@prisma/client';

export class CreateAuctionDto {
  itemCatalogId?: string;
  itemName!: string;
  itemType!: ItemType;
  itemTier!: ItemTier;
  createdById!: string;
}
