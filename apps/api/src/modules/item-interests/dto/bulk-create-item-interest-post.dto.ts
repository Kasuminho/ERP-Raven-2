export class BulkCreateItemInterestPostDto {
  itemCatalogIds!: string[];
  mode?: 'PvE' | 'PvP';
  closesAt!: string;
}
