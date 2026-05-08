import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerateOptions,
  AIProvider,
  AIResult,
  AISchemaProperty,
} from './ai-provider.interface';

/**
 * Minimal HTTP client for Google Gemini's generateContent endpoint.
 *
 * We avoid pulling in @google/genai to keep the dependency tree small —
 * the REST API is stable, well documented, and trivial to call directly.
 *
 * Docs: https://ai.google.dev/api/generate-content
 */
@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly defaultModel: string;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string | undefined;
  private readonly endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env['GEMINI_API_KEY'];
    this.defaultModel =
      this.config.get<string>('AI_MODEL') || process.env['AI_MODEL'] || 'gemini-2.5-flash';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — AI features will be disabled');
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generateText(options: AIGenerateOptions): Promise<AIResult<string>> {
    const result = await this.callGemini(options, false);
    return { ...result, data: result.raw };
  }

  async generateStructured<T = unknown>(options: AIGenerateOptions): Promise<AIResult<T>> {
    if (!options.responseSchema) {
      throw new Error('generateStructured requires a responseSchema');
    }
    const result = await this.callGemini(options, true);
    let parsed: T;
    try {
      parsed = JSON.parse(result.raw) as T;
    } catch (err) {
      this.logger.error(`Failed to parse JSON from Gemini: ${result.raw.slice(0, 500)}`);
      throw new ServiceUnavailableException('AI returned malformed response');
    }
    return { ...result, data: parsed };
  }

  private async callGemini(
    options: AIGenerateOptions,
    structured: boolean,
  ): Promise<{ raw: string; model: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('AI provider not configured');
    }

    const model = options.model || this.defaultModel;
    const url = `${this.endpoint}/${encodeURIComponent(model)}:generateContent?key=${this.apiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    };
    if (structured && options.responseSchema) {
      generationConfig['responseMimeType'] = 'application/json';
      generationConfig['responseSchema'] = toGeminiSchema(options.responseSchema);
    }

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig,
    };
    if (options.system) {
      body['systemInstruction'] = {
        role: 'system',
        parts: [{ text: options.system }],
      };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Gemini network error: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI provider unreachable');
    }

    if (!res.ok) {
      const text = await safeText(res);
      this.logger.error(`Gemini HTTP ${res.status}: ${text.slice(0, 500)}`);
      if (res.status === 429) {
        throw new ServiceUnavailableException('AI provider rate-limited');
      }
      throw new ServiceUnavailableException('AI provider error');
    }

    const json = (await res.json()) as GeminiResponse;
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
    if (!text) {
      this.logger.warn(`Empty Gemini response: ${JSON.stringify(json).slice(0, 500)}`);
      throw new ServiceUnavailableException('AI returned empty response');
    }

    return {
      raw: text,
      model,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount,
        outputTokens: json.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Translate our generic schema to Gemini's expected schema dialect.
 * Gemini uses uppercase OpenAPI types (STRING, INTEGER, ...).
 */
function toGeminiSchema(s: AISchemaProperty): Record<string, unknown> {
  const typeMap: Record<string, string> = {
    string: 'STRING',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    array: 'ARRAY',
    object: 'OBJECT',
  };
  const out: Record<string, unknown> = { type: typeMap[s.type] || s.type.toUpperCase() };
  if (s.description) out['description'] = s.description;
  if (s.enum) out['enum'] = s.enum;
  if (s.nullable) out['nullable'] = true;
  if (s.items) out['items'] = toGeminiSchema(s.items);
  if (s.properties) {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.properties)) props[k] = toGeminiSchema(v);
    out['properties'] = props;
  }
  if (s.required) out['required'] = s.required;
  return out;
}
