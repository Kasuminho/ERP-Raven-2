export type DiscordLocale = 'pt-BR' | 'en';

const localeAliases: Record<string, DiscordLocale> = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  portuguese: 'pt-BR',
  en: 'en',
  'en-us': 'en',
  english: 'en',
};

const languageHints: Record<DiscordLocale, string[]> = {
  'pt-BR': [' voce ', ' leilao', ' atualiza', ' faltam', ' agora', ' guilda'],
  en: [' the ', ' you ', ' auction', ' update', ' hours', ' now', ' guild'],
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

export function localeCopy(_locale: DiscordLocale, copy: Record<DiscordLocale, string>): string {
  const shortCopy = copy['pt-BR'].length <= 60 && copy.en.length <= 60
    && !copy['pt-BR'].includes('\n') && !copy.en.includes('\n');

  if (shortCopy) {
    return `${copy['pt-BR']} / ${copy.en}`;
  }

  return `**PT-BR**\n${copy['pt-BR']}\n\n**EN**\n${copy.en}`;
}
