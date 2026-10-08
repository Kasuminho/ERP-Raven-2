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
  espanol: 'es',
};

const languageHints: Record<DiscordLocale, string[]> = {
  'pt-BR': [' voce ', ' leilao', ' atualiza', ' faltam', ' agora', ' guilda'],
  en: [' the ', ' you ', ' auction', ' update', ' hours', ' now', ' guild'],
  es: [' usted ', ' subasta', ' actualiza', ' faltan', ' ahora', ' gremio'],
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

export function localeCopy(_locale: DiscordLocale, copy: Record<string, string>): string {
  const pt = copy['pt-BR'] || '';
  const en = copy.en || '';
  const es = copy.es;

  if (es) {
    const shortCopy = pt.length <= 40 && en.length <= 40 && es.length <= 40
      && !pt.includes('\n') && !en.includes('\n') && !es.includes('\n');

    if (shortCopy) {
      return `${pt} / ${en} / ${es}`;
    }

    const total = pt.length + en.length + es.length;
    if (total <= 1800) {
      return `**PT-BR**\n${pt}\n\n**EN**\n${en}\n\n**ES**\n${es}`;
    }
  }

  const shortCopy = pt.length <= 60 && en.length <= 60
    && !pt.includes('\n') && !en.includes('\n');

  if (shortCopy) {
    return `${pt} / ${en}`;
  }

  return `**PT-BR**\n${pt}\n\n**EN**\n${en}`;
}
