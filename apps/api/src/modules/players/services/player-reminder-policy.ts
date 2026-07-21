import { PlayerCombatAvailability } from '@prisma/client';

export const PLAYER_STATUS_MAX_AGE_DAYS = 21;
export const PLAYER_ATTENDANCE_WINDOW_DAYS = 15;
export const PLAYER_ATTENDANCE_MIN_PERCENTAGE = 50;

export type RosterSignal =
  | 'SEM_BUILD'
  | 'SEM_ROLE'
  | 'SEM_STATUS_RECENTE'
  | 'PRESENCA_BAIXA'
  | 'SEM_DISPONIBILIDADE';

export function buildRosterSignals(data: {
  declaredBuild?: string | null;
  preferredRole?: string | null;
  availability?: PlayerCombatAvailability | null;
  lastStatusAt?: Date | null;
  statusCutoff: Date;
  eligibleEvents: number;
  attendedEvents: number;
}): RosterSignal[] {
  const signals: RosterSignal[] = [];

  if (!data.declaredBuild?.trim()) signals.push('SEM_BUILD');
  if (!data.preferredRole) signals.push('SEM_ROLE');
  if (!data.lastStatusAt || data.lastStatusAt < data.statusCutoff) signals.push('SEM_STATUS_RECENTE');
  if (data.eligibleEvents > 0 && (data.attendedEvents / data.eligibleEvents) * 100 < PLAYER_ATTENDANCE_MIN_PERCENTAGE) {
    signals.push('PRESENCA_BAIXA');
  }
  if (!data.availability || data.availability === PlayerCombatAvailability.UNSET) signals.push('SEM_DISPONIBILIDADE');

  return signals;
}
