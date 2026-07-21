'use client';

import { useState } from 'react';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useCreateAbsence, useJustifyEventNoShow, useMyAbsences, useMyEventCommitments, useMyEventNoShows, useRemoveAbsence, useRespondEventReservePromotion, useRespondEventRsvp } from '@/hooks/use-events-api';
import { useAttendanceStats, usePlayerAttendanceHistory, usePlayerId } from '@/hooks/use-profile-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { EventRsvpStatus, PlayerAttendanceHistoryRow } from '@/types/api';

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
  const commitments = useMyEventCommitments();
  const absences = useMyAbsences();
  const noShows = useMyEventNoShows();
  const createAbsence = useCreateAbsence();
  const removeAbsence = useRemoveAbsence();
  const respondRsvp = useRespondEventRsvp();
  const respondReservePromotion = useRespondEventReservePromotion();
  const justifyNoShow = useJustifyEventNoShow();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [publicNotes, setPublicNotes] = useState<Record<string, boolean>>({});
  const [absenceStartsAt, setAbsenceStartsAt] = useState('');
  const [absenceEndsAt, setAbsenceEndsAt] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceReasonPublic, setAbsenceReasonPublic] = useState(false);
  const [removingAbsenceId, setRemovingAbsenceId] = useState<string>();
  const [noShowJustifications, setNoShowJustifications] = useState<Record<string, string>>({});
  const attendanceRows = (history.data ?? []).filter((event) => event.status !== 'CANCELLED');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(locale, 'raidDiscipline')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'attendance')}</h1>
      </div>
      <AttendanceCard percentage={stats.data?.attendancePercentage} participated={stats.data?.participatedEvents} eligible={stats.data?.eligibleEvents} />
      {(noShows.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>{locale === 'en' ? 'Missed confirmed events' : 'Eventos confirmados sem presença'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {locale === 'en'
                ? 'This comparison is explanatory only. One missed event creates no automatic punishment or risk flag.'
                : 'Esta comparação serve apenas para contexto. Uma falta isolada não gera punição nem risk flag automática.'}
            </p>
            {(noShows.data ?? []).map((noShow) => {
              const draft = noShowJustifications[noShow.eventId] ?? noShow.justification ?? '';
              return (
                <div key={noShow.eventId} className="space-y-2 rounded-md border bg-background/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{noShow.eventName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(noShow.startsAt).toLocaleString()}</p>
                    </div>
                    <Badge tone={noShow.justifiedAt ? 'green' : 'gold'}>{noShow.justifiedAt ? (locale === 'en' ? 'EXPLAINED' : 'JUSTIFICADO') : (locale === 'en' ? 'EXPLANATION OPEN' : 'JUSTIFICATIVA ABERTA')}</Badge>
                  </div>
                  <textarea
                    className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    maxLength={500}
                    placeholder={locale === 'en' ? 'Tell Staff what happened' : 'Conte para a Staff o que aconteceu'}
                    value={draft}
                    onChange={(event) => setNoShowJustifications((current) => ({ ...current, [noShow.eventId]: event.target.value }))}
                  />
                  <Button
                    disabled={draft.trim().length < 3 || justifyNoShow.isPending}
                    onClick={() => justifyNoShow.mutate({ eventId: noShow.eventId, justification: draft.trim() }, {
                      onSuccess: () => notifyToast({ title: locale === 'en' ? 'Explanation saved.' : 'Justificativa salva.', tone: 'success' }),
                    })}
                  >
                    {locale === 'en' ? 'Save explanation' : 'Salvar justificativa'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>{locale === 'en' ? 'Absence periods' : 'Períodos de ausência'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{locale === 'en' ? 'Starts' : 'Início'}</span>
              <Input type="datetime-local" value={absenceStartsAt} onChange={(event) => setAbsenceStartsAt(event.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{locale === 'en' ? 'Ends' : 'Fim'}</span>
              <Input type="datetime-local" value={absenceEndsAt} onChange={(event) => setAbsenceEndsAt(event.target.value)} />
            </label>
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
              maxLength={500}
              placeholder={locale === 'en' ? 'Optional reason (private to Staff by default)' : 'Motivo opcional (privado para a Staff por padrão)'}
              value={absenceReason}
              onChange={(event) => setAbsenceReason(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={absenceReasonPublic} onChange={(event) => setAbsenceReasonPublic(event.target.checked)} className="h-4 w-4 accent-primary" />
              {locale === 'en' ? 'Allow players to see the reason' : 'Permitir que players vejam o motivo'}
            </label>
            <Button
              disabled={!absenceStartsAt || !absenceEndsAt || createAbsence.isPending}
              onClick={() => createAbsence.mutate({
                startsAt: new Date(absenceStartsAt).toISOString(),
                endsAt: new Date(absenceEndsAt).toISOString(),
                reason: absenceReason.trim() || undefined,
                reasonVisibility: absenceReasonPublic ? 'PLAYER_PUBLIC' : 'STAFF_ONLY',
              }, {
                onSuccess: () => {
                  setAbsenceStartsAt('');
                  setAbsenceEndsAt('');
                  setAbsenceReason('');
                  setAbsenceReasonPublic(false);
                  notifyToast({ title: locale === 'en' ? 'Absence registered.' : 'Ausência registrada.', tone: 'success' });
                },
              })}
            >
              {locale === 'en' ? 'Register absence' : 'Registrar ausência'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {locale === 'en'
              ? 'Events inside the period become unavailable automatically. No repeated decline is required.'
              : 'Eventos dentro do período ficam indisponíveis automaticamente. Não é preciso recusar um por um.'}
          </p>
          <div className="space-y-2">
            {(absences.data ?? []).map((absence) => (
              <div key={absence.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-background/35 p-3 text-sm">
                <div>
                  <p className="font-semibold">{new Date(absence.startsAt).toLocaleString()} — {new Date(absence.endsAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {absence.reason || (locale === 'en' ? 'No reason provided' : 'Sem motivo informado')} · {absence.reasonVisibility === 'STAFF_ONLY' ? (locale === 'en' ? 'private to Staff' : 'privado para a Staff') : (locale === 'en' ? 'shared with players' : 'compartilhado com players')}
                  </p>
                </div>
                <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => setRemovingAbsenceId(absence.id)}>
                  {locale === 'en' ? 'Remove' : 'Remover'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'en' ? 'Upcoming commitments' : 'Próximos compromissos'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(commitments.data ?? []).map(({ event, myRsvp, absence, requiresResponse, reserve, absenceSummary, publicResponses }) => {
            const note = notes[event.id] ?? myRsvp?.note ?? '';
            const isPublic = publicNotes[event.id] ?? myRsvp?.noteVisibility === 'PLAYER_PUBLIC';
            const respond = (status: EventRsvpStatus) => respondRsvp.mutate({
              eventId: event.id,
              status,
              note: note.trim() || undefined,
              noteVisibility: isPublic ? 'PLAYER_PUBLIC' : 'STAFF_ONLY',
            }, {
              onSuccess: () => notifyToast({
                title: locale === 'en' ? 'Commitment updated.' : 'Compromisso atualizado.',
                tone: 'success',
              }),
            });

            return (
              <div key={event.id} className="space-y-3 rounded-md border bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(event.startsAt).toLocaleString()} · {event.type}</p>
                  </div>
                  <Badge tone={absence ? 'red' : reserve?.status === 'PROMOTION_PENDING' ? 'gold' : reserve?.status === 'RESERVE' ? 'blue' : myRsvp?.status === 'CONFIRMED' ? 'green' : myRsvp?.status === 'DECLINED' ? 'red' : 'gold'}>
                    {absence
                      ? (locale === 'en' ? 'UNAVAILABLE' : 'INDISPONÍVEL')
                      : reserve?.status === 'PROMOTION_PENDING'
                        ? (locale === 'en' ? 'SLOT OFFERED' : 'VAGA OFERECIDA')
                        : reserve?.status === 'RESERVE'
                          ? `${locale === 'en' ? 'RESERVE' : 'RESERVA'} #${reserve.position}`
                          : myRsvp?.status ?? (locale === 'en' ? 'UNANSWERED' : 'SEM RESPOSTA')}
                  </Badge>
                </div>
                {absence ? (
                  <div className="rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm">
                    <p className="font-semibold">{locale === 'en' ? 'Covered by your absence period.' : 'Coberto pelo seu período de ausência.'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(absence.startsAt).toLocaleString()} — {new Date(absence.endsAt).toLocaleString()}</p>
                    {absence.reason ? <p className="mt-1">{absence.reason}</p> : null}
                  </div>
                ) : reserve?.status === 'PROMOTION_PENDING' ? (
                  <div className="space-y-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
                    <p className="font-semibold">{locale === 'en' ? 'A roster slot opened. Do you accept?' : 'Uma vaga abriu na composição. Você aceita?'}</p>
                    <p className="text-xs text-muted-foreground">{locale === 'en' ? 'Accepting confirms your RSVP, but still does not mark attendance or grant DKP.' : 'Aceitar confirma seu RSVP, mas ainda não marca presença nem concede DKP.'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={respondReservePromotion.isPending} onClick={() => respondReservePromotion.mutate({ eventId: event.id, accept: true }, { onSuccess: () => notifyToast({ title: locale === 'en' ? 'Slot accepted.' : 'Vaga aceita.', tone: 'success' }) })}>
                        {locale === 'en' ? 'Accept slot' : 'Aceitar vaga'}
                      </Button>
                      <Button variant="danger" disabled={respondReservePromotion.isPending} onClick={() => respondReservePromotion.mutate({ eventId: event.id, accept: false }, { onSuccess: () => notifyToast({ title: locale === 'en' ? 'Slot declined.' : 'Vaga recusada.', tone: 'success' }) })}>
                        {locale === 'en' ? 'Decline' : 'Recusar'}
                      </Button>
                    </div>
                  </div>
                ) : reserve?.status === 'RESERVE' ? (
                  <div className="rounded-md border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm">
                    <p className="font-semibold">{locale === 'en' ? `You are reserve #${reserve.position}.` : `Você está na reserva #${reserve.position}.`}</p>
                    <p className="text-xs text-muted-foreground">{locale === 'en' ? 'Wait for a slot offer; the Staff-only reason is not exposed here.' : 'Aguarde uma oferta de vaga; o motivo Staff-only não é exposto aqui.'}</p>
                  </div>
                ) : <><textarea
                  className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  maxLength={500}
                  placeholder={locale === 'en' ? 'Optional note (private to Staff by default)' : 'Nota opcional (privada para a Staff por padrão)'}
                  value={note}
                  onChange={(input) => setNotes((current) => ({ ...current, [event.id]: input.target.value }))}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(input) => setPublicNotes((current) => ({ ...current, [event.id]: input.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {locale === 'en' ? 'Allow other players to see this note' : 'Permitir que outros players vejam esta nota'}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => respond('CONFIRMED')} disabled={respondRsvp.isPending || !requiresResponse && !myRsvp}>
                    {locale === 'en' ? 'I will attend' : 'Vou participar'}
                  </Button>
                  <Button variant="secondary" onClick={() => respond('TENTATIVE')} disabled={respondRsvp.isPending}>
                    {locale === 'en' ? 'Maybe' : 'Talvez'}
                  </Button>
                  <Button variant="danger" onClick={() => respond('DECLINED')} disabled={respondRsvp.isPending}>
                    {locale === 'en' ? 'Cannot attend' : 'Não vou'}
                  </Button>
                </div>
                </>}
                <p className="text-xs text-muted-foreground">
                  {locale === 'en'
                    ? 'RSVP forecasts the roster. It does not mark attendance or grant DKP.'
                    : 'RSVP prevê a composição. Ele não marca presença nem concede DKP.'}
                </p>
                {absenceSummary.unavailableCount > 0 && (
                  <div className="rounded-md border bg-background/45 p-3 text-xs">
                    <p className="font-semibold">{locale === 'en' ? `${absenceSummary.unavailableCount} player(s) unavailable in this period` : `${absenceSummary.unavailableCount} player(s) indisponível(is) neste período`}</p>
                    {absenceSummary.sharedReasons.map((item) => <p key={item.nickname} className="mt-1"><strong>{item.nickname}</strong>: {item.reason}</p>)}
                  </div>
                )}
                {publicResponses.length > 0 && (
                  <div className="rounded-md border bg-background/45 p-3 text-xs">
                    <p className="mb-2 uppercase text-muted-foreground">{locale === 'en' ? 'Notes shared by players' : 'Notas compartilhadas pelos players'}</p>
                    <div className="space-y-1">
                      {publicResponses.map((response) => (
                        <p key={`${response.nickname}-${response.updatedAt}`}><strong>{response.nickname}</strong> · {response.status}: {response.note}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!commitments.isLoading && (commitments.data ?? []).length === 0 && (
            <EmptyState title={locale === 'en' ? 'No upcoming commitments' : 'Nenhum compromisso futuro'}>
              {locale === 'en' ? 'New open events will appear here.' : 'Novos eventos abertos aparecerão aqui.'}
            </EmptyState>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={Boolean(removingAbsenceId)}
        title={locale === 'en' ? 'Remove absence period?' : 'Remover período de ausência?'}
        description={locale === 'en' ? 'Events in this period may require RSVP again.' : 'Os eventos deste período poderão voltar a exigir RSVP.'}
        confirmLabel={locale === 'en' ? 'Remove period' : 'Remover período'}
        cancelLabel={locale === 'en' ? 'Back' : 'Voltar'}
        pending={removeAbsence.isPending}
        onClose={() => setRemovingAbsenceId(undefined)}
        onConfirm={() => removingAbsenceId && removeAbsence.mutate(removingAbsenceId, {
          onSuccess: () => {
            setRemovingAbsenceId(undefined);
            notifyToast({ title: locale === 'en' ? 'Absence removed.' : 'Ausência removida.', tone: 'success' });
          },
        })}
      />
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
