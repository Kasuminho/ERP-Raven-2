export type WishlistItemTier = 'T2' | 'T3' | 'T4' | 'LEGENDARY';

export type WishlistItemType = 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'CELESTIAL_STONE';

export type WishlistPlayerClass =
  | 'GUNSLINGER'
  | 'BERSERKER'
  | 'DESTROYER'
  | 'DEATHBRINGER'
  | 'ASSASSIN'
  | 'DIVINE_CASTER'
  | 'NIGHT_RANGER'
  | 'VANGUARD'
  | 'ELEMENTALIST'
  | 'WARLORD';

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type WishlistStatus = 'ACTIVE' | 'PAUSED' | 'FULFILLED' | 'REMOVED';

export type WishlistItemRecord<TDate = string | Date> = {
  id: string;
  playerId: string;
  itemCatalogId: string;
  priority: WishlistPriority;
  status: WishlistStatus;
  reason: string;
  build?: string | null;
  note?: string | null;
  proofImageUrl?: string | null;
  fulfilledById?: string | null;
  fulfilledAt?: TDate | null;
  fulfilledNote?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
  itemCatalog?: {
    id: string;
    namePt: string;
    nameEn: string;
    itemTier?: WishlistItemTier | null;
    itemType?: WishlistItemType | null;
    category: string;
  };
};

export type StaffWishlistDemand<TDate = string | Date> = {
  itemCatalogId: string;
  item: {
    id: string;
    namePt: string;
    nameEn: string;
    itemTier?: WishlistItemTier | null;
    itemType?: WishlistItemType | null;
    category: string;
  };
  total: number;
  active: number;
  paused: number;
  priorityCounts: Record<string, number>;
  classCounts: Record<string, number>;
  minLayer: number;
  maxLayer: number;
  latestUpdatedAt: TDate;
  players: Array<{
    id: string;
    playerId: string;
    status: WishlistStatus;
    priority: WishlistPriority;
    reason: string;
    build?: string | null;
    note?: string | null;
    proofImageUrl?: string | null;
    createdAt: TDate;
    updatedAt: TDate;
    player: {
      id: string;
      nickname: string;
      class: WishlistPlayerClass;
      dimensionalLayer: number;
      attendancePercentage: number;
      combatPower: number;
      combatProfile?: { declaredBuild?: string | null; preferredRole?: string | null } | null;
    };
    signals: {
      lowAttendance: boolean;
      highLayer: boolean;
      hasBuild: boolean;
    };
  }>;
};
