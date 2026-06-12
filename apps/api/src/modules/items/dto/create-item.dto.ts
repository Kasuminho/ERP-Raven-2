import { ItemTier, ItemType, PlayerClass } from '@prisma/client';

export class CreateItemDto {
  kind!: string;
  category!: string;
  itemTier!: ItemTier;
  itemType!: ItemType;
  namePt!: string;
  nameEn!: string;
  nameEs?: string;
  typePt!: string;
  typeEn!: string;
  typeEs?: string;
  preferredClasses?: PlayerClass[];
  image1Url?: string;
  image2Url?: string;
  createdById?: string;
}
