'use client';

import { useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, Flame, Shield, Sparkles, Swords, Trophy, Upload, User, Users, X, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useGuildRanking, type GuildRankingMember } from '@/hooks/use-ranking-api';
import { useCreateProgress, useMyHistory, useUpdatePlayerProfile } from '@/hooks/use-profile-api';
import { playerClassLabel } from '@/lib/game-labels';
import { api } from '@/lib/api';
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
  const ranking = useGuildRanking();
  const profileHistory = useMyHistory();
  const updateProfile = useUpdatePlayerProfile();
  const createProgress = useCreateProgress();
  const locale = useLocaleStore((state) => state.locale);
  const authenticated = useAuthStore((state) => state.authenticated);

  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [zoomProofUrl, setZoomProofUrl] = useState<string | null>(null);

  // Form State
  const myPlayer = profileHistory.data?.player;
  const [nickname, setNickname] = useState('');
  const [charClass, setCharClass] = useState<PlayerClass>('BERSERKER');
  const [attack, setAttack] = useState('');
  const [defense, setDefense] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openSubmitModal() {
    if (myPlayer) {
      setNickname(myPlayer.nickname || '');
      setCharClass(myPlayer.class || 'BERSERKER');
    }
    setModalOpen(true);
  }

  // Upload e auto-OCR
  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>('/uploads/image', formData);
      const url = res.data.url;
      setProofUrl(url);
      notifyToast({ title: 'Print anexado!', tone: 'success' });

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
            title: `OCR detectou: ⚔️ ${ocrRes.data.attack} | 🛡️ ${ocrRes.data.defense} | 🎯 ${ocrRes.data.accuracy}`,
            tone: 'success',
          });
        }
      } catch {
        // OCR opcional
      } finally {
        setScanning(false);
      }
    } catch {
      notifyToast({ title: 'Erro ao subir print', tone: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const atk = Number(attack) || 0;
    const def = Number(defense) || 0;
    const acc = Number(accuracy) || 0;
    const totalCp = atk + def + acc;

    if (!proofUrl) {
      notifyToast({ title: 'Anexe o print da tela do jogo com seus status!', tone: 'error' });
      return;
    }

    if (totalCp <= 0) {
      notifyToast({ title: 'Preencha os valores de Ataque, Defesa e Precisão.', tone: 'error' });
      return;
    }

    // 1. Atualizar nick/classe se mudou
    if (myPlayer && (myPlayer.nickname !== nickname || myPlayer.class !== charClass)) {
      await updateProfile.mutateAsync({
        nickname: nickname.trim(),
        class: charClass,
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
          source: 'web_simple_form',
        },
      },
      {
        onSuccess: () => {
          notifyToast({
            title: 'Status enviado com sucesso!',
            description: 'A Staff irá conferir os buffs do print e aprovar para o ranking.',
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

  const members = ranking.data ?? [];
  const filtered = selectedClass === 'ALL'
    ? members
    : members.filter((m) => m.class === selectedClass);

  const calculatedTotal = (Number(attack) || 0) + (Number(defense) || 0) + (Number(accuracy) || 0);

  return (
    <div className="space-y-6">
      {/* Hero Banner Minimalista */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Trophy className="h-3.5 w-3.5" />
              Guild AlcatraZ • Raven 2
            </div>
            <h1 className="font-[var(--font-cinzel)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Ranking de Poder (CP)
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Simples e direto: envie o print do seu boneco com os 3 atributos (Ataque, Defesa e Precisão).
              A Staff valida os buffs e seu char entra direto no ranking oficial da guilda!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all gap-2"
              onClick={openSubmitModal}
            >
              <Upload className="h-5 w-5" />
              Enviar Meu Print / Atualizar CP
            </Button>
          </div>
        </div>

        {/* Info do Usuário Conectado */}
        {myPlayer && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary">
                {myPlayer.nickname?.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-muted-foreground">Meu Personagem: </span>
                <strong className="text-foreground text-sm">{myPlayer.nickname}</strong>
                <span className="ml-2 text-primary font-semibold">({playerClassLabel(myPlayer.class, locale)})</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Meu CP Oficial: </span>
                <strong className="text-emerald-400 text-sm">
                  {(myPlayer.combatPower ?? 0) > 0 ? (myPlayer.combatPower ?? 0).toLocaleString('pt-BR') : 'Aguardando Print'}
                </strong>
              </div>
            </div>
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
            Todas ({members.length})
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
          Mostrando <strong>{filtered.length}</strong> jogadores
        </span>
      </div>

      {/* Tabela Limpa de Ranking */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 w-16 text-center">#</th>
                <th className="py-3 px-4">Personagem</th>
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4 text-center">⚔️ Ataque</th>
                <th className="py-3 px-4 text-center">🛡️ Defesa</th>
                <th className="py-3 px-4 text-center">🎯 Precisão</th>
                <th className="py-3 px-4 text-center font-extrabold text-foreground">🔥 CP Total</th>
                <th className="py-3 px-4 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filtered.map((member) => {
                const isTop1 = member.rank === 1;
                const isTop3 = member.rank <= 3;
                return (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-white/[0.03] group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {isTop1 ? (
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
                      </div>
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
                          Ver Print
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!ranking.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    Nenhum jogador encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Popup Simples de Envio de Status */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Atualizar Meu Status</h3>
                <p className="text-xs text-muted-foreground">Preencha seus dados ou anexe o print para preencher automático.</p>
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
              {/* Nick & Classe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Nome do Char (Jogo)</label>
                  <Input
                    placeholder="Ex: RavenSniper"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Classe</label>
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
                  Print da HUD do Jogo (Barras de Vida/Mana + 3 Atributos + Buffs)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
                    <Camera className="h-6 w-6 text-primary mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      {uploading ? 'Enviando imagem...' : scanning ? 'Lendo status com OCR...' : proofUrl ? 'Trocar Print' : 'Clique para Anexar o Print'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPEG ou WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading || scanning}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
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
                  Atributos (Lidos pelo OCR ou Manuais)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">⚔️ Ataque</label>
                    <Input
                      type="number"
                      placeholder="Ex: 303"
                      value={attack}
                      onChange={(e) => setAttack(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">🛡️ Defesa</label>
                    <Input
                      type="number"
                      placeholder="Ex: 313"
                      value={defense}
                      onChange={(e) => setDefense(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">🎯 Precisão</label>
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
                  <span className="text-muted-foreground font-medium">Soma de CP Calculada:</span>
                  <strong className="text-emerald-400 font-extrabold text-base">
                    {calculatedTotal.toLocaleString('pt-BR')} CP
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-primary text-primary-foreground font-bold px-6"
                disabled={uploading || scanning || createProgress.isPending || !proofUrl}
                onClick={handleSubmit}
              >
                {createProgress.isPending ? 'Enviando...' : 'Salvar e Enviar para Staff'}
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
