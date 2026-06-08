import type { ItemCatalog, PlayerClass, ProgressCategory } from '@/types/api';
import type { Locale } from '@/store/locale-store';

export function itemName(item: Pick<ItemCatalog, 'namePt' | 'nameEn' | 'nameEs'> | undefined, locale: Locale, fallback = 'Item'): string {
  if (!item) return fallback;
  if (locale === 'en') return item.nameEn || item.namePt || fallback;
  if (locale === 'es') return item.nameEs || item.nameEn || item.namePt || fallback;
  return item.namePt || item.nameEn || fallback;
}

export function itemTypeName(item: Pick<ItemCatalog, 'typePt' | 'typeEn' | 'typeEs'> | undefined, locale: Locale, fallback = ''): string {
  if (!item) return fallback;
  if (locale === 'en') return item.typeEn || item.typePt || fallback;
  if (locale === 'es') return item.typeEs || item.typeEn || item.typePt || fallback;
  return item.typePt || item.typeEn || fallback;
}

export const progressCategoryLabels: Record<ProgressCategory, Record<Locale, string>> = {
  STELLAS_AMPLIFICATION: {
    pt: 'Stellas - Amplificação',
    en: 'Stellas-Amplification',
    es: 'Estelas - Amplificacion',
  },
  EQUIPMENT: {
    pt: 'Equipamentos',
    en: 'Equipments',
    es: 'Equipos',
  },
  RELICS: {
    pt: 'Reliquias',
    en: 'Relic',
    es: 'Reliquias',
  },
  STIGMA: {
    pt: 'Estigma',
    en: 'Stigma',
    es: 'Estigma',
  },
  ITEM_COLLECTION: {
    pt: 'Coleção de itens',
    en: 'Items Collections',
    es: 'Cocecciones de objetos',
  },
  SKILLS: {
    pt: 'Habilidade',
    en: 'Skill',
    es: 'Habilidad',
  },
  PARADISE_STONES: {
    pt: 'Pedra do Paraiso',
    en: 'Heaven Stone',
    es: 'Piedra Celestial',
  },
  STATUS: {
    pt: 'Status',
    en: 'Status',
    es: 'Status',
  },
  DIMENSIONAL_RIFT: {
    pt: 'Fenda Dimensional',
    en: 'Dimensional Rift',
    es: 'Fisura Dimensional',
  },
  RUNES: {
    pt: 'Runa',
    en: 'Runes',
    es: 'Runa',
  },
};

export const playerClassLabels: Record<PlayerClass, Record<Locale, string>> = {
  VANGUARD: {
    pt: 'Vanguardista',
    en: 'Vanguard',
    es: 'Adalid',
  },
  BERSERKER: {
    pt: 'Berserker',
    en: 'Berserker',
    es: 'Berserker',
  },
  DESTROYER: {
    pt: 'Destruidor',
    en: 'Destroyer',
    es: 'Destructor',
  },
  NIGHT_RANGER: {
    pt: 'Patrulheiro Noturno',
    en: 'Night Ranger',
    es: 'Explorador Nocturno',
  },
  ELEMENTALIST: {
    pt: 'Feiticeiro Elemental',
    en: 'Elementalist',
    es: 'Elementalista',
  },
  DIVINE_CASTER: {
    pt: 'Lançador Divino',
    en: 'Divine Caster',
    es: 'Invocador divino',
  },
  ASSASSIN: {
    pt: 'Assassino',
    en: 'Assassin',
    es: 'Asesino',
  },
  DEATHBRINGER: {
    pt: 'Portador da Morte',
    en: 'Deathbringer',
    es: 'Portador de la Muerte',
  },
  GUNSLINGER: {
    pt: 'Pistoleiro',
    en: 'Gunslinger',
    es: 'Pistolero',
  },
  WARLORD: {
    pt: 'Guerreiro',
    en: 'Warlord',
    es: 'Senor de la guerra',
  },
};

export function progressCategoryLabel(category: ProgressCategory, locale: Locale): string {
  return progressCategoryLabels[category]?.[locale] ?? category;
}

export function playerClassLabel(playerClass: PlayerClass | undefined, locale: Locale): string {
  return playerClass ? playerClassLabels[playerClass]?.[locale] ?? playerClass : '';
}
