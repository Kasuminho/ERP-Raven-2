'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, BellRing, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/guards/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useAnnouncements, useCancelAnnouncement, useCreateAnnouncement } from '@/hooks/use-guild-api';
import { t } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale-store';
import type { EventType } from '@/types/api';

const roleOptions = [
  { value: '1431323037214572635', label: 'G3X membros' },
  { value: '1431337988423549000', label: 'G3X Admin / Staff' },
  { value: '', label: 'Sem mencao' },
] as const;

const defaultMemberRoleId = '1431323037214572635';
const eventTypes: EventType[] = [
  'LUNOS',
  'RIGRETO',
  'GARDRON',
  'MELKAR',
  'VARGAS',
  'BELLAMONICA',
  'SION',
  'ISTERIA',
  'NIDROK',
  'MORGON',
  'GUILD_DUNGEON',
  'SATURDAY_EVENT',
  'ABYSS_1',
  'ABYSS_1_2',
  'FLOUD',
  'KRATERIUS',
  'T3_ROTATION',
];

function formatAnnouncementPreview(form: {
  type: string;
  title: string;
  description: string;
  eventTime: string;
  mentionRoleId: string;
}) {
  return {
    mention: form.mentionRoleId ? `<@&${form.mentionRoleId}>` : '',
    title: 'Novo anuncio cadastrado',
    description: form.description,
    event: `${form.type || 'Evento'}: ${form.title || 'Nome do evento'}`,
    time: form.eventTime ? `<t:${Math.floor(new Date(form.eventTime).getTime() / 1000)}:F>` : 'selecione data e hora',
  };
}

