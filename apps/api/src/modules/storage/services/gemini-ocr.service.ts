import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

export interface ScannedItemResult {
  itemName: string;
  quantity: number;
  category: string;
  itemType?: 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'CELESTIAL_STONE' | null;
  kind?: string;
  acquisitionInfo?: string;
  acquisitionDate?: string;
  confidenceNotes?: string;
}

@Injectable()
export class GeminiOcrService {
  private readonly logger = new Logger(GeminiOcrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async hasConfiguredKey(): Promise<boolean> {
    if (process.env.GEMINI_API_KEY?.trim()) return true;

    const rule = await this.prisma.businessRule.findUnique({
      where: { key: 'geminiApiKey' },
    });
    const val = (rule?.value as { apiKey?: string })?.apiKey;
    return Boolean(val?.trim());
  }

  async getApiKey(overrideKey?: string): Promise<string> {
    if (overrideKey?.trim()) return overrideKey.trim();
    if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();

    const rule = await this.prisma.businessRule.findUnique({
      where: { key: 'geminiApiKey' },
    });
    const val = (rule?.value as { apiKey?: string })?.apiKey;
    if (val?.trim()) return val.trim();

    throw new BadRequestException(
      'Chave da API do Gemini não configurada. Defina a variável de ambiente GEMINI_API_KEY ou configure-a no modal do Baú.',
    );
  }

  async setApiKey(apiKey: string, actorId?: string): Promise<void> {
    const cleaned = apiKey.trim();
    if (!cleaned) throw new BadRequestException('A chave da API não pode ser vazia.');

    await this.prisma.businessRule.upsert({
      where: { key: 'geminiApiKey' },
      update: {
        value: { apiKey: cleaned, updatedAt: new Date().toISOString() },
        updatedById: actorId,
        isActive: true,
      },
      create: {
        key: 'geminiApiKey',
        category: 'integrations',
        label: 'Gemini API Key',
        description: 'Chave da API do Google Gemini para OCR no Baú da Guilda',
        value: { apiKey: cleaned, updatedAt: new Date().toISOString() },
        updatedById: actorId,
        isActive: true,
      },
    });
  }

  async scanBatch(
    images: Array<{ data: string; mimeType?: string }>,
    apiKeyOverride?: string,
  ): Promise<ScannedItemResult[]> {
    const apiKey = await this.getApiKey(apiKeyOverride);
    if (!images || images.length === 0) {
      throw new BadRequestException('Envie pelo menos um print para leitura.');
    }

    const aggregated: ScannedItemResult[] = [];

    // Process up to 3 images concurrently to be fast without hitting rate limits
    const chunkSize = 3;
    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map((img) => this.callGeminiVision(img.data, img.mimeType || 'image/png', apiKey)),
      );
      for (const res of chunkResults) {
        aggregated.push(...res);
      }
    }

