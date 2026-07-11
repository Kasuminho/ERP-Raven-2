export type WarRoomOperationType = 'CLASH' | 'ANCIENT_FORTRESS' | 'ABYSS' | 'GUILD_RAID' | 'CUSTOM';

export type WarRoomOperationStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';

export type WarRoomOperationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type WarRoomRosterSlotStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'PRESENT' | 'ABSENT' | 'JUSTIFIED_ABSENCE';

export type WarRoomTimelineEventType =
  | 'NOTE'
  | 'CALL'
  | 'ENGAGE'
  | 'WIPE'
  | 'OBJECTIVE_CAPTURED'
  | 'BOSS'
  | 'TARGET_SWAP'
  | 'SUBSTITUTION'
  | 'CONTRIBUTION'
  | 'RISK'
  | 'CLOSED';

export type WarRoomRosterConflictKey =
  | 'OVERLAPPING_OPERATION'
  | 'STALE_STATUS'
  | 'LOW_LAYER'
  | 'MISSING_CLASS'
  | 'LOW_ATTENDANCE';

export type WarRoomInternalLink = {
  label: string;
  href: string;
};

export type WarRoomOperationRecord<TDate = string | Date> = {
  id: string;
  name: string;
  type: WarRoomOperationType;
  status: WarRoomOperationStatus;
  priority: WarRoomOperationPriority;
  startsAt: TDate;
  endsAt: TDate;
  mapRegion?: string | null;
  objective?: string | null;
  staffNotes?: string | null;
  result?: string | null;
  score?: string | null;
  improvementNotes?: string | null;
  internalLinks: WarRoomInternalLink[];
  eventId?: string | null;
  createdById: string;
  createdAt: TDate;
  updatedAt: TDate;
  event?: {
    id: string;
    name: string;
    type: string;
    status: string;
    startsAt: TDate;
    checklist?: Array<{
      key: string;
      label: string;
      detail?: string | null;
      checked: boolean;
    }>;
  } | null;
};

export type WarRoomRosterPlayer<TClass extends string = string> = {
  id: string;
  nickname: string;
  class: TClass;
  dimensionalLayer: number;
  attendancePercentage: number;
  combatProfile?: {
    primaryClass: TClass;
    secondaryClass?: TClass | null;
    declaredBuild?: string | null;
    preferredRole?: string | null;
    acceptedRoles: string[];
    availability: string;
  } | null;
};

export type WarRoomRosterConflict<TDate = string | Date> = {
  key: WarRoomRosterConflictKey;
  label: string;
  detail: string;
  severity: 'warning' | 'danger';
  relatedOperationId?: string;
  relatedOperationName?: string;
  relatedStartsAt?: TDate;
  relatedEndsAt?: TDate;
};

export type WarRoomRosterSlotRecord<TDate = string | Date, TClass extends string = string> = {
  id: string;
  operationId: string;
  playerId: string;
  role: string;
  status: WarRoomRosterSlotStatus;
  requiredClass?: TClass | null;
  requiredLayer?: number | null;
  publicInstructionsPt?: string | null;
  publicInstructionsEn?: string | null;
  staffNote?: string | null;
  playerNote?: string | null;
  confirmedAt?: TDate | null;
  attendanceMarkedAt?: TDate | null;
  attendanceMarkedById?: string | null;
  createdById: string;
  createdAt: TDate;
  updatedAt: TDate;
  player?: WarRoomRosterPlayer<TClass>;
  conflicts?: WarRoomRosterConflict<TDate>[];
};

export type WarRoomRosterSummary = {
  total: number;
  pending: number;
  confirmed: number;
  declined: number;
  present: number;
  absent: number;
  justifiedAbsence: number;
  reserves: number;
};

export type WarRoomRosterCompositionImpact<TClass extends string = string> = {
  roles: Array<{ role: string; count: number; target: number; missing: number }>;
  classes: Array<{ class: TClass; count: number }>;
  shortages: Array<{ key: string; label: string; detail: string; severity: 'info' | 'warning' | 'danger' }>;
};

export type WarRoomRosterSuggestion<TClass extends string = string> = {
  playerId: string;
  nickname: string;
  class: TClass;
  dimensionalLayer: number;
  attendancePercentage: number;
  recommendedRole: string;
  score: number;
  reasons: string[];
  warnings: string[];
  availability?: string | null;
};

export type WarRoomRosterDossier<TDate = string | Date, TClass extends string = string> = {
  operation: WarRoomOperationRecord<TDate>;
  slots: WarRoomRosterSlotRecord<TDate, TClass>[];
  summary: WarRoomRosterSummary;
  compositionImpact: WarRoomRosterCompositionImpact<TClass>;
  suggestions: WarRoomRosterSuggestion<TClass>[];
};

export type PlayerWarRoomAssignment<TDate = string | Date, TClass extends string = string> = {
  operation: Pick<WarRoomOperationRecord<TDate>, 'id' | 'name' | 'type' | 'status' | 'startsAt' | 'endsAt' | 'mapRegion' | 'objective'>;
  slot: Pick<
    WarRoomRosterSlotRecord<TDate, TClass>,
    'id' | 'operationId' | 'playerId' | 'role' | 'status' | 'publicInstructionsPt' | 'publicInstructionsEn' | 'playerNote' | 'confirmedAt'
  >;
};

export type WarRoomTimelineEventRecord<TDate = string | Date> = {
  id: string;
  operationId: string;
  type: WarRoomTimelineEventType;
  occurredAt: TDate;
  title: string;
  note?: string | null;
  metadata: Record<string, unknown>;
  createdById: string;
  createdAt: TDate;
  updatedAt: TDate;
  createdBy?: {
    id: string;
    discordUsername: string;
    discordNickname?: string | null;
  };
};

export type WarRoomLiveChecklistItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

export type WarRoomLiveDossier<TDate = string | Date, TClass extends string = string> = {
  operation: WarRoomOperationRecord<TDate>;
  roster: WarRoomRosterDossier<TDate, TClass>;
  checklist: WarRoomLiveChecklistItem[];
  timeline: WarRoomTimelineEventRecord<TDate>[];
  generatedAt: TDate;
};

export type WarRoomAfterActionReport<TDate = string | Date, TClass extends string = string> = {
  operation: WarRoomOperationRecord<TDate>;
  roster: WarRoomRosterDossier<TDate, TClass>;
  timeline: WarRoomTimelineEventRecord<TDate>[];
  planned: {
    totalSlots: number;
    frontline: number;
    support: number;
    callers: number;
    reserves: number;
  };
  actual: {
    present: number;
    absent: number;
    justifiedAbsence: number;
    substitutions: number;
    contributions: number;
    risks: number;
    wipes: number;
    objectives: number;
  };
  signals: Array<{
    key: string;
    label: string;
    value: string;
    severity: 'info' | 'warning' | 'danger';
  }>;
  markdown: string;
  generatedAt: TDate;
};
