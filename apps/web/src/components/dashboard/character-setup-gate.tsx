'use client';

import { useState, useId, useMemo, useEffect } from 'react';
import { ShieldAlert, Sparkles, CheckCircle2, Globe, Swords, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notifyToast } from '@/components/ui/toaster';
import { useMyHistory, useUpdatePlayerProfile, useUpdatePreferences } from '@/hooks/use-profile-api';
import { playerClassLabel } from '@/lib/game-labels';
import { useLocaleStore, type Locale } from '@/store/locale-store';
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

const I18N = {
  pt: {
    kicker: 'Configuração Obrigatória de Personagem',
    title: 'Identifique seu Personagem no Raven 2',
    description:
      'Você entrou com o seu login do Discord. Para que a guilda registre sua presença em bosses, distribua loot e compute seus DKP corretamente, você deve informar o nome e a classe do seu personagem dentro do jogo.',
    langPrompt: 'Selecione o seu idioma de preferência:',
    nickLabel: 'Nick do Personagem no Raven 2',
    nickPlaceholder: 'Ex: RavenStriker (exatamente como no jogo)',
    nickHint: 'Digite o nome do seu personagem no Raven 2 (pode ser igual ao seu nick do Discord).',
    nickDiscordError: 'O nick não pode ser o seu ID numérico do Discord.',
    nickLengthError: 'O nick deve ter entre 2 e 32 caracteres.',
    classLabel: 'Selecione a sua Classe no Raven 2',
    classHint: 'Escolha a classe principal que você joga na guilda.',
    layerLabel: 'Camada Dimensional Inicial',
    layerHint: 'Camada atual da sua conta no jogo (se não souber, mantenha 1).',
    submitBtn: 'Confirmar Personagem & Entrar',
    savingBtn: 'Salvando dados...',
    successTitle: 'Personagem configurado com sucesso!',
    successDesc: 'Bem-vindo à guilda! Seu painel foi liberado.',
    discordIdent: 'Conectado via Discord:',
  },
  en: {
    kicker: 'Mandatory Character Setup',
    title: 'Identify Your Raven 2 Character',
    description:
      'You logged in with your Discord account. In order for the guild to track boss attendance, distribute loot and calculate DKP accurately, you must set your in-game character name and class.',
    langPrompt: 'Select your preferred language:',
    nickLabel: 'Raven 2 Character Name (In-Game)',
    nickPlaceholder: 'e.g. RavenStriker (exact in-game name)',
    nickHint: 'Enter your in-game character name in Raven 2 (it can match your Discord nickname).',
    nickDiscordError: 'Character name cannot be your Discord numeric ID.',
    nickLengthError: 'Character name must be between 2 and 32 characters.',
    classLabel: 'Select your Raven 2 Class',
    classHint: 'Choose the main class you play in the guild.',
    layerLabel: 'Initial Dimensional Layer',
    layerHint: 'Your account dimensional layer (leave as 1 if unsure).',
    submitBtn: 'Confirm Character & Enter System',
    savingBtn: 'Saving profile...',
    successTitle: 'Character configured successfully!',
    successDesc: 'Welcome to the guild! Your dashboard is now unlocked.',
    discordIdent: 'Logged in as Discord user:',
  },
  es: {
    kicker: 'Configuración Obligatoria de Personaje',
    title: 'Identifica tu Personaje en Raven 2',
    description:
      'Iniciaste sesión con tu cuenta de Discord. Para que la hermandad registre tu asistencia a jefes, reparta botín y calcule DKP correctamente, debes configurar el nombre y la clase de tu personaje en el juego.',
    langPrompt: 'Selecciona tu idioma de preferencia:',
    nickLabel: 'Nombre del Personaje en Raven 2',
    nickPlaceholder: 'Ej: RavenStriker (exacto en el juego)',
    nickHint: 'Escribe el nombre de tu personaje en Raven 2 (puede ser igual a tu apodo en Discord).',
    nickDiscordError: 'El nombre del personaje no puede ser tu ID numérico de Discord.',
    nickLengthError: 'El nombre debe tener entre 2 y 32 caracteres.',
    classLabel: 'Selecciona tu Clase de Raven 2',
    classHint: 'Elige la clase principal con la que juegas en la hermandad.',
    layerLabel: 'Capa Dimensional Inicial',
    layerHint: 'Capa dimensional de tu cuenta (deja en 1 si no estás seguro).',
    submitBtn: 'Confirmar Personaje y Entrar',
    savingBtn: 'Guardando datos...',
    successTitle: '¡Personaje configurado con éxito!',
    successDesc: '¡Bienvenido a la hermandad! Tu panel ha sido desbloqueado.',
    discordIdent: 'Conectado como usuario de Discord:',
  },
};