    return aggregated;
  }

  private async callGeminiVision(base64Data: string, mimeType: string, apiKey: string): Promise<ScannedItemResult[]> {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();

    const prompt = `Você é um leitor óptico (OCR) e especialista no jogo MMORPG Raven 2 (Netmarble).
Analise a imagem da tela de Storage / Armazenamento / Baú da Guilda / Inventário do Raven 2 e extraia a lista exata de todos os itens exibidos.

Para cada linha/item detectado no print, retorne um objeto no array JSON com:
- "itemName": Nome exato em inglês ou português conforme aparece na tela (ex: "Fragmento de Blueprint de Criação de Armadura Rara", "Esfera Elemental do Clã dos Ladrões", "Fragmento de Blueprint de Criação de Armadura Heroica", "Grevas de Ferocidade", "Sangue do Profeta", "Besta do Batedor", "Capa Frio Intenso", "Fragmento de Projeto de Criação de Arma Rara", "Protetores de Mão do Night Stalker", "Lâmina de Égide da Selva", "Arco do Rebelde", "Pedra de Aprimoramento da Habilidade Incomum", "Rare Armor Crafting Blueprint Fragment"). NÃO inclua números de quantidade dentro do nome.
- "quantity": Quantidade inteira exibida no canto inferior do ícone do item (geralmente no canto inferior direito ou esquerdo; ex: se tem 2, 3, 4, 11, etc., retorne esse número inteiro. Se não há número visível no ícone, a quantidade é 1).
- "category": Grau/Raridade do item, IDENTIFICADA PELA COR DO TEXTO E DO ÍCONE:
  * "common" = texto Branco ou Cinza (ex: Besta do Batedor, Arco do Rebelde, Esfera Elemental)
  * "uncommon" = texto Verde (ex: Grevas de Ferocidade, Capa Frio Intenso, Lâmina de Égide da Selva, Pedra de Aprimoramento da Habilidade Incomum)
  * "rare" = texto Azul ou Ciano (ex: Fragmento de Blueprint de Criação de Armadura Rara, Sangue do Profeta, Fragmento de Projeto de Criação de Arma Rara)
  * "heroic" = texto Roxo ou Magenta (ex: Fragmento de Blueprint de Criação de Armadura Heroica, Protetores de Mão do Night Stalker)
  * "legendary" = texto Dourado, Amarelo ou Laranja
- "itemType":
  * "WEAPON" para arcos, bestas, espadas, cajados, adagas, machados, escudos
  * "ARMOR" para armaduras, luvas, botas, elmos, calças, grevas, protetores de mão
  * "ACCESSORY" para capas, anéis, colares, brincos, cintos
  * "CELESTIAL_STONE" para pedras celestiais ou gemas/pedras de aprimoramento
  * null se for fragmento, blueprint, projeto, material de craft, essência, sangue, poção ou livro
- "kind":
  * "material" se for fragmento, blueprint, projeto, essência, sangue, minério ou material
  * "skill" se for livro ou pedra de aprimoramento de habilidade
  * "equipment" se for capa, arma, armadura, acessório, grevas, luvas
- "acquisitionInfo": Texto da coluna 'Acquisition Info' / 'Info de Aquisição' se visível (ex: 'Defeat Gatekeeper Jade'), ou null
- "acquisitionDate": Data da coluna 'Acquisition Date' / 'Data de Aquisição' se visível (ex: '2026-09-19 01:04:05'), ou null

Retorne APENAS um array JSON puro válido ou objeto com a lista de itens, sem markdown envolvente:
[
  {
    "itemName": "Fragmento de Blueprint de Criação de Armadura Rara",
    "quantity": 3,
    "category": "rare",
    "itemType": null,
    "kind": "material",
    "acquisitionInfo": null,
    "acquisitionDate": null
  }
]`;

    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
    ];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType || 'image/png',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errBody}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidate) {
          throw new Error('Nenhuma resposta retornada pelo Gemini.');
        }

        // Parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(candidate);
        } catch {
          // Fallback if wrapped in markdown codeblock
          const cleanedText = candidate.replace(/^```json/m, '').replace(/```$/m, '').trim();
          parsed = JSON.parse(cleanedText);
        }

        // Handle both direct array and wrapped object ({ items: [...] }, { scannedItems: [...] })
        const rawList: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
            ? parsed.items
            : Array.isArray(parsed?.scannedItems)
              ? parsed.scannedItems
              : Array.isArray(parsed?.results)
                ? parsed.results
                : Array.isArray(parsed?.data)
                  ? parsed.data
                  : [];

        if (rawList.length > 0) {
          const mapped = rawList
            .map((item: any) => ({
              itemName: String(item.itemName || item.name || '').trim(),
              quantity:
                Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
                  ? Number(item.quantity)
                  : 1,
              category: String(item.category || item.rarity || 'common').toLowerCase(),
              itemType: item.itemType || null,
              kind: String(item.kind || 'equipment').toLowerCase(),
              acquisitionInfo: item.acquisitionInfo ? String(item.acquisitionInfo).trim() : undefined,
              acquisitionDate: item.acquisitionDate ? String(item.acquisitionDate).trim() : undefined,
            }))
            .filter((i: ScannedItemResult) => i.itemName.length > 0);

          this.logger.log(`Gemini OCR (${model}): detectou ${mapped.length} itens no print.`);
          return mapped;
        }

        this.logger.warn(`Modelo ${model} retornou lista vazia de itens.`);
        return [];
      } catch (err: any) {
        this.logger.warn(`Modelo ${model} falhou: ${err.message}`);
        lastError = err;
      }
    }

    throw new BadRequestException(
      `Falha ao processar print com o Gemini: ${lastError?.message || 'Erro de comunicação'}`,
    );
  }
}
