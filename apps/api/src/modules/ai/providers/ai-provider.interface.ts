/**
 * Schema describing the shape of structured output we expect from the LLM.
 * We accept a JSON-schema-compatible subset (used by both Gemini and OpenAI).
 */
export interface AISchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: AISchemaProperty;
  properties?: Record<string, AISchemaProperty>;
  required?: string[];
  nullable?: boolean;
}

export interface AIGenerateOptions {
  /** System / role instructions */
  system?: string;
  /** Main user prompt (already formatted) */
  prompt: string;
  /** When provided, the provider must return JSON matching this schema. */
  responseSchema?: AISchemaProperty;
  /** Optional override of model id */
  model?: string;
  /** 0..1 — lower = more deterministic. Default 0.3. */
  temperature?: number;
  /** Hard cap on output tokens. Default 1024. */
  maxOutputTokens?: number;
}

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIResult<T = unknown> {
  data: T;
  raw: string;
  model: string;
  usage?: AIUsage;
}

export interface AIProvider {
  /** Provider identifier, e.g. 'gemini'. */
  readonly name: string;
  /** Default model used when no override is provided. */
  readonly defaultModel: string;
  /** Whether the provider has been configured (API key present). */
  isAvailable(): boolean;
  /** Free-form text generation. */
  generateText(options: AIGenerateOptions): Promise<AIResult<string>>;
  /** Structured JSON generation. */
  generateStructured<T = unknown>(options: AIGenerateOptions): Promise<AIResult<T>>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
