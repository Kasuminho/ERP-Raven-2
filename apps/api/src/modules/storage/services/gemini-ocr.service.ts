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

    const prompt = `Você é um leitor óptico e especialista em Raven 2 (Netmarble).
Analise a imagem da tela de Storage / Baú da Guilda / Inventário do Raven 2 e extraia a lista exata de todos os itens exibidos.

Para cada linha/item detectado no print, retorne um objeto no array JSON com:
- "itemName": Nome exato em inglês ou português conforme aparece na tela (ex: "Rare Armor Crafting Blueprint Fragment", "Order of the Chain Crossbow", "Rebel's Cape", "Fighter's Cape", "Mirror of Harmony", "Mysterious Essence of Magic"). Não inclua números de quantidade dentro do nome.
- "quantity": Quantidade inteira exibida no canto inferior esquerdo do ícone do item (ex: se tem 11, 3, 2, 6, 12, retorne esse número inteiro. Se não há número visível no ícone, a quantidade é 1).
- "category": Grau/Raridade do item, IDENTIFICADA PELA COR DO TEXTO E DO ÍCONE:
  * "common" = texto Branco ou Cinza
  * "uncommon" = texto Verde
  * "rare" = texto Azul ou Ciano
  * "heroic" = texto Roxo ou Magenta
  * "legendary" = texto Dourado ou Laranja
- "itemType":
  * "WEAPON" para arcos, bestas, espadas, cajados, adagas, machados
  * "ARMOR" para armaduras, luvas, botas, elmos, calças
  * "ACCESSORY" para capas, anéis, colares, brincos, cintos
  * "CELESTIAL_STONE" para pedras celestiais ou gemas de aprimoramento
  * null se for fragmento, blueprint, material de craft, essência, poção ou livro
- "kind":
  * "material" se for fragmento, blueprint, essência, minério ou material
  * "skill" se for livro de habilidade
  * "equipment" se for capa, arma, armadura, acessório
- "acquisitionInfo": Texto da coluna 'Acquisition Info' se visível (ex: 'Defeat Gatekeeper Jade', 'Defeat Bewitching Soul Lilia'), ou null
- "acquisitionDate": Data da coluna 'Acquisition Date' se visível (ex: '2026-09-19 01:04:05'), ou null

Retorne APENAS um array JSON puro válido, sem markdown envolvente:
[
  {
    "itemName": "Rare Armor Crafting Blueprint Fragment",
    "quantity": 11,
    "category": "rare",
    "itemType": null,
    "kind": "material",
    "acquisitionInfo": "Defeat Gatekeeper Jade",
    "acquisitionDate": "2026-09-19 01:04:05"
  }
]`;

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
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

        if (Array.isArray(parsed)) {
          return parsed
            .map((item: any) => ({
              itemName: String(item.itemName || '').trim(),
              quantity:
                Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
                  ? Number(item.quantity)
                  : 1,
              category: String(item.category || 'common').toLowerCase(),
              itemType: item.itemType || null,
              kind: String(item.kind || 'equipment').toLowerCase(),
              acquisitionInfo: item.acquisitionInfo ? String(item.acquisitionInfo).trim() : undefined,
              acquisitionDate: item.acquisitionDate ? String(item.acquisitionDate).trim() : undefined,
            }))
            .filter((i: ScannedItemResult) => i.itemName.length > 0);
        }

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