export default function AdminAnnouncementsPage() {
  const announcements = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const cancelAnnouncement = useCancelAnnouncement();
  const locale = useLocaleStore((state) => state.locale);
  const [form, setForm] = useState({
    type: 'Evento',
    title: '',
    description: '',
    eventTime: '',
    timezone: 'America/Sao_Paulo',
    channelId: '',
    mentionRoleId: defaultMemberRoleId,
  });
  const [createAttendanceEvents, setCreateAttendanceEvents] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const orderedAnnouncementTitle = createAttendanceEvents && selectedEventTypes.length > 1
    ? `${form.title} - ${selectedEventTypes.join(' - ')}`
    : form.title;
  const preview = formatAnnouncementPreview({ ...form, title: orderedAnnouncementTitle });

  async function submit() {
    try {
      await createAnnouncement.mutateAsync({
        ...form,
        description: form.description || undefined,
        channelId: form.channelId || undefined,
        mentionRoleId: form.mentionRoleId || undefined,
        eventTime: new Date(form.eventTime).toISOString(),
        attendanceEventTypes: createAttendanceEvents ? selectedEventTypes : undefined,
      });

      setForm({
        type: 'Evento',
        title: '',
        description: '',
        eventTime: '',
        timezone: 'America/Sao_Paulo',
        channelId: '',
        mentionRoleId: defaultMemberRoleId,
      });
      setCreateAttendanceEvents(false);
      setSelectedEventTypes([]);
      notifyToast({
        title: createAttendanceEvents ? t(locale, 'announcementScheduledWithEvent') : t(locale, 'announcementScheduled'),
        tone: 'success',
      });
    } catch {
      notifyToast({ title: t(locale, 'announcementScheduleFailed'), tone: 'error' });
    }
  }

  function toggleEventType(type: EventType) {
    setSelectedEventTypes((current) => (
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type]
    ));
  }

  function moveEventType(index: number, direction: -1 | 1) {
    setSelectedEventTypes((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const ordered = [...current];
      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return ordered;
    });
  }

  return (
    <AuthGuard roles={['STAFF', 'ADMIN']}>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase text-primary">{t(locale, 'comms')}</p>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(locale, 'announcements')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t(locale, 'scheduleAnnouncement')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3 lg:grid-cols-4">
              <Input placeholder={t(locale, 'type')} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
              <Input placeholder={t(locale, 'eventTitle')} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              <Input type="datetime-local" value={form.eventTime} onChange={(event) => setForm((current) => ({ ...current, eventTime: event.target.value }))} />
              <Select value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}>
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="UTC">UTC</option>
              </Select>
              <Input placeholder={t(locale, 'optionalDiscordChannel')} value={form.channelId} onChange={(event) => setForm((current) => ({ ...current, channelId: event.target.value }))} />
              <Select value={form.mentionRoleId} onChange={(event) => setForm((current) => ({ ...current, mentionRoleId: event.target.value }))}>
                {roleOptions.map((role) => <option key={role.label} value={role.value}>{role.label}</option>)}
              </Select>
              <Input placeholder={t(locale, 'optionalDescription')} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="lg:col-span-2" />
              <label className="flex items-center gap-2 rounded-md border bg-background/35 px-3 py-2 text-sm lg:col-span-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={createAttendanceEvents}
                  onChange={(event) => {
                    setCreateAttendanceEvents(event.target.checked);
                    if (!event.target.checked) setSelectedEventTypes([]);
                  }}
                />
                {t(locale, 'createAttendanceEventQuestion')}
              </label>
              {createAttendanceEvents && (
                <div className="space-y-4 rounded-md border bg-background/35 p-3 lg:col-span-4">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {eventTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedEventTypes.includes(type)}
                          onChange={() => toggleEventType(type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  {selectedEventTypes.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold uppercase text-primary">Ordem dos bosses</p>
                      {selectedEventTypes.map((type, index) => (
                        <div key={type} className="flex items-center justify-between gap-3 rounded-md border bg-black/20 px-3 py-2 text-sm">
                          <span><strong>{index + 1}.</strong> {type}</span>
                          <div className="flex gap-1">
                            <Button variant="secondary" onClick={() => moveEventType(index, -1)} disabled={index === 0} aria-label={`Subir ${type}`}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" onClick={() => moveEventType(index, 1)} disabled={index === selectedEventTypes.length - 1} aria-label={`Descer ${type}`}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={submit}
                disabled={createAnnouncement.isPending || !form.title || !form.eventTime || (createAttendanceEvents && selectedEventTypes.length === 0)}
                className="lg:col-span-4"
              >
                <BellRing className="h-4 w-4" /> {t(locale, 'scheduleRepostingAnnouncement')}
              </Button>
            </div>
            <div className="rounded-lg border bg-background/55 p-4">
              <p className="mb-3 text-xs uppercase text-primary">Preview Discord</p>
              <div className="rounded-md border-l-4 border-primary bg-black/30 p-4 text-sm shadow-lg">
                {preview.mention && <p className="mb-2 text-cyan-300">{preview.mention}</p>}
                <p className="text-lg font-bold">{preview.title}</p>
                {preview.description && <p className="mt-2 text-muted-foreground">{preview.description}</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{form.type || 'Evento'}</p>
                    <p className="font-semibold">{orderedAnnouncementTitle || 'Nome do evento'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Horario</p>
                    <p className="font-semibold">{preview.time}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(locale, 'announcementQueue')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(announcements.data ?? []).map((announcement) => (
              <div key={announcement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/35 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{announcement.type}: {announcement.title}</p>
                    <Badge tone={announcement.status === 'ACTIVE' ? 'green' : announcement.status === 'CANCELLED' ? 'red' : 'muted'}>{announcement.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(announcement.eventTime).toLocaleString()} - {t(locale, 'channel')} {announcement.channelId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, 'daily')}: {announcement.warnedDailyDay ? t(locale, 'sentToday') : t(locale, 'pending')} - 4h {announcement.warned4h ? t(locale, 'sent') : t(locale, 'pending')} - 1h {announcement.warned1h ? t(locale, 'sent') : t(locale, 'pending')} - 30m {announcement.warned30m ? t(locale, 'sent') : t(locale, 'pending')}
                  </p>
                </div>
                {announcement.status === 'ACTIVE' && (
                  <Button
                    variant="secondary"
                    onClick={() => cancelAnnouncement.mutate(announcement.id, { onSuccess: () => notifyToast({ title: t(locale, 'announcementCancelled'), tone: 'success' }) })}
                    disabled={cancelAnnouncement.isPending}
                  >
                    <XCircle className="h-4 w-4" /> {t(locale, 'cancel')}
                  </Button>
                )}
              </div>
            ))}
            {!announcements.isLoading && (announcements.data ?? []).length === 0 && (
              <EmptyState title={t(locale, 'noAnnouncementsScheduled')}>{t(locale, 'announcementsHelp')}</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
