import type { ItemTier, ItemType, PlayerClass } from '@/types/api';

export const tiers: ItemTier[] = ['T2', 'T3', 'T4', 'LEGENDARY'];
export const itemTypes: ItemType[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'CELESTIAL_STONE'];
export const playerClasses: PlayerClass[] = [
  'ASSASSIN',
  'NIGHT_RANGER',
  'DESTROYER',
  'GUNSLINGER',
  'BERSERKER',
  'VANGUARD',
  'ELEMENTALIST',
  'DEATHBRINGER',
  'DIVINE_CASTER',
  'WARLORD',
];
export const kinds = ['equipment', 'skill', 'material', 'request'];
export const categories = ['rare', 'heroic', 'legendary', 'relic', 'blueprint', 'creature'];

export const tierCategory: Record<ItemTier, string> = {
  T2: 'rare',
  T3: 'rare',
  T4: 'heroic',
  LEGENDARY: 'legendary',
};

export type ItemForm = {
  kind: string;
  category?: string;
  itemTier: ItemTier;
  itemType: ItemType;
  namePt: string;
  nameEn: string;
  nameEs: string;
  typePt: string;
  typeEn: string;
  typeEs: string;
  preferredClasses: PlayerClass[];
  image1Url: string;
  image2Url: string;
  isActive?: boolean;
  diamondSaleEnabled?: boolean;
};

export type ItemFilters = {
  search: string;
  tier: string;
  type: string;
  kind: string;
  category: string;
  active: string;
};

export type BulkEditForm = {
  itemTier: string;
  itemType: string;
  category: string;
  isActive: string;
};

export type InterestOperationForm = {
  mode: 'PvE' | 'PvP';
  closesAt: string;
};
