'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, ChevronDown, Flame, Shield, Sparkles, Swords, Trophy, Upload, User, UserCheck, UserMinus, Users, X, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useGuildRanking, type GuildRankingMember } from '@/hooks/use-ranking-api';
import { useCreateProgress, useMyHistory, useUpdatePlayerMembership, useUpdatePlayerProfile } from '@/hooks/use-profile-api';
import { playerClassLabel } from '@/lib/game-labels';
import { api } from '@/lib/api';
import { optimizeImageForUpload } from '@/lib/image-compression';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLocaleStore } from '@/store/locale-store';
import type { PlayerClass } from '@/types/api';

const RAVEN2_CLASSES: PlayerClass[] = [
  'VANGUARD',
  'BERSERKER',
  'GUNSLINGER',
  'NIGHT_RANGER',
  'ELEMENTALIST',
  'DIVINE_CASTER',
  'ASSASSIN',
  'DESTROYER',
  'DEATHBRINGER',
  'WARLORD',
];

export default function SimplifiedDashboardPage() {
  const profileHistory = useMyHistory();
  const updateProfile = useUpdatePlayerProfile();
  const createProgress = useCreateProgress();
  const updateMembership = useUpdatePlayerMembership();
  const locale = useLocaleStore((state) => state.locale);
  const isStaff = useAuthStore((state) => state.hasRole(['STAFF', 'ADMIN']));

  const [selectedGuild, setSelectedGuild] = useState<'ALL' | 'AlcatraZ' | 'AlcatraZ2'>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [zoomProofUrl, setZoomProofUrl] = useState<string | null>(null);

  // Staff Removal State
  const [removeTarget, setRemoveTarget] = useState<GuildRankingMember | null>(null);
  const [removeReason, setRemoveReason] = useState('Saiu da guilda');
  const [isRemoving, setIsRemoving] = useState(false);

  // Form State
  const myPlayer = profileHistory.data?.player;
  const [nickname, setNickname] = useState('');
  const [charClass, setCharClass] = useState<PlayerClass>('BERSERKER');
  const [guild, setGuild] = useState<'AlcatraZ' | 'AlcatraZ2'>('AlcatraZ');
  const [attack, setAttack] = useState('');
  const [defense, setDefense] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const ranking = useGuildRanking(selectedGuild, showInactive);

  function openSubmitModal() {
    if (myPlayer) {
      setNickname(myPlayer.nickname || '');
      setCharClass(myPlayer.class || 'BERSERKER');
      if (myPlayer.guildName === 'AlcatraZ2' || myPlayer.guildName === 'AlcatraZ') {
        setGuild(myPlayer.guildName as 'AlcatraZ' | 'AlcatraZ2');
      }
    }
    setModalOpen(true);
  }

  // Upload e auto-OCR com compressão prévia no cliente
  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      // Otimiza prints pesados (PNG/JPG > 1.5MB ou 4K) para JPEG leve, evitando timeout e cancelamento
      const fileToUpload = await optimizeImageForUpload(file);
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const res = await api.post<{ url: string }>('/uploads/image', formData, {
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url;
      setProofUrl(url);
      notifyToast({ title: t(locale, 'toastPrintAttachedTitle'), tone: 'success' });

      // Disparar OCR
      setScanning(true);
      try {
        const ocrRes = await api.post<{
          success: boolean;
          attack?: number;
          defense?: number;
          accuracy?: number;
          calculatedCp?: number;
          buffCount?: number;
        }>('/players/scan-status-print', { imageUrl: url });

        if (ocrRes.data?.success) {
          if (ocrRes.data.attack) setAttack(String(ocrRes.data.attack));
          if (ocrRes.data.defense) setDefense(String(ocrRes.data.defense));
          if (ocrRes.data.accuracy) setAccuracy(String(ocrRes.data.accuracy));
          notifyToast({
            title: `${t(locale, 'toastOcrDetectedTitle')} ⚔️ ${ocrRes.data.attack} | 🛡️ ${ocrRes.data.defense} | 🎯 ${ocrRes.data.accuracy}`,
            tone: 'success',
          });
        }
      } catch {
        // OCR opcional - o usuário pode conferir e digitar manualmente
      } finally {
        setScanning(false);
      }
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { status?: number; data?: { message?: string } } };
      let message = 'Não foi possível enviar a imagem. Tente novamente.';
      if (axiosErr?.code === 'ECONNABORTED') {
        message = 'Tempo limite de upload esgotado. Verifique sua conexão.';
      } else if (axiosErr?.response?.status === 413) {
        message = 'Imagem muito pesada (máximo 25 MB).';
      } else if (axiosErr?.response?.data?.message) {
        message = String(axiosErr.response.data.message);
      }
      notifyToast({ title: 'Erro ao subir print', description: message, tone: 'error' });
    } finally {
      setUploading(false);
    }
  }

  const handleFileUploadRef = useRef(handleFileUpload);
  handleFileUploadRef.current = handleFileUpload;

  const openSubmitModalRef = useRef(openSubmitModal);
  openSubmitModalRef.current = openSubmitModal;

  const modalOpenRef = useRef(modalOpen);
  modalOpenRef.current = modalOpen;

  // Interceptar CTRL+V globalmente na página
  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      let foundFile: File | null = null;

      // 1. Verificar e.clipboardData.items
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            foundFile = item.getAsFile();
            if (foundFile) break;
          }
        }
      }

      // 2. Fallback para e.clipboardData.files
      if (!foundFile && e.clipboardData?.files?.length) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const file = e.clipboardData.files[i];
          if (file.type.startsWith('image/')) {
            foundFile = file;
            break;
          }
        }
      }

      // 3. Se encontrou print colado
      if (foundFile) {
        e.preventDefault();
        if (!modalOpenRef.current) {
          openSubmitModalRef.current();
        }
        notifyToast({
          title: t(locale, 'toastPrintPastedTitle'),
          description: t(locale, 'toastPrintPastedDesc'),
          tone: 'success',
        });
        handleFileUploadRef.current(foundFile);
      }
    }

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [locale]);

  async function handleSubmit() {
    const atk = Number(attack) || 0;
    const def = Number(defense) || 0;
    const acc = Number(accuracy) || 0;
    const totalCp = atk + def + acc;

    if (!proofUrl) {
      notifyToast({ title: t(locale, 'toastAttachProofError'), tone: 'error' });
      return;
    }

    if (totalCp <= 0) {
      notifyToast({ title: t(locale, 'toastFillStatsError'), tone: 'error' });
      return;
    }

    // 1. Atualizar nick/classe/guilda se mudou
    if (myPlayer && (myPlayer.nickname !== nickname || myPlayer.class !== charClass || myPlayer.guildName !== guild)) {
      await updateProfile.mutateAsync({
        nickname: nickname.trim(),
        class: charClass,
        guildName: guild,
      });
    }

    // 2. Enviar progresso de STATUS
    await createProgress.mutateAsync(
      {
        category: 'STATUS',
        combatPower: totalCp,
        imageUrls: [proofUrl],
        metadata: {
          attack: atk,
          defense: def,
          accuracy: acc,
          calculatedCp: totalCp,
          guild,
          source: 'web_simple_form',
        },
      },
      {
        onSuccess: () => {
          notifyToast({
            title: t(locale, 'toastStatusSubmittedTitle'),
            description: t(locale, 'toastStatusSubmittedDesc').replace('{guild}', guild),
            tone: 'success',
          });
          setModalOpen(false);
          setProofUrl('');
          setAttack('');
          setDefense('');
          setAccuracy('');
        },
      },
    );
  }

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await updateMembership.mutateAsync({
        playerId: removeTarget.id,
        action: 'DEACTIVATE',
        reason: removeReason.trim() || 'Saiu da guilda',
      });
      notifyToast({
        title: `${removeTarget.nickname} removido da guilda.`,
        description: 'O jogador foi desativado e não aparece mais no ranking ativo.',
        tone: 'success',
      });
      setRemoveTarget(null);
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao remover membro',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    } finally {
      setIsRemoving(false);
    }
  }

  async function handleReactivate(member: GuildRankingMember) {
    try {
      await updateMembership.mutateAsync({
        playerId: member.id,
        action: 'ACTIVATE',
      });
      notifyToast({
        title: `${member.nickname} reativado!`,
        description: 'O jogador retornou para a lista ativa da guilda.',
        tone: 'success',
      });
    } catch (err: any) {
      notifyToast({
        title: 'Erro ao reativar membro',
        description: err?.response?.data?.message || err.message,
        tone: 'error',
      });
    }
  }

  const members = ranking.data ?? [];
  const filtered = members.filter((m) => {
    const matchClass = selectedClass === 'ALL' || m.class === selectedClass;
    const matchGuild = selectedGuild === 'ALL' || m.guildName === selectedGuild;
    return matchClass && matchGuild;
  });

  const alcatrazCount = members.filter((m) => (m.guildName ?? 'AlcatraZ') === 'AlcatraZ').length;
  const alcatraz2Count = members.filter((m) => m.guildName === 'AlcatraZ2').length;
  const inactiveCount = members.filter((m) => m.isActive === false).length;

  const calculatedTotal = (Number(attack) || 0) + (Number(defense) || 0) + (Number(accuracy) || 0);

  return (
    <div className="space-y-6">
      {/* Hero Banner Minimalista */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Trophy className="h-3.5 w-3.5" />
              AlcatraZ & AlcatraZ2 • Raven 2
            </div>
            <h1 className="font-[var(--font-cinzel)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {t(locale, 'cpRankingTitle')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              {t(locale, 'cpRankingSubtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all gap-2"
              onClick={openSubmitModal}
            >
              <Upload className="h-5 w-5" />
              {t(locale, 'sendMyPrintBtn')}
            </Button>
          </div>
        </div>

        {/* Dica de CTRL+V */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs text-muted-foreground backdrop-blur-sm">
          <span className="inline-flex items-center gap-1 rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[11px] font-bold text-primary">
            {t(locale, 'ctrlVBadge')}
          </span>
          <span>
            {t(locale, 'ctrlVPasteTip')}
          </span>
        </div>

        {/* Info do Usuário Conectado */}
        {myPlayer && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary">
                {myPlayer.nickname?.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-muted-foreground">{t(locale, 'myCharacter')} </span>
                <strong className="text-foreground text-sm">{myPlayer.nickname}</strong>
                <span className="ml-2 text-primary font-semibold">({playerClassLabel(myPlayer.class, locale)})</span>
                <Badge tone={myPlayer.guildName === 'AlcatraZ2' ? 'blue' : 'gold'} className="ml-2 text-[10px]">
                  🏰 {myPlayer.guildName ?? 'AlcatraZ'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">{t(locale, 'myOfficialCp')} </span>
                <strong className="text-emerald-400 text-sm">
                  {(myPlayer.combatPower ?? 0) > 0 ? (myPlayer.combatPower ?? 0).toLocaleString('pt-BR') : t(locale, 'waitingPrint')}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seletor de Guildas (AlcatraZ vs AlcatraZ2) + Alternador Staff */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-card/80 border border-white/10 rounded-xl backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSelectedGuild('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedGuild === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            🏰 {t(locale, 'allGuilds')} ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGuild('AlcatraZ')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedGuild === 'AlcatraZ'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-white/5'
            }`}
          >
            ⚔️ AlcatraZ ({alcatrazCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGuild('AlcatraZ2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedGuild === 'AlcatraZ2'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-purple-300/80 hover:text-purple-200 hover:bg-white/5'
            }`}
          >
            🛡️ AlcatraZ2 ({alcatraz2Count})
          </button>
        </div>

        {/* Filtro Staff para ver membros inativos/removidos */}
        {isStaff && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer bg-card/60 border border-white/10 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t(locale, 'viewInactiveMembers')} ({inactiveCount})</span>
            </label>
          </div>
        )}
      </div>

      {/* Barra de Filtro de Classes */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-card/60 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <Button
            size="sm"
            variant={selectedClass === 'ALL' ? 'primary' : 'ghost'}
            className="text-xs font-semibold h-8"
            onClick={() => setSelectedClass('ALL')}
          >
            {t(locale, 'allClasses')} ({members.length})
          </Button>
          {RAVEN2_CLASSES.map((cls) => {
            const count = members.filter((m) => m.class === cls).length;
            if (count === 0 && selectedClass !== cls) return null;
            return (
              <Button
                key={cls}
                size="sm"
                variant={selectedClass === cls ? 'primary' : 'ghost'}
                className="text-xs font-semibold h-8 whitespace-nowrap"
                onClick={() => setSelectedClass(cls)}
              >
                {playerClassLabel(cls, locale)} ({count})
              </Button>
            );
          })}
        </div>

        <span className="text-xs text-muted-foreground">
          {t(locale, 'showingPlayersPrefix')} <strong>{filtered.length}</strong> {t(locale, 'showingPlayersSuffix')}
        </span>
      </div>

      {/* Tabela Limpa de Ranking */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 w-16 text-center">{t(locale, 'tableRank')}</th>
                <th className="py-3 px-4">{t(locale, 'tableCharacter')}</th>
                <th className="py-3 px-4 text-center">{t(locale, 'tableGuild')}</th>
                <th className="py-3 px-4">{t(locale, 'tableClass')}</th>
                <th className="py-3 px-4 text-center">{t(locale, 'tableAttack')}</th>
                <th className="py-3 px-4 text-center">{t(locale, 'tableDefense')}</th>
                <th className="py-3 px-4 text-center">{t(locale, 'tableAccuracy')}</th>
                <th className="py-3 px-4 text-center font-extrabold text-foreground">{t(locale, 'tableTotalCp')}</th>
                <th className="py-3 px-4 text-right">{t(locale, 'tableProof')}</th>
                {isStaff && <th className="py-3 px-4 text-center">{t(locale, 'tableStaffActions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filtered.map((member) => {
                const isTop1 = member.rank === 1 && member.isActive !== false;
                const isTop3 = member.rank <= 3 && member.isActive !== false;
                const isInactive = member.isActive === false;

                return (
                  <tr
                    key={member.id}
                    className={`transition-colors hover:bg-white/[0.03] group ${
                      isInactive ? 'opacity-50 bg-red-950/10' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {isInactive ? (
                        <span className="text-red-400 text-xs font-semibold">✕</span>
                      ) : isTop1 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-xs shadow-md">
                          👑
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/15 border border-primary/40 text-primary font-bold text-xs">
                          {member.rank}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-semibold">
                          {member.rank}
                        </span>
                      )}
                    </td>

                    {/* Nickname */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {member.nickname}
                        {member.discordUser && (
                          <span className="text-[10px] text-muted-foreground/60 font-normal">
                            ({member.discordUser})
                          </span>
                        )}
                        {isInactive && (
                          <Badge tone="red" className="text-[9px] py-0">
                            {t(locale, 'leftGuildBadge')}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Guilda */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        tone={member.guildName === 'AlcatraZ2' ? 'blue' : 'gold'}
                        className="text-[10px] font-bold py-0.5"
                      >
                        {member.guildName === 'AlcatraZ2' ? '🛡️ AlcatraZ2' : '⚔️ AlcatraZ'}
                      </Badge>
                    </td>

                    {/* Classe */}
                    <td className="py-3.5 px-4">
                      <Badge tone="blue" className="text-[11px] py-0.5">
                        {playerClassLabel(member.class, locale)}
                      </Badge>
                    </td>

                    {/* Atributos Lidos */}
                    <td className="py-3.5 px-4 text-center font-semibold text-muted-foreground">
                      {member.attack ? member.attack.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-muted-foreground">
                      {member.defense ? member.defense.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-muted-foreground">
                      {member.accuracy ? member.accuracy.toLocaleString('pt-BR') : '-'}
                    </td>

                    {/* CP Total */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-base text-emerald-400">
                        {member.combatPower > 0 ? member.combatPower.toLocaleString('pt-BR') : '-'}
                      </span>
                    </td>

                    {/* Print */}
                    <td className="py-3.5 px-4 text-right">
                      {member.lastProofUrl ? (
                        <button
                          type="button"
                          onClick={() => setZoomProofUrl(member.lastProofUrl!)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline hover:text-primary/80 font-semibold"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                          {t(locale, 'viewProof')}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </td>

                    {/* Ações da Staff */}
                    {isStaff && (
                      <td className="py-3.5 px-4 text-center">
                        {isInactive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2 text-xs gap-1"
                            onClick={() => handleReactivate(member)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {t(locale, 'reactivateMember')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2 text-xs gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setRemoveTarget(member);
                              setRemoveReason('Saiu da guilda');
                            }}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            {t(locale, 'removeMember')}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {!ranking.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isStaff ? 10 : 9} className="py-12 text-center text-muted-foreground text-sm">
                    {t(locale, 'noPlayersFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Popup de Confirmação de Remoção de Membro (Staff) */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-500/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <UserMinus className="h-5 w-5" />
                <h3 className="text-lg font-bold text-foreground">{t(locale, 'removeMemberModalTitle')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {t(locale, 'removeMemberModalDesc').replace('{name}', removeTarget.nickname)}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{t(locale, 'removeReasonLabel')}</label>
              <Input
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder={t(locale, 'removeReasonPlaceholder')}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={isRemoving}>
                {t(locale, 'cancel')}
              </Button>
              <Button
                variant="danger"
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
              >
                {isRemoving ? t(locale, 'removingBtn') : t(locale, 'confirmRemovalBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Popup Simples de Envio de Status */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t(locale, 'modalUpdateStatusTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t(locale, 'modalUpdateStatusDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Guilda (AlcatraZ vs AlcatraZ2) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">{t(locale, 'guildDivisionLabel')}</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGuild('AlcatraZ')}
                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition-all ${
                      guild === 'AlcatraZ'
                        ? 'border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-md ring-1 ring-amber-500/50'
                        : 'border-white/10 bg-card/60 hover:bg-white/5 text-muted-foreground'
                    }`}
                  >
                    {t(locale, 'guildAlcatrazMain')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuild('AlcatraZ2')}
                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition-all ${
                      guild === 'AlcatraZ2'
                        ? 'border-purple-500/80 bg-purple-500/20 text-purple-300 shadow-md ring-1 ring-purple-500/50'
                        : 'border-white/10 bg-card/60 hover:bg-white/5 text-muted-foreground'
                    }`}
                  >
                    {t(locale, 'guildAlcatrazSecondary')}
                  </button>
                </div>
              </div>

              {/* Nick & Classe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{t(locale, 'charNameLabel')}</label>
                  <Input
                    placeholder={t(locale, 'charNamePlaceholder')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{t(locale, 'charClassLabel')}</label>
                  <select
                    value={charClass}
                    onChange={(e) => setCharClass(e.target.value as PlayerClass)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {RAVEN2_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {playerClassLabel(cls, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload do Print com OCR */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">
                  {t(locale, 'hudPrintLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <label
                    className={`flex-1 flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isDragging
                        ? 'border-primary bg-primary/20 scale-[1.01]'
                        : 'border-primary/35 hover:border-primary/70 hover:bg-primary/5 bg-background/30'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
                      if (file) {
                        notifyToast({ title: t(locale, 'toastPrintDroppedTitle'), description: t(locale, 'toastPrintDroppedDesc'), tone: 'success' });
                        handleFileUpload(file);
                      }
                    }}
                  >
                    <Camera className="h-6 w-6 text-primary mb-1.5" />
                    <span className="text-xs font-semibold text-foreground text-center">
                      {uploading
                        ? t(locale, 'uploadingImg')
                        : scanning
                        ? t(locale, 'readingOcr')
                        : proofUrl
                        ? t(locale, 'changePrint')
                        : t(locale, 'clickToSelectOrPaste')}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {t(locale, 'ctrlVBadge')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t(locale, 'pasteOrDrag')}</span>
                    </div>
                    <input
                      id="status-print-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading || scanning}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {proofUrl && (
                    <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-primary/40 bg-black">
                      <img src={proofUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Atributos (Ataque, Defesa, Precisão) */}
              <div className="rounded-xl border border-white/10 bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  {t(locale, 'statsBoxTitle')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">{t(locale, 'attrAttackLabel')}</label>
                    <Input
                      type="number"
                      placeholder="Ex: 303"
                      value={attack}
                      onChange={(e) => setAttack(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">{t(locale, 'attrDefenseLabel')}</label>
                    <Input
                      type="number"
                      placeholder="Ex: 313"
                      value={defense}
                      onChange={(e) => setDefense(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">{t(locale, 'attrAccuracyLabel')}</label>
                    <Input
                      type="number"
                      placeholder="Ex: 456"
                      value={accuracy}
                      onChange={(e) => setAccuracy(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{t(locale, 'calculatedCpSum')}</span>
                  <strong className="text-emerald-400 font-extrabold text-base">
                    {calculatedTotal.toLocaleString('pt-BR')} CP
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                {t(locale, 'cancel')}
              </Button>
              <Button
                className="bg-primary text-primary-foreground font-bold px-6"
                disabled={uploading || scanning || createProgress.isPending || !proofUrl}
                onClick={handleSubmit}
              >
                {createProgress.isPending ? t(locale, 'submitting') : t(locale, 'saveAndSubmitToStaff')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Visualizador de Print Ampliado */}
      {zoomProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomProofUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={zoomProofUrl} alt="Comprovante" className="max-h-[85vh] w-auto rounded-lg border border-white/20 object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setZoomProofUrl(null)}
              className="absolute -top-3 -right-3 rounded-full bg-primary text-primary-foreground p-1 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
