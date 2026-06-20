import { blocks } from './discord-formatting';

export type VoiceSeed = string | number | Date | undefined | null | false;

export function bilingualBlocks(copy: { 'pt-BR': string; en: string }): string {
  return blocks(
    `**PT-BR**\n${copy['pt-BR']}`,
    `**EN**\n${copy.en}`,
  );
}

export function pickVoiceLine<T extends string>(options: readonly T[], ...seedParts: VoiceSeed[]): T {
  if (options.length === 0) {
    throw new Error('Webhook voice options cannot be empty.');
  }

  const seed = seedParts
    .filter((value) => value !== undefined && value !== null && value !== false)
    .map((value) => value instanceof Date ? value.toISOString() : String(value))
    .join('|');

  let hash = 2166136261;

  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return options[(hash >>> 0) % options.length] ?? options[0];
}

export function pickBilingualVoice(
  copy: { 'pt-BR': readonly string[]; en: readonly string[] },
  ...seedParts: VoiceSeed[]
): string {
  return bilingualBlocks({
    'pt-BR': pickVoiceLine(copy['pt-BR'], ...seedParts, 'pt-BR'),
    en: pickVoiceLine(copy.en, ...seedParts, 'en'),
  });
}

export function pickStaffVoice(options: readonly string[], ...seedParts: VoiceSeed[]): string {
  return pickVoiceLine(options, ...seedParts);
}
