'use client';

import { useEffect, useState } from 'react';
import { AttendanceCard } from '@/components/dashboard/attendance-card';
import { DKPCard } from '@/components/dashboard/dkp-card';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyToast } from '@/components/ui/toaster';
import { useAttendanceStats, useCommentProgress, useCreateProgress, useMarkProgressCommentsRead, useMyCombatProfile, useMyHistory, usePlayerId, useRequestCombatProfileChange, useUpdatePlayerProfile, useUpdatePreferences, useUploadImage } from '@/hooks/use-profile-api';
import { useConfirmCodexRequest, useCreateCodexRequest, useMyCodexRequests, useRetryCodexRequest } from '@/hooks/use-codex-api';
import { useCreateMyItemRequest } from '@/hooks/use-requests-api';
import { useDkpSummary } from '@/hooks/use-dkp-api';
import { useRequestableItems } from '@/hooks/use-items-api';
import { api } from '@/lib/api';
import { combatAvailabilityLabel, combatRoleLabel, itemName, playerClassLabel, progressCategoryLabel } from '@/lib/game-labels';
import { t } from '@/lib/i18n';
import { Locale, useLocaleStore } from '@/store/locale-store';
import type { PlayerClass, PlayerCombatAvailability, PlayerCombatRole, PlayerProgress, ProgressCategory } from '@/types/api';

const playerClasses: PlayerClass[] = [
  'GUNSLINGER',
  'BERSERKER',
  'DESTROYER',
  'DEATHBRINGER',
  'ASSASSIN',
  'DIVINE_CASTER',
  'NIGHT_RANGER',
  'VANGUARD',
  'ELEMENTALIST',
  'WARLORD',
];

const progressCategories: Array<{ value: ProgressCategory; review: boolean }> = [
  { value: 'STELLAS_AMPLIFICATION', review: false },
  { value: 'EQUIPMENT', review: false },
  { value: 'RELICS', review: false },
  { value: 'STIGMA', review: false },
  { value: 'ITEM_COLLECTION', review: false },
  { value: 'SKILLS', review: false },
  { value: 'PARADISE_STONES', review: false },
  { value: 'STATUS', review: true },
  { value: 'DIMENSIONAL_RIFT', review: true },
  { value: 'RUNES', review: false },
];

const timezoneOptions = [
  { value: 'America/Sao_Paulo', label: 'Brasil - BRT (Sao Paulo, Brasilia, Rio)' },
  { value: 'America/Manaus', label: 'Brasil - AMT (Manaus)' },
  { value: 'America/Rio_Branco', label: 'Brasil - ACT (Rio Branco)' },
  { value: 'America/Fortaleza', label: 'Brasil - BRT (Fortaleza/Recife)' },
  { value: 'America/Cuiaba', label: 'Brasil - AMT (Cuiaba)' },
  { value: 'America/Belem', label: 'Brasil - BRT (Belem)' },
  { value: 'America/New_York', label: 'US/Canada - Eastern' },
  { value: 'America/Chicago', label: 'US/Canada - Central' },
  { value: 'America/Denver', label: 'US/Canada - Mountain' },
  { value: 'America/Los_Angeles', label: 'US/Canada - Pacific' },
  { value: 'America/Bogota', label: 'Colombia / Peru / Ecuador' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'Europe/Lisbon', label: 'Portugal / UK' },
  { value: 'Europe/Madrid', label: 'Spain / Central Europe' },
  { value: 'Europe/Paris', label: 'France / Central Europe' },
  { value: 'Asia/Seoul', label: 'Korea' },
  { value: 'Asia/Tokyo', label: 'Japan' },
];

const combatRoles: PlayerCombatRole[] = ['FRONTLINE', 'BACKLINE', 'SUPPORT', 'CALLER', 'SCOUT', 'FLEX', 'RESERVE'];
const availabilityOptions: PlayerCombatAvailability[] = ['UNSET', 'WEEKDAYS', 'WEEKENDS', 'DAILY', 'FLEX', 'LOW'];

