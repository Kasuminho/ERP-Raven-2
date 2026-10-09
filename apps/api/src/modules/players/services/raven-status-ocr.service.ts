import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { GeminiOcrService } from '../../storage/services/gemini-ocr.service';

export interface RavenStatusOcrResult {
  success: boolean;
  level?: number;
  hp?: string;
  mp?: string;
  attack?: number;
  defense?: number;
  accuracy?: number;
  calculatedCp?: number;
  buffCount?: number;
  buffsDescription?: string;
  suspectedBuffsWarning?: string | null;
  notes?: string;
  rawError?: string;
}

@Injectable()
export class RavenStatusOcrService {
  private readonly logger = new Logger(RavenStatusOcrService.name);

  constructor(private readonly geminiOcrService: GeminiOcrService) {}

  async scanStatusPrint(imageSource: string | Buffer): Promise<RavenStatusOcrResult> {
    try {
      const { base64, mimeType } = await this.resolveImageBase64(imageSource);
      if (!base64) {
        return {
          success: false,
          rawError: 'Não foi possível carregar o buffer da imagem para processamento.',
        };
      }

      let apiKey = '';
      try {
        apiKey = await this.geminiOcrService.getApiKey();
      } catch (err: any) {
        this.logger.warn(`Chave Gemini não configurada para OCR de status: ${err.message}`);
        return {
          success: false,
          rawError: 'Chave Gemini API não configurada no sistema.',
        };
      }

      return await this.callGeminiStatusVision(base64, mimeType, apiKey);
    } catch (error: any) {
      this.logger.error(`Erro ao executar OCR de status do Raven 2: ${error.message}`, error.stack);
      return {
        success: false,
        rawError: error.message || 'Erro inesperado no OCR de status.',
      };
    }
  }

  private async resolveImageBase64(
    imageSource: string | Buffer,
  ): Promise<{ base64: string; mimeType: string }> {
    if (Buffer.isBuffer(imageSource)) {
      return {
        base64: imageSource.toString('base64'),
        mimeType: this.detectMimeType(imageSource),
      };
    }

    const trimmed = imageSource.trim();

    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem via URL: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        base64: buffer.toString('base64'),
        mimeType: response.headers.get('content-type') || this.detectMimeType(buffer),
      };
    }

    // Arquivo local
    const relativePath = trimmed.replace(/^\//, '');
    const localPath = join(process.cwd(), relativePath);
    if (existsSync(localPath)) {
      const buffer = readFileSync(localPath);
      return {
        base64: buffer.toString('base64'),
        mimeType: this.detectMimeType(buffer),
      };
    }

    throw new Error(`Arquivo de imagem não encontrado no caminho local: ${relativePath}`);
  }

  private detectMimeType(buffer: Buffer): string {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp';
    }
    return 'image/png';
  }

  private async callGeminiStatusVision(
    base64Data: string,
    mimeType: string,
    apiKey: string,
  ): Promise<RavenStatusOcrResult> {
    const prompt = `Você é um especialista em OCR e reconhecimento de interface (HUD) do jogo MMORPG Raven 2 (Netmarble).
Analise com máxima atenção a imagem da barra de status do jogador.

Elementos da interface do Raven 2:
1. Nível do jogador: Número grande dentro de um brasão azul/cinza à esquerda (ex: 66).
2. Barras de recursos superiores:
   - Barra Vermelha de Vida (HP): número atual e máximo (ex: 10,085 / 10,085).
   - Barra Azul de Mana (MP): número atual e máximo (ex: 985 / 985).
3. IMEDIATAMENTE ABAIXO DA BARRA AZUL DE MP, existem três conjuntos de ícones com números horizontais:
   - Primeiro número (Ícone de Espada / Poder de Ataque): ex: 303
   - Segundo número (Ícone de Escudo / Defesa): ex: 313
   - Terceiro número (Ícone de Estrela/Mira / Precisão ou Acerto): ex: 456
4. IMEDIATAMENTE ABAIXO DESSES 3 NÚMEROS, há uma fileira horizontal com ÍCONES DE BUFFS ativos (comidas, pergaminhos, poções, buffs de classe e de suporte).

REGRAS DE CÁLCULO:
- attack = valor numérico inteiro do primeiro ícone (espada)
- defense = valor numérico inteiro do segundo ícone (escudo)
- accuracy = valor numérico inteiro do terceiro ícone (estrela/mira)
- calculatedCp = attack + defense + accuracy (ex: 303 + 313 + 456 = 1072)
- buffCount = quantidade de ícones de buffs contados na barra horizontal inferior
- buffsDescription = breve resumo dos buffs visíveis

Retorne APENAS um objeto JSON puro, sem formatação markdown ou explicações:
{
  "success": true,
  "level": 66,
  "hp": "10,085/10,085",
  "mp": "985/985",
  "attack": 303,
  "defense": 313,
  "accuracy": 456,
  "calculatedCp": 1072,
  "buffCount": 14,
  "buffsDescription": "14 buffs ativos visíveis na barra inferior",
  "suspectedBuffsWarning": null,
  "notes": "Atributos lidos com sucesso abaixo da barra de MP."
}`;

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
                      data: base64Data,
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

        let parsed: any;
        try {
          parsed = JSON.parse(candidate);
        } catch {
          const cleanedText = candidate.replace(/^```json/m, '').replace(/```$/m, '').trim();
          parsed = JSON.parse(cleanedText);
        }

        const attack = Number(parsed.attack) || 0;
        const defense = Number(parsed.defense) || 0;
        const accuracy = Number(parsed.accuracy) || 0;
        const calculatedCp = attack + defense + accuracy;

        this.logger.log(
          `Gemini OCR (${model}): Attack=${attack}, Defense=${defense}, Accuracy=${accuracy} -> CP=${calculatedCp}`,
        );

        return {
          success: calculatedCp > 0,
          level: Number(parsed.level) || undefined,
          hp: parsed.hp ? String(parsed.hp) : undefined,
          mp: parsed.mp ? String(parsed.mp) : undefined,
          attack: attack || undefined,
          defense: defense || undefined,
          accuracy: accuracy || undefined,
          calculatedCp: calculatedCp > 0 ? calculatedCp : undefined,
          buffCount: Number(parsed.buffCount) || undefined,
          buffsDescription: parsed.buffsDescription ? String(parsed.buffsDescription) : undefined,
          suspectedBuffsWarning: parsed.suspectedBuffsWarning ? String(parsed.suspectedBuffsWarning) : null,
          notes: parsed.notes ? String(parsed.notes) : undefined,
        };
      } catch (err: any) {
        this.logger.warn(`Modelo ${model} falhou no OCR de status: ${err.message}`);
        lastError = err;
      }
    }

    return {
      success: false,
      rawError: lastError?.message || 'Falha ao processar print de status com os modelos Gemini disponíveis.',
    };
  }
}
