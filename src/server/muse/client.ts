/**
 * Minimal client for the Meta Model API (OpenAI-compatible Chat Completions).
 *
 * POST {baseUrl}/chat/completions with a Bearer MODEL_API_KEY. No SDK is
 * needed: the wire format matches the OpenAI Chat Completions API.
 */
export interface ModelApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface ModelChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelChatOptions {
  temperature?: number;
  maxTokens?: number;
  /**
   * Reasoning budget hint (e.g. 'low'). Muse Spark burns hundreds of
   * completion tokens on hidden reasoning per call; without room for it
   * the API returns `content: null` with `finish_reason: 'length'`.
   */
  reasoningEffort?: string;
}

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: { content?: string | Array<{ type?: string; text?: string }> };
  }>;
  error?: { message?: string };
}

export class MetaModelClient {
  private readonly config: ModelApiConfig;

  constructor(config: ModelApiConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
    };
  }

  async chat(messages: ModelChatTurn[], options: ModelChatOptions = {}): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw new Error(`Meta Model API request failed (HTTP ${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as ChatCompletionsResponse;
    const text = extractContent(payload);
    if (!text) {
      throw new Error('Meta Model API returned an empty reply.');
    }
    return text;
  }
}

function extractContent(payload: ChatCompletionsResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part?.text === 'string')
      .map((part) => part.text as string)
      .join('')
      .trim();
  }
  return '';
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ChatCompletionsResponse;
    const message = payload.error?.message?.trim();
    return message && message.length > 0 ? message.slice(0, 300) : response.statusText;
  } catch {
    return response.statusText || 'unknown error';
  }
}

/** Build a client config from worker env, or null when no API key is set. */
export function metaModelConfigFromEnv(env: Record<string, unknown>): ModelApiConfig | null {
  const apiKey = typeof env.MODEL_API_KEY === 'string' ? env.MODEL_API_KEY.trim() : '';
  if (!apiKey) return null;
  const baseUrl =
    typeof env.MODEL_API_BASE_URL === 'string' && env.MODEL_API_BASE_URL.trim()
      ? env.MODEL_API_BASE_URL.trim()
      : 'https://api.meta.ai/v1';
  const model =
    typeof env.MODEL_API_MODEL === 'string' && env.MODEL_API_MODEL.trim()
      ? env.MODEL_API_MODEL.trim()
      : 'muse-spark-1.3';
  const timeoutMs =
    typeof env.MODEL_API_TIMEOUT_MS === 'number' && Number.isFinite(env.MODEL_API_TIMEOUT_MS)
      ? env.MODEL_API_TIMEOUT_MS
      : 30000;
  return { apiKey, baseUrl, model, timeoutMs };
}
