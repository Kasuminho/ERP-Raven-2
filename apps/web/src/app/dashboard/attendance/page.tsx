'use client';

import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAttendanceStats, usePlayerAttendanceHistory, usePlayerId } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerAttendanceHistoryRow } from '@/types/api';

function attendanceStatusLabel(status: PlayerAttendanceHistoryRow['attendanceStatus'], locale: ReturnType<typeof useLocaleStore.getState>['locale']) {
  if (status === 'PRESENT') return t(locale, 'attendancePresent');
  if (status === 'ABSENT') return t(locale, 'attendanceAbsent');
  return t(locale, 'attendancePending');
}

function attendanceStatusTone(status: PlayerAttendanceHistoryRow['attendanceStatus']): 'green' | 'red' | 'gold' {
  if (status === 'PRESENT') return 'green';
  if (status === 'ABSENT') return 'red';
  return 'gold';
}

function eventStatusLabel(status: PlayerAttendanceHistoryRow['status'], locale: ReturnType<typeof useLocaleStore.getState>['locale']) {
  if (status === 'FINALIZED') return t(locale, 'eventStatusFinalized');
  if (status === 'ATTENDANCE_REGISTRATION') return t(locale, 'eventStatusRegistration');
  return t(locale, 'eventStatusOpen');
}

export default function AttendancePage() {
  const locale = useLocaleStore((state) => state.locale);
  const playerId = usePlayerId();
  const stats = useAttendanceStats(playerId);
  const history = usePlayerAttendanceHistory(playerId);
  const attendanceRows = (history.data ?? []).filter((event) => event.status !== 'CANCELLED');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'raidDiscipline')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'attendance')}</h1>
      </div>
      <AttendanceCard percentage={stats.data?.attendancePercentage} participated={stats.data?.participatedEvents} eligible={stats.data?.eligibleEvents} />
      <Card>
        <CardHeader><CardTitle>{t(locale, 'eventHistory')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {attendanceRows.map((event) => (
            <div key={event.eventId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/35 p-3">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-muted-foreground">
                  {event.type} - {new Date(event.startsAt).toLocaleString()} - {t(locale, 'dkpPerPerson')}: {event.dkpReward}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={event.status === 'FINALIZED' ? 'green' : 'gold'}>{eventStatusLabel(event.status, locale)}</Badge>
                <Badge tone={attendanceStatusTone(event.attendanceStatus)}>
                  {attendanceStatusLabel(event.attendanceStatus, locale)}
                </Badge>
              </div>
            </div>
          ))}
          {!history.isLoading && attendanceRows.length === 0 && (
            <EmptyState title={t(locale, 'noAttendanceHistory')}>{t(locale, 'noUpcomingEvents')}</EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