export default function ProfilePage() {
  const currentLocale = useLocaleStore((state) => state.locale);
  const setCurrentLocale = useLocaleStore((state) => state.setLocale);
  const playerId = usePlayerId();
  const dkp = useDkpSummary(playerId);
  const attendance = useAttendanceStats(playerId);
  const history = useMyHistory();
  const combatProfile = useMyCombatProfile();
  const requestableItems = useRequestableItems();
  const updatePreferences = useUpdatePreferences();
  const updateProfile = useUpdatePlayerProfile();
  const requestCombatProfileChange = useRequestCombatProfileChange();
  const createProgress = useCreateProgress();
  const commentProgress = useCommentProgress();
  const markProgressCommentsRead = useMarkProgressCommentsRead();
  const createRequest = useCreateMyItemRequest();
  const codexRequests = useMyCodexRequests();
  const createCodexRequest = useCreateCodexRequest();
  const confirmCodexRequest = useConfirmCodexRequest();
  const retryCodexRequest = useRetryCodexRequest();
  const uploadImage = useUploadImage();
  const [timezone, setTimezone] = useState('');
  const [locale, setLocale] = useState<Locale>('pt');
  const [profileForm, setProfileForm] = useState({
    nickname: '',
    class: 'VANGUARD' as PlayerClass,
    dimensionalLayer: 1,
  });
  const [progress, setProgress] = useState({
    category: 'STATUS' as ProgressCategory,
    level: '',
    note: '',
    imageUrls: [] as string[],
    combatPower: '',
    dimensionalLayer: '',
  });
  const [combatRequest, setCombatRequest] = useState({
    primaryClass: '' as '' | PlayerClass,
    secondaryClass: '' as '' | PlayerClass,
    declaredBuild: '',
    preferredRole: '' as '' | PlayerCombatRole,
    availability: 'UNSET' as PlayerCombatAvailability,
    proofImageUrl: '',
    note: '',
  });
  const [progressUploading, setProgressUploading] = useState(false);
  const [progressCommentDrafts, setProgressCommentDrafts] = useState<Record<string, string>>({});
  const [request, setRequest] = useState({ itemCatalogId: '', quantity: 1, imageUrl: '' });
  const [codex, setCodex] = useState({ imageUrl: '', note: '' });
  const player = history.data?.player;
  const currentCombatProfile = combatProfile.data?.combatProfile ?? player?.combatProfile;
  const selectedProgressCategory = progressCategories.find((category) => category.value === progress.category);
  const isStatusProgress = progress.category === 'STATUS';
  const isRiftProgress = progress.category === 'DIMENSIONAL_RIFT';
  const progressImageLimit = progress.category === 'STELLAS_AMPLIFICATION' || progress.category === 'SKILLS' ? 5 : 1;

  async function uploadProgressImages(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = progressImageLimit - progress.imageUrls.length;
    const filesToUpload = selectedFiles.slice(0, Math.max(remainingSlots, 0));

    if (filesToUpload.length === 0) {
      notifyToast({ title: t(currentLocale, 'imageLimitReached'), tone: 'info' });
      return;
    }

    setProgressUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ url: string }>('/uploads/image', formData);
        uploadedUrls.push(response.data.url);
      }

      setProgress((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploadedUrls].slice(0, progressImageLimit),
      }));
      notifyToast({ title: t(currentLocale, 'imagesAttached'), tone: 'success' });
    } finally {
      setProgressUploading(false);
    }
  }

  function hasUnreadStaffComment(row: PlayerProgress) {
    const staffComments = (row.comments ?? []).filter((comment) => (
      comment.author?.players?.some((player) => (
        player.roles?.some(({ role }) => ['STAFF', 'ADMIN'].includes(role.name))
      ))
    ));
    const latestCommentAt = Math.max(...staffComments.map((comment) => new Date(comment.createdAt).getTime()), 0);

    if (!latestCommentAt) {
      return false;
    }

    const readAt = row.playerReadCommentsAt ? new Date(row.playerReadCommentsAt).getTime() : 0;
    return latestCommentAt > readAt;
  }

  useEffect(() => {
    if (!player) return;

    setTimezone(player.timezone ?? '');
    setProfileForm({
      nickname: player.nickname ?? '',
      class: player.class ?? 'VANGUARD',
      dimensionalLayer: player.dimensionalLayer ?? 1,
    });

    if (player.user?.preferredLocale === 'pt' || player.user?.preferredLocale === 'en' || player.user?.preferredLocale === 'es') {
      setLocale(player.user.preferredLocale);
    }
  }, [player]);

  function saveProfile() {
    if (!Number.isInteger(profileForm.dimensionalLayer) || profileForm.dimensionalLayer < 1 || profileForm.dimensionalLayer > 10) {
      notifyToast({ title: t(currentLocale, 'invalidLayer'), description: t(currentLocale, 'profileLayerHelp'), tone: 'error' });
      return;
    }

    updateProfile.mutate(
      { ...profileForm, nickname: profileForm.nickname || undefined, timezone, locale },
      {
        onSuccess: () => {
          setCurrentLocale(locale);
          notifyToast({ title: t(currentLocale, 'profileUpdated'), tone: 'success' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">{t(currentLocale, 'characterDossier')}</p>
        <h1 className="font-[var(--font-cinzel)] text-3xl font-bold">{t(currentLocale, 'playerProfile')}</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'identity')}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Nickname:</span> {player?.nickname ?? 'Raven Member'}</p>
            <p><span className="text-muted-foreground">{t(currentLocale, 'class')}:</span> {playerClassLabel(player?.class, currentLocale) || playerClassLabel('VANGUARD', currentLocale)}</p>
            <p><span className="text-muted-foreground">{t(currentLocale, 'layer')}:</span> {player?.dimensionalLayer ?? 1}</p>
            <p><span className="text-muted-foreground">CP:</span> {player?.combatPower ?? 0}</p>
            <p><span className="text-muted-foreground">{t(currentLocale, 'timezone')}:</span> {player?.timezone ?? '-'}</p>
          </CardContent>
        </Card>
        <DKPCard {...dkp.data} />
      </div>
      <Card>
        <CardHeader><CardTitle>Perfil de combate / Combat profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">{t(currentLocale, 'class')}:</span> {playerClassLabel(currentCombatProfile?.primaryClass ?? player?.class, currentLocale)}</p>
            <p><span className="text-muted-foreground">Secundaria / Secondary:</span> {playerClassLabel(currentCombatProfile?.secondaryClass ?? undefined, currentLocale) || '-'}</p>
            <p><span className="text-muted-foreground">Build:</span> {currentCombatProfile?.declaredBuild ?? '-'}</p>
            <p><span className="text-muted-foreground">Role:</span> {combatRoleLabel(currentCombatProfile?.preferredRole, currentLocale)}</p>
            <p><span className="text-muted-foreground">Disponibilidade / Availability:</span> {combatAvailabilityLabel(currentCombatProfile?.availability, currentLocale)}</p>
            <p className="text-xs text-muted-foreground">
              PT-BR: A Staff usa isso para escala e War Room. EN: Staff uses this for rosters and War Room planning.
            </p>
            {(combatProfile.data?.combatProfileRequests ?? []).length > 0 && (
              <div className="rounded-md border bg-background/35 p-3">
                <p className="font-semibold">Pedidos recentes / Recent requests</p>
                {(combatProfile.data?.combatProfileRequests ?? []).map((request) => (
                  <p key={request.id} className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString()} - {request.status}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={combatRequest.primaryClass} onChange={(event) => setCombatRequest((current) => ({ ...current, primaryClass: event.target.value as PlayerClass | '' }))}>
              <option value="">Classe principal / Main class</option>
              {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, currentLocale)}</option>)}
            </Select>
            <Select value={combatRequest.secondaryClass} onChange={(event) => setCombatRequest((current) => ({ ...current, secondaryClass: event.target.value as PlayerClass | '' }))}>
              <option value="">Classe secundaria / Secondary class</option>
              {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, currentLocale)}</option>)}
            </Select>
            <Input placeholder="Build / Build" value={combatRequest.declaredBuild} onChange={(event) => setCombatRequest((current) => ({ ...current, declaredBuild: event.target.value }))} />
            <Select value={combatRequest.preferredRole} onChange={(event) => setCombatRequest((current) => ({ ...current, preferredRole: event.target.value as PlayerCombatRole | '' }))}>
              <option value="">Role preferido / Preferred role</option>
              {combatRoles.map((role) => <option key={role} value={role}>{combatRoleLabel(role, currentLocale)}</option>)}
            </Select>
            <Select value={combatRequest.availability} onChange={(event) => setCombatRequest((current) => ({ ...current, availability: event.target.value as PlayerCombatAvailability }))}>
              {availabilityOptions.map((availability) => <option key={availability} value={availability}>{combatAvailabilityLabel(availability, currentLocale)}</option>)}
            </Select>
            <FileUploadButton label="Print / Screenshot" onFileSelect={(files) => {
              const file = files?.[0];
              if (file) uploadImage.mutate(file, { onSuccess: (data) => setCombatRequest((current) => ({ ...current, proofImageUrl: data.url })) });
            }} />
            {combatRequest.proofImageUrl && <p className="text-xs text-primary md:col-span-2">Print anexado / Screenshot attached</p>}
            <Input className="md:col-span-2" placeholder="Nota para Staff / Note to Staff" value={combatRequest.note} onChange={(event) => setCombatRequest((current) => ({ ...current, note: event.target.value }))} />
            <Button
              className="md:col-span-2"
              disabled={requestCombatProfileChange.isPending}
              onClick={() => requestCombatProfileChange.mutate(
                {
                  primaryClass: combatRequest.primaryClass || undefined,
                  secondaryClass: combatRequest.secondaryClass || undefined,
                  declaredBuild: combatRequest.declaredBuild || undefined,
                  preferredRole: combatRequest.preferredRole || undefined,
                  availability: combatRequest.availability === 'UNSET' ? undefined : combatRequest.availability,
                  proofImageUrl: combatRequest.proofImageUrl || undefined,
                  note: combatRequest.note || undefined,
                },
                {
                  onSuccess: () => {
                    setCombatRequest({ primaryClass: '', secondaryClass: '', declaredBuild: '', preferredRole: '', availability: 'UNSET', proofImageUrl: '', note: '' });
                    notifyToast({ title: 'Pedido enviado para Staff / Request sent to Staff.', tone: 'success' });
                  },
                },
              )}
            >
              Enviar pedido / Send request
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'completeProfile')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="profile-nickname">Nickname</label>
              <Input id="profile-nickname" placeholder={player?.nickname ?? 'Nickname'} value={profileForm.nickname} onChange={(event) => setProfileForm((current) => ({ ...current, nickname: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="profile-class">{t(currentLocale, 'class')}</label>
              <Select id="profile-class" value={profileForm.class} onChange={(event) => setProfileForm((current) => ({ ...current, class: event.target.value as PlayerClass }))}>
                {playerClasses.map((playerClass) => <option key={playerClass} value={playerClass}>{playerClassLabel(playerClass, currentLocale)}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="profile-layer">{t(currentLocale, 'layer')}</label>
              <Input id="profile-layer" type="number" min={1} max={10} value={profileForm.dimensionalLayer} onChange={(event) => setProfileForm((current) => ({ ...current, dimensionalLayer: Number(event.target.value) }))} />
              <p className="text-xs text-muted-foreground">{t(currentLocale, 'profileLayerHelp')}</p>
              <p className="text-xs text-primary">{t(currentLocale, 'profileCpHelp')}</p>
            </div>
            <Button onClick={saveProfile} disabled={updateProfile.isPending}>
              {t(currentLocale, 'save')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'preferences')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              <option value="">Selecione seu fuso horario</option>
              {timezoneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="pt">Portugues</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </Select>
            <Button
              onClick={() => updatePreferences.mutate(
                { timezone, locale },
                {
                  onSuccess: () => {
                    setCurrentLocale(locale);
                    notifyToast({ title: 'Preferencias salvas.', tone: 'success' });
                  },
                },
              )}
            >
              {t(currentLocale, 'save')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'postProgress')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={progress.category} onChange={(event) => setProgress((current) => ({
              ...current,
              category: event.target.value as ProgressCategory,
              level: '',
              combatPower: '',
              dimensionalLayer: '',
              imageUrls: [],
            }))}>
              {progressCategories.map((category) => <option key={category.value} value={category.value}>{progressCategoryLabel(category.value, currentLocale)}</option>)}
            </Select>
            {isStatusProgress && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="number" placeholder={t(currentLocale, 'level')} value={progress.level} onChange={(event) => setProgress((current) => ({ ...current, level: event.target.value }))} />
                <Input type="number" placeholder={t(currentLocale, 'informedCp')} value={progress.combatPower} onChange={(event) => setProgress((current) => ({ ...current, combatPower: event.target.value }))} />
              </div>
            )}
            {isRiftProgress && (
              <div className="grid gap-2 sm:grid-cols-1">
                <Input type="number" min={1} max={10} placeholder={t(currentLocale, 'riftFloor')} value={progress.dimensionalLayer} onChange={(event) => setProgress((current) => ({ ...current, dimensionalLayer: event.target.value }))} />
              </div>
            )}
            <FileUploadButton
              label={progressImageLimit > 1 ? t(currentLocale, 'attachImages') : t(currentLocale, 'attachImage')}
              multiple={progressImageLimit > 1}
              disabled={progressUploading || progress.imageUrls.length >= progressImageLimit}
              onFileSelect={uploadProgressImages}
            />
            <p className="text-xs text-muted-foreground">{t(currentLocale, 'progressImagesHelp')}</p>
            {progress.imageUrls.length > 0 && <p className="text-xs text-muted-foreground">{progress.imageUrls.length}/{progressImageLimit} {t(currentLocale, 'imagesAttached')}</p>}
            {selectedProgressCategory?.review && <p className="text-xs text-primary">{t(currentLocale, 'reviewProgressHelp')}</p>}
            <Input placeholder={t(currentLocale, 'observation')} value={progress.note} onChange={(event) => setProgress((current) => ({ ...current, note: event.target.value }))} />
            <Button
              disabled={progress.imageUrls.length === 0 || progressUploading || createProgress.isPending}
              onClick={() => createProgress.mutate(
                {
                  category: progress.category,
                  level: isStatusProgress && progress.level ? Number(progress.level) : undefined,
                  note: progress.note,
                  imageUrls: progress.imageUrls,
                  combatPower: isStatusProgress && progress.combatPower ? Number(progress.combatPower) : undefined,
                  dimensionalLayer: isRiftProgress && progress.dimensionalLayer ? Number(progress.dimensionalLayer) : undefined,
                },
                {
                  onSuccess: () => {
                    setProgress({
                      category: progress.category,
                      level: '',
                      note: '',
                      imageUrls: [],
                      combatPower: '',
                      dimensionalLayer: '',
                    });
                    notifyToast({ title: 'Progresso publicado.', tone: 'success' });
                  },
                },
              )}
            >
              {t(currentLocale, 'publish')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'newItemRequest')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={request.itemCatalogId} onChange={(event) => setRequest((current) => ({ ...current, itemCatalogId: event.target.value }))}>
              <option value="">{t(currentLocale, 'selectItem')}</option>
              {(requestableItems.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{itemName(item, currentLocale)}</option>
              ))}
            </Select>
            <Input type="number" min={1} value={request.quantity} onChange={(event) => setRequest((current) => ({ ...current, quantity: Number(event.target.value) }))} />
            <FileUploadButton label={t(currentLocale, 'attachImage')} onFileSelect={(files) => {
              const file = files?.[0];
              if (file) uploadImage.mutate(file, { onSuccess: (data) => setRequest((current) => ({ ...current, imageUrl: data.url })) });
            }} />
            {request.imageUrl && <p className="text-center text-xs text-primary">{t(currentLocale, 'printAttached')}</p>}
            <Button
              onClick={() => createRequest.mutate(request, {
                onSuccess: () => {
                  setRequest({ itemCatalogId: '', quantity: 1, imageUrl: '' });
                  notifyToast({ title: t(currentLocale, 'itemRequestSent'), tone: 'success' });
                },
              })}
              disabled={!request.itemCatalogId || !request.imageUrl}
            >
              {t(currentLocale, 'request')}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'codexRequests')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <FileUploadButton label={t(currentLocale, 'attachImage')} onFileSelect={(files) => {
              const file = files?.[0];
              if (file) uploadImage.mutate(file, { onSuccess: (data) => setCodex((current) => ({ ...current, imageUrl: data.url })) });
            }} />
            <Input placeholder={t(currentLocale, 'optionalNote')} value={codex.note} onChange={(event) => setCodex((current) => ({ ...current, note: event.target.value }))} />
            <Button
              onClick={() => createCodexRequest.mutate(codex, {
                onSuccess: () => {
                  setCodex({ imageUrl: '', note: '' });
                  notifyToast({ title: t(currentLocale, 'codexRequestSent'), tone: 'success' });
                },
              })}
              disabled={!codex.imageUrl}
            >
              {t(currentLocale, 'sendRequest')}
            </Button>
          </CardContent>
        </Card>
      </div>
      <AttendanceCard percentage={attendance.data?.attendancePercentage} participated={attendance.data?.participatedEvents} eligible={attendance.data?.eligibleEvents} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'myDrops')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(history.data?.drops ?? []).slice(0, 10).map((drop) => (
              <div key={drop.id} className="flex justify-between rounded-md border bg-background/35 p-3 text-sm">
                <span>{itemName(drop.itemCatalog, currentLocale, drop.itemName)}</span>
                <Badge tone="green">{drop.deliveredAt ? new Date(drop.deliveredAt).toLocaleDateString() : 'entregue'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t(currentLocale, 'progress')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(history.data?.progress ?? []).slice(0, 10).map((row) => (
              <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{progressCategoryLabel(row.category, currentLocale)} - {t(currentLocale, 'level')} {row.level ?? '-'}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasUnreadStaffComment(row) && <Badge tone="gold">{t(currentLocale, 'staffCommentUnread')}</Badge>}
                    <Badge tone={row.reviewStatus === 'APPROVED' || row.reviewStatus === 'NOT_REQUIRED' ? 'green' : row.reviewStatus === 'REJECTED' ? 'red' : 'gold'}>{row.reviewStatus}</Badge>
                  </div>
                </div>
                <p className="text-muted-foreground">{row.note || t(currentLocale, 'noObservation')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(row.imageUrls?.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []).map((url, index) => (
                    <a key={url} className="text-primary" href={url} target="_blank">Print {index + 1}</a>
                  ))}
                </div>
                {row.reviewNote && <p className="mt-2 text-xs text-muted-foreground">Staff: {row.reviewNote}</p>}
                <div className="mt-3 rounded-md border bg-background/45 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{t(currentLocale, 'progressComments')}</p>
                    {hasUnreadStaffComment(row) && (
                      <Button
                        variant="secondary"
                        className="h-8 px-3"
                        onClick={() => markProgressCommentsRead.mutate(row.id, { onSuccess: () => notifyToast({ title: t(currentLocale, 'commentsRead'), tone: 'success' }) })}
                      >
                        {t(currentLocale, 'markAsRead')}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(row.comments ?? []).map((comment) => (
                      <div key={comment.id} className="rounded border bg-background/35 p-2">
                        <p className="text-xs text-muted-foreground">{comment.author?.discordNickname || comment.author?.discordUsername || 'Staff'} - {new Date(comment.createdAt).toLocaleString()}</p>
                        <p>{comment.body}</p>
                      </div>
                    ))}
                    {(row.comments ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t(currentLocale, 'noObservation')}</p>}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder={t(currentLocale, 'progressCommentPlaceholder')}
                      value={progressCommentDrafts[row.id] ?? ''}
                      onChange={(event) => setProgressCommentDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                    />
                    <Button
                      disabled={commentProgress.isPending || !(progressCommentDrafts[row.id] ?? '').trim()}
                      onClick={() => commentProgress.mutate(
                        { progressId: row.id, body: progressCommentDrafts[row.id] ?? '' },
                        {
                          onSuccess: () => {
                            setProgressCommentDrafts((current) => ({ ...current, [row.id]: '' }));
                            notifyToast({ title: t(currentLocale, 'progressCommentSent'), tone: 'success' });
                          },
                        },
                      )}
                    >
                      {t(currentLocale, 'addProgressComment')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{t(currentLocale, 'codexRequests')}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(codexRequests.data ?? []).map((row) => (
            <div key={row.id} className="rounded-md border bg-background/35 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <a className="font-semibold text-primary" href={row.imageUrl} target="_blank" rel="noreferrer">{t(currentLocale, 'openRequestedPrint')}</a>
                <Badge tone={row.status === 'CONFIRMED' ? 'green' : row.status === 'NEEDS_RETRY' ? 'red' : 'gold'}>{row.status}</Badge>
              </div>
              {row.note && <p className="text-muted-foreground">{row.note}</p>}
              {row.proofImageUrl && <a className="text-primary" href={row.proofImageUrl} target="_blank" rel="noreferrer">{t(currentLocale, 'openDeliveryProof')}</a>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => confirmCodexRequest.mutate(row.id, { onSuccess: () => notifyToast({ title: t(currentLocale, 'success'), tone: 'success' }) })} disabled={row.status !== 'SENT'}>{t(currentLocale, 'success')}</Button>
                <Button variant="secondary" onClick={() => retryCodexRequest.mutate(row.id, { onSuccess: () => notifyToast({ title: t(currentLocale, 'failedRetry'), tone: 'success' }) })} disabled={row.status !== 'SENT'}>{t(currentLocale, 'failedRetry')}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t(currentLocale, 'transactionHistory')}</CardTitle></CardHeader>
        <CardContent><TransactionTable /></CardContent>
      </Card>
    </div>
  );
}
