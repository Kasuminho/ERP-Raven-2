export type DiscordLocale = 'pt-BR' | 'en' | 'es';

const localeAliases: Record<string, DiscordLocale> = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  portuguese: 'pt-BR',
  en: 'en',
  'en-us': 'en',
  english: 'en',
  es: 'es',
  'es-es': 'es',
  spanish: 'es',
};

const languageHints: Record<DiscordLocale, string[]> = {
  'pt-BR': [' voce ', ' leilao', ' atualiza', ' faltam', ' agora', ' guilda'],
  en: [' the ', ' you ', ' auction', ' update', ' hours', ' now', ' guild'],
  es: [' subasta', ' actualiza', ' faltan', ' ahora', ' gremio', ' jugador'],
};

export function normalizeDiscordLocale(value?: string | null): DiscordLocale | undefined {
  return value ? localeAliases[value.trim().toLowerCase()] : undefined;
}

export function resolveDiscordLocale(configured: string | undefined, ...context: Array<string | null | undefined>): DiscordLocale {
  const explicit = normalizeDiscordLocale(configured);

  if (explicit) return explicit;

  const text = ` ${context.filter(Boolean).join(' ').toLowerCase()} `;
  const scores = (Object.keys(languageHints) as DiscordLocale[]).map((locale) => ({
    locale,
    score: languageHints[locale].reduce((total, hint) => total + (text.includes(hint) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  return scores[0].score > 0 ? scores[0].locale : 'pt-BR';
}

export function localeCopy(locale: DiscordLocale, copy: Record<DiscordLocale, string>): string {
  return copy[locale];
}
