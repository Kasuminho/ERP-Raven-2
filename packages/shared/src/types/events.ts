export type EventType =
  | 'LUNOS'
  | 'RIGRETO'
  | 'GARDRON'
  | 'MELKAR'
  | 'VARGAS'
  | 'BELLAMONICA'
  | 'SION'
  | 'ISTERIA'
  | 'NIDROK'
  | 'MORGON'
  | 'GUILD_DUNGEON'
  | 'SATURDAY_EVENT'
  | 'ABYSS_1'
  | 'ABYSS_1_2'
  | 'FLOUD'
  | 'KRATERIUS'
  | 'T3_ROTATION';

export type EventStatus = 'OPEN' | 'ATTENDANCE_REGISTRATION' | 'FINALIZED' | 'CANCELLED';

export type EventOperationalCategory = 'BOSS' | 'ABYSS' | 'GUILD_RAID' | 'FARM' | 'TRAINING' | 'CLASH' | 'CUSTOM';

export type EventOperationalPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type EventChecklistItem<TDate = string | Date> = {
  key: string;
  label: string;
  detail?: string | null;
  checked: boolean;
  checkedAt?: TDate | null;
  checkedById?: string | null;
  note?: string | null;
};

export type EventRecord<TDate = string | Date> = {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  operationalCategory: EventOperationalCategory;
  priority: EventOperationalPriority;
  dkpReward: number;
  startsAt: TDate;
  endsAt?: TDate | null;
  finalizedAt?: TDate | null;
  attendanceBatchId?: string | null;
  batchOrder?: number | null;
  responsibleUserId?: string | null;
  checklist: EventChecklistItem<TDate>[];
  operationalNotes?: string | null;
};

export type FinalizeEventResult<TEvent = EventRecord, TDate = string | Date> = {
  event: TEvent;
  nextEvent: TEvent | null;
  copiedAttendanceCount: number;
  attendanceCopyStatus: 'COPIED' | 'NEXT_EVENT_NOT_EMPTY' | 'NO_NEXT_EVENT';
};

export type EventPlayerSummary<TPlayerClass = string> = {
  id: string;
  nickname: string;
  class: TPlayerClass;
  dimensionalLayer: number;
};

export type EventFinalizationChecklist<TDate = string | Date, TPlayerClass = string> = {
  eventId: string;
  eventName: string;
  eventType: EventType;
  status: EventStatus;
  dkpPerPlayer: number;
  totalDkp: number;
  presentCount: number;
  absentCount: number;
  activePlayerCount: number;
  presentPlayers: Array<EventPlayerSummary<TPlayerClass>>;
  absentPlayers: Array<EventPlayerSummary<TPlayerClass>>;
  currentBoss: {
    id: string;
    name: string;
    type: EventType;
    startsAt: TDate;
    attendanceBatchId: string | null;
    batchOrder: number | null;
  };
  nextBatchEvent: {
    id: string;
    name: string;
    type: EventType;
    startsAt: TDate;
    status: EventStatus;
    attendanceBatchId: string | null;
    batchOrder: number | null;
    existingAttendanceCount: number;
  } | null;
  attendanceCopy: {
    willCopy: boolean;
    status: 'WILL_COPY' | 'NEXT_EVENT_NOT_EMPTY' | 'NO_NEXT_EVENT';
    targetEventId?: string;
    targetEventName?: string;
    copiedCountEstimate: number;
    messagePt: string;
  };
  warnings: Array<{
    tone: 'info' | 'warning' | 'danger';
    messagePt: string;
  }>;
};

export type EventBatchPanel<TDate = string | Date> = {
  batchId: string;
  title: string;
  startsAt: TDate | null;
  totalEvents: number;
  finalizedEvents: number;
  cancelledEvents: number;
  pendingEvents: number;
  activePlayerCount: number;
  totalDkpDistributed: number;
  nextActionEvent: {
    id: string;
    name: string;
    type: EventType;
    status: EventStatus;
    batchOrder: number | null;
    presentCount: number;
    actionPt: string;
  } | null;
  events: Array<{
    id: string;
    name: string;
    type: EventType;
    status: EventStatus;
    startsAt: TDate;
    finalizedAt: TDate | null;
    dkpReward: number;
    dkpDistributedAt: TDate | null;
    batchOrder: number | null;
    presentCount: number;
    absentCount: number;
    totalDkp: number;
    dkpDistributed: boolean;
    skipped: boolean;
    isNextAction: boolean;
  }>;
};

export type EventTacticalRole = 'TANK' | 'HEALER' | 'DPS' | 'SUPPORT';

export type EventReadinessReport<
  TDate = string | Date,
  TPlayerClass = string,
  TProgressReviewStatus = string,
> = {
  event: Pick<EventRecord<TDate>, 'id' | 'name' | 'type' | 'status' | 'startsAt'>;
  generatedAt: TDate;
  activePlayerCount: number;
  presentCount: number;
  activeByLayer: Array<{
    layer: number;
    activeCount: number;
    presentCount: number;
    approvedCpAverage: number;
  }>;
  classPresence: Array<{
    class: TPlayerClass;
    role: EventTacticalRole;
    activeCount: number;
    presentCount: number;
    averageCombatPower: number;
    maxLayer: number;
  }>;
  roleGaps: Array<{
    role: 'TANK' | 'HEALER' | 'DPS';
    labelPt: string;
    required: number;
    present: number;
    backup: number;
    missing: boolean;
    classHints: TPlayerClass[];
    notePt: string;
  }>;
  cpSummary: {
    withCombatPower: number;
    withoutCombatPower: number;
    averageCombatPower: number;
    topPlayers: Array<EventPlayerSummary<TPlayerClass> & {
      combatPower: number;
      isPresent: boolean;
    }>;
  };
  staleStatusPlayers: Array<EventPlayerSummary<TPlayerClass> & {
    combatPower: number;
    isPresent: boolean;
    lastStatusAt: TDate | null;
    lastStatusReviewStatus: TProgressReviewStatus | null;
    daysSinceStatus: number | null;
  }>;
  notesPt: string[];
  actionLinks: Array<{
    label: string;
    href: string;
    reason: string;
  }>;
};

export type EventAttendanceRow<TDate = string | Date, TPlayer = unknown> = {
  id: string;
  eventId: string;
  playerId: string;
  attended: boolean;
  createdAt: TDate;
  player: TPlayer;
};

export type EventDetails<TDate = string | Date, TPlayer = unknown> = EventRecord<TDate> & {
  attendances: Array<EventAttendanceRow<TDate, TPlayer>>;
};

export type AttendanceStats = {
  playerId: string;
  participatedEvents: number;
  eligibleEvents: number;
  attendancePercentage: number;
};

export type PlayerAttendanceHistoryRow<TDate = string | Date> = {
  eventId: string;
  name: string;
  type: EventType;
  status: EventStatus;
  dkpReward: number;
  startsAt: TDate;
  finalizedAt?: TDate | null;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'PENDING';
};
