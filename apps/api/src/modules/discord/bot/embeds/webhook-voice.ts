import { blocks } from './discord-formatting';

export type VoiceSeed = string | number | Date | undefined | null | false;

export function bilingualBlocks(copy: { 'pt-BR': string; en: string }): string {
  return blocks(
    `**PT-BR**\n${copy['pt-BR']}`,
    `**EN**\n${copy.en}`,
  );
}

function buildVoiceSeed(seedParts: readonly VoiceSeed[]): string {
  return seedParts
    .filter((value) => value !== undefined && value !== null && value !== false)
    .map((value) => value instanceof Date ? value.toISOString() : String(value))
    .join('|');
}

function pickVoiceIndex(length: number, ...seedParts: VoiceSeed[]): number {
  if (length <= 0) {
    throw new Error('Webhook voice options cannot be empty.');
  }

  const seed = buildVoiceSeed(seedParts);

  let hash = 2166136261;

  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

export function pickVoiceLine<T extends string>(options: readonly T[], ...seedParts: VoiceSeed[]): T {
  if (options.length === 0) {
    throw new Error('Webhook voice options cannot be empty.');
  }

  return options[pickVoiceIndex(options.length, ...seedParts)] ?? options[0];
}

export function pickBilingualVoice(
  copy: { 'pt-BR': readonly string[]; en: readonly string[] },
  ...seedParts: VoiceSeed[]
): string {
  if (copy['pt-BR'].length > 0 && copy['pt-BR'].length === copy.en.length) {
    const index = pickVoiceIndex(copy['pt-BR'].length, ...seedParts);
    return bilingualBlocks({
      'pt-BR': copy['pt-BR'][index] ?? copy['pt-BR'][0],
      en: copy.en[index] ?? copy.en[0],
    });
  }

  return bilingualBlocks({
    'pt-BR': pickVoiceLine(copy['pt-BR'], ...seedParts, 'pt-BR'),
    en: pickVoiceLine(copy.en, ...seedParts, 'en'),
  });
}

export function pickStaffVoice(options: readonly string[], ...seedParts: VoiceSeed[]): string {
  return pickVoiceLine(options, ...seedParts);
}