export function CharacterSetupGate({ children }: { children: React.ReactNode }) {
  const history = useMyHistory();
  const updateProfile = useUpdatePlayerProfile();
  const updatePreferences = useUpdatePreferences();

  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const player = history.data?.player;
  const user = player?.user;

  // Verification if the user still has default Discord numeric ID or no class
  const needsInitialSetup = useMemo(() => {
    if (!player) return false;
    const playerNick = player.nickname?.trim() ?? '';
    const discordId = user?.discordId?.trim() ?? '';

    if (!playerNick) return true;
    if (discordId && playerNick === discordId) return true;
    if (/^\d{16,22}$/.test(playerNick)) return true;
    if (!player.class) return true;

    return false;
  }, [player, user]);

  const [inGameNick, setInGameNick] = useState('');
  const [selectedClass, setSelectedClass] = useState<PlayerClass>('VANGUARD');
  const [layer, setLayer] = useState<number>(1);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Sync initial state if available
  useEffect(() => {
    if (player) {
      if (player.class) setSelectedClass(player.class);
      if (player.dimensionalLayer) setLayer(player.dimensionalLayer);

      const pNick = player.nickname?.trim() ?? '';
      const dId = user?.discordId?.trim() ?? '';
      if (pNick && pNick !== dId && !/^\d{16,22}$/.test(pNick)) {
        setInGameNick(pNick);
      } else if (user?.discordNickname && !/^\d{16,22}$/.test(user.discordNickname)) {
        setInGameNick(user.discordNickname);
      } else if (user?.discordUsername && !/^\d{16,22}$/.test(user.discordUsername)) {
        setInGameNick(user.discordUsername);
      }
    }
  }, [player, user]);

  const texts = I18N[locale] ?? I18N.pt;

  // Validation: block if length is invalid or if it's the raw Discord numeric ID
  const trimmedNick = inGameNick.trim();
  const isTooShort = trimmedNick.length < 2;
  const isTooLong = trimmedNick.length > 32;
  const isDiscordId = useMemo(() => {
    if (!trimmedNick) return false;
    const discordId = user?.discordId?.trim();
    if (discordId && trimmedNick === discordId) return true;
    return /^\d{16,22}$/.test(trimmedNick);
  }, [trimmedNick, user]);

  const isValid = !isTooShort && !isTooLong && !isDiscordId;

  function handleLanguageChange(nextLocale: Locale) {
    setLocale(nextLocale);
    updatePreferences.mutate({ locale: nextLocale });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || updateProfile.isPending) return;

    updateProfile.mutate(
      {
        nickname: trimmedNick,
        class: selectedClass,
        dimensionalLayer: layer,
        locale,
      },
      {
        onSuccess: () => {
          updatePreferences.mutate({ locale });
          notifyToast({
            title: texts.successTitle,
            description: texts.successDesc,
            tone: 'success',
          });
        },
      },
    );
  }

  // If still loading or player is not active or nick is already valid, render children normally
  if (history.isLoading || !player || !needsInitialSetup) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Background content with deep blur */}
      <div className="pointer-events-none select-none opacity-20 filter blur-md" aria-hidden="true">
        {children}
      </div>

      {/* Mandatory Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-xl">
        <div className="relative my-auto w-full max-w-2xl rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl shadow-primary/20 sm:p-8 animate-in fade-in zoom-in-95">
          {/* Top Banner: Language Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Globe className="h-4 w-4" />
              <span>{texts.langPrompt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLanguageChange('pt')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  locale === 'pt'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                🇧🇷 PT-BR
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  locale === 'en'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('es')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  locale === 'es'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                🇪🇸 ES
              </button>
            </div>
          </div>

          {/* Modal Header */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{texts.kicker}</p>
            </div>
            <h2 className="mt-1 font-[var(--font-cinzel)] text-2xl font-bold text-foreground sm:text-3xl">
              {texts.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {texts.description}
            </p>

            {/* Discord Identity Info */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span>{texts.discordIdent}</span>
              <strong className="text-foreground">
                {user?.discordNickname ? `${user.discordNickname} (@${user.discordUsername})` : `@${user?.discordUsername}`}
              </strong>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Field 1: In-game Nickname */}
            <div>
              <label className="block text-sm font-semibold text-foreground">
                {texts.nickLabel} <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                value={inGameNick}
                onChange={(e) => {
                  setInGameNick(e.target.value);
                  setHasInteracted(true);
                }}
                placeholder={texts.nickPlaceholder}
                className={`mt-1.5 h-11 text-base ${
                  hasInteracted && !isValid ? 'border-red-500 focus:border-red-500' : 'border-primary/40'
                }`}
                autoFocus
              />

              {hasInteracted && isDiscordId && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  ⚠️ {texts.nickDiscordError}
                </p>
              )}

              {hasInteracted && !isDiscordId && (isTooShort || isTooLong) && (
                <p className="mt-1.5 text-xs text-amber-400">
                  ℹ️ {texts.nickLengthError}
                </p>
              )}

              {(!hasInteracted || isValid) && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {texts.nickHint}
                </p>
              )}
            </div>

            {/* Field 2: Raven 2 Class Selection */}
            <div>
              <label className="block text-sm font-semibold text-foreground">
                {texts.classLabel} <span className="text-red-400">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">{texts.classHint}</p>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RAVEN2_CLASSES.map((cls) => {
                  const isSelected = selectedClass === cls;
                  const label = playerClassLabel(cls, locale);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-semibold transition ${
                        isSelected
                          ? 'border-primary bg-primary/20 text-primary shadow-rune'
                          : 'border-white/10 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      <Swords className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="truncate">{label}</span>
                      {isSelected && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 3: Dimensional Layer */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  {texts.layerLabel}
                </label>
                <span className="text-xs font-bold text-primary">Camada {layer}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{texts.layerHint}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLayer(num)}
                    className={`h-9 w-9 rounded-md text-xs font-bold transition ${
                      layer === num
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-white/10 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-white/10">
              <Button
                type="submit"
                disabled={!isValid || updateProfile.isPending}
                className="w-full h-12 gap-2 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-rune"
              >
                <Sparkles className="h-5 w-5" />
                {updateProfile.isPending ? texts.savingBtn : texts.submitBtn}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
