export type PlayerCombatRole =
  | 'FRONTLINE'
  | 'BACKLINE'
  | 'SUPPORT'
  | 'CALLER'
  | 'SCOUT'
  | 'FLEX'
  | 'RESERVE';

export type PlayerCombatAvailability =
  | 'UNSET'
  | 'WEEKDAYS'
  | 'WEEKENDS'
  | 'DAILY'
  | 'FLEX'
  | 'LOW';

export type PlayerCombatProfileChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PlayerCombatProfileRecord<TDate = string | Date, TPlayerClass = string> = {
  playerId: string;
  primaryClass: TPlayerClass;
  secondaryClass?: TPlayerClass | null;
  declaredBuild?: string | null;
  preferredRole?: PlayerCombatRole | null;
  acceptedRoles: PlayerCombatRole[];
  availability: PlayerCombatAvailability;
  publicNote?: string | null;
  staffNote?: string | null;
  updatedById?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
};

export type PlayerCombatProfileChangeRequestRecord<TDate = string | Date, TPlayerClass = string> = {
  id: string;
  playerId: string;
  primaryClass?: TPlayerClass | null;
  secondaryClass?: TPlayerClass | null;
  declaredBuild?: string | null;
  preferredRole?: PlayerCombatRole | null;
  acceptedRoles: PlayerCombatRole[];
  availability?: PlayerCombatAvailability | null;
  proofImageUrl?: string | null;
  note?: string | null;
  status: PlayerCombatProfileChangeStatus;
  reviewedById?: string | null;
  reviewedAt?: TDate | null;
  reviewNote?: string | null;
  createdAt: TDate;
  updatedAt: TDate;
};

export type RosterCompositionCount<TKey extends string = string> = {
  key: TKey;
  label: string;
  count: number;
};

export type RosterCompositionAlert = {
  key: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  playerIds?: string[];
};

export type RosterCompositionRow<TDate = string | Date, TPlayerClass = string> = {
  playerId: string;
  nickname: string;
  playerClass: TPlayerClass;
  dimensionalLayer: number;
  combatPower: number;
  attendancePercentage: number;
  isActive: boolean;
  primaryClass: TPlayerClass;
  secondaryClass?: TPlayerClass | null;
  declaredBuild?: string | null;
  preferredRole?: PlayerCombatRole | null;
  acceptedRoles: PlayerCombatRole[];
  availability: PlayerCombatAvailability;
  lastProgressAt?: TDate | null;
  lastStatusAt?: TDate | null;
  lastAttendanceAt?: TDate | null;
  signals: string[];
};

export type RosterCompositionMatrix<TDate = string | Date, TPlayerClass = string> = {
  generatedAt: TDate;
  totals: {
    activePlayers: number;
    mappedProfiles: number;
    missingBuild: number;
    staleStatus: number;
    lowAttendance: number;
    frontline: number;
    support: number;
    reserve: number;
  };
  counts: {
    byClass: Array<RosterCompositionCount<TPlayerClass & string>>;
    byRole: Array<RosterCompositionCount<PlayerCombatRole | 'UNSET'>>;
    byLayer: Array<RosterCompositionCount<string>>;
    byAvailability: Array<RosterCompositionCount<PlayerCombatAvailability>>;
  };
  alerts: RosterCompositionAlert[];
  rows: Array<RosterCompositionRow<TDate, TPlayerClass>>;
  markdown: string;
};
