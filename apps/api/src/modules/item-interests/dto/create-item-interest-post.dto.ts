export class CreateItemInterestPostDto {
  itemCatalogId!: string;
  mode?: 'PvE' | 'PvP';
  title?: string;
  closesAt!: string;
}
