export type RequestableItemDefinition = {
  key: string;
  aliases?: string[];
  namePt: string;
  nameEn: string;
  nameEs: string;
  category: string;
  typePt: string;
  typeEn: string;
  typeEs: string;
};

export const requestableItems: RequestableItemDefinition[] = [
  {
    key: 'mysterious essence of magic',
    namePt: 'Essencia Misteriosa de Magia',
    nameEn: 'Mysterious Essence of Magic',
    nameEs: 'Essencia Misteriosa de Mágico',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: 'dazzling mirror of harmony',
    namePt: 'Espelho Deslumbrante da Harmonia',
    nameEn: 'Dazzling Mirror of Harmony',
    nameEs: 'Espejo Deslumbrante de Armonía',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: 'burning eye of chaos',
    namePt: 'Olho Ardente do Caos',
    nameEn: 'Burning Eye of Chaos',
    nameEs: 'Ojo Ardiente del Caos',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: 'strong loop of perseverance',
    namePt: 'Anel Forte da Perseverança',
    nameEn: 'Strong Loop of Perseverance',
    nameEs: 'Anillo Fuerte de Perseverancia',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: "noble prophet's blood",
    namePt: 'Sangue do Nobre Profeta',
    nameEn: "Noble Prophet's Blood",
    nameEs: 'Sangre del Noble Profeta',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: 'shinning ancient tablet',
    namePt: 'Tabuleta Antiga Brilhante',
    nameEn: 'Shinning Ancient Tablet',
    nameEs: 'Tableta Antigua Brillante',
    category: 'relic',
    typePt: 'Reliquia',
    typeEn: 'Relic',
    typeEs: 'Reliquias',
  },
  {
    key: 'heroic weapon crafting blueprint fragment',
    namePt: 'Fragmento de Esquema de Criação de Arma Heroica',
    nameEn: 'Heroic Weapon Crafting Blueprint Fragment',
    nameEs: 'Fragmento de Plano de Creación de Arma Heroica',
    category: 'blueprint',
    typePt: 'Blueprint Heroico',
    typeEn: 'Heroic Blueprint',
    typeEs: 'Plano Heroico',
  },
  {
    key: 'heroic armor crafting blueprint fragment',
    namePt: 'Fragmento de Blueprint de Criação de Armadura Heroica',
    nameEn: 'Heroic Armor Crafting Blueprint Fragment',
    nameEs: 'Fragmento de Plano de Creación de Armadura Heroica',
    category: 'blueprint',
    typePt: 'Blueprint Heroico',
    typeEn: 'Heroic Blueprint',
    typeEs: 'Plano Heroico',
  },
  {
    key: 'heroic accessory crafting blueprint fragment',
    namePt: 'Fragmento de Planta de Criação de Acessório Heroico',
    nameEn: 'Heroic Accessory Crafting Blueprint Fragment',
    nameEs: 'Fragmento de Plano de Creación de Accesorio Heroica',
    category: 'blueprint',
    typePt: 'Blueprint Heroico',
    typeEn: 'Heroic Blueprint',
    typeEs: 'Plano Heroico',
  },
  {
    key: 'heroic skill crafting blueprint fragment',
    aliases: ['heroic skill book blueprint fragment'],
    namePt: 'Fragmento de Projeto de Criação de Livro de Habilidades Heroico',
    nameEn: 'Heroic Skill Book Blueprint Fragment',
    nameEs: 'Fragmento de Plano de Creación de Libro de habilidades Heroica',
    category: 'blueprint',
    typePt: 'Blueprint Heroico',
    typeEn: 'Heroic Blueprint',
    typeEs: 'Plano Heroico',
  },
  {
    key: 'creature of gaiety',
    namePt: 'Criatura da Felicidade',
    nameEn: 'Creature of Gaiety',
    nameEs: 'Criatura del regocijo',
    category: 'creature',
    typePt: 'Criatura',
    typeEn: 'Creature',
    typeEs: 'Criatura',
  },
  {
    key: 'elder dragon isteria',
    namePt: 'Dragão Ancião Isteria',
    nameEn: 'Elder Dragon Isteria',
    nameEs: 'Elder Dragon Isteria',
    category: 'creature',
    typePt: 'Criatura',
    typeEn: 'Creature',
    typeEs: 'Criatura',
  },
  {
    key: 'carnival queen',
    namePt: 'Rainha do Carnaval',
    nameEn: 'Carnival Queen',
    nameEs: 'Reina del Carnaval',
    category: 'creature',
    typePt: 'Criatura',
    typeEn: 'Creature',
    typeEs: 'Criatura',
  },
];

type RequestableCatalogLike = {
  category: string;
  namePt: string;
  nameEn: string;
  nameEs?: string | null;
};

const normalizeRequestableKey = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

const requestableItemLookup = new Map<string, RequestableItemDefinition>();

for (const item of requestableItems) {
  const keys = [item.key, item.namePt, item.nameEn, item.nameEs, ...(item.aliases ?? [])];

  for (const key of keys) {
    requestableItemLookup.set(`${item.category}:${normalizeRequestableKey(key)}`, item);
  }
}

export function getRequestableCatalogKey(item: RequestableCatalogLike): string {
  const match = [item.nameEn, item.namePt, item.nameEs]
    .map((name) => requestableItemLookup.get(`${item.category}:${normalizeRequestableKey(name)}`))
    .find(Boolean);

  return match?.key ?? normalizeRequestableKey(item.nameEn);
}

export const requestableItemKeys = new Set(requestableItems.flatMap((item) => [item.key, ...(item.aliases ?? [])]));
export const requestableItemCategories = new Set(requestableItems.map((item) => item.category));
