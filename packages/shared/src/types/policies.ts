export type GuildPolicyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type GuildPolicySnapshotRule = {
  key: string;
  category: string;
  label: string;
  description?: string | null;
  value: unknown;
};

export type GuildPolicySnapshot = {
  rules: GuildPolicySnapshotRule[];
};

export type GuildPolicyVersionRecord<TDate = string | Date> = {
  id: string;
  version?: number | null;
  status: GuildPolicyStatus;
  titlePt: string;
  titleEn: string;
  summaryPt: string;
  summaryEn: string;
  effectiveAt: TDate;
  isEmergency: boolean;
  emergencyReason?: string | null;
  snapshot: GuildPolicySnapshot;
  diffPt: string[];
  diffEn: string[];
  createdAt: TDate;
  updatedAt: TDate;
  publishedAt?: TDate | null;
  createdBy?: { id: string; discordUsername: string; discordNickname?: string | null };
  publishedBy?: { id: string; discordUsername: string; discordNickname?: string | null } | null;
  myReceipt?: {
    openedAt?: TDate | null;
    acknowledgedAt?: TDate | null;
  } | null;
};

export type GuildPolicyPublicWorkspace<TDate = string | Date> = {
  current: GuildPolicyVersionRecord<TDate> | null;
  upcoming: GuildPolicyVersionRecord<TDate>[];
  history: GuildPolicyVersionRecord<TDate>[];
};

export type GuildPolicyStaffWorkspace<TDate = string | Date> = GuildPolicyPublicWorkspace<TDate> & {
  drafts: GuildPolicyVersionRecord<TDate>[];
  operationalSnapshot: GuildPolicySnapshot;
  operationalDriftPt: string[];
  operationalDriftEn: string[];
  coverage: Array<{
    policyId: string;
    version?: number | null;
    activePlayers: number;
    opened: number;
    acknowledged: number;
    unopened: Array<{ playerId: string; nickname: string }>;
  }>;
};
