import { MetaModelClient, metaModelConfigFromEnv, type ModelChatTurn } from './client';
import {
  localAssistantReply,
  localCatchUp,
  type LocalAssistantContext,
} from './local-assistant';

export type AssistantSource = 'meta-model-api' | 'local';

export interface AssistantReply {
  text: string;
  source: AssistantSource;
}

export interface HistoryTurn {
  senderName: string;
  text: string;
  isAi: boolean;
}

export function historyToTurns(history: HistoryTurn[]): ModelChatTurn[] {
  return history.map((message) =>
    message.isAi
      ? { role: 'assistant' as const, content: message.text }
      : { role: 'user' as const, content: `${message.senderName}: ${message.text}` },
  );
}

export interface AssistantRequest {
  env: Record<string, unknown>;
  systemPrompt: string;
  history: HistoryTurn[];
  userText: string;
  localContext: LocalAssistantContext;
}

/**
 * Answer through the Meta Model API when a key is configured, otherwise
 * through the built-in local assistant. A failed API call also falls back
 * to the local assistant so the room never goes silent.
 */
export async function generateAssistantReply(request: AssistantRequest): Promise<AssistantReply> {
  const config = metaModelConfigFromEnv(request.env);
  if (!config) {
    return { text: localAssistantReply(request.localContext), source: 'local' };
  }
  try {
    const client = new MetaModelClient(config);
    const text = await client.chat(
      [
        { role: 'system', content: request.systemPrompt },
        ...historyToTurns(request.history),
        { role: 'user', content: request.userText },
      ],
      { reasoningEffort: 'low' },
    );
    return { text, source: 'meta-model-api' };
  } catch (error) {
    console.error('[famuse] Meta Model API call failed, using local assistant.', error);
    return { text: localAssistantReply(request.localContext), source: 'local' };
  }
}

export interface CatchUpRequest {
  env: Record<string, unknown>;
  history: Array<HistoryTurn & { createdAt: number }>;
  householdName: string;
}

export async function generateCatchUp(request: CatchUpRequest): Promise<AssistantReply> {
  const { CATCHUP_SYSTEM_PROMPT } = await import('./persona');
  const config = metaModelConfigFromEnv(request.env);
  if (!config) {
    return { text: localCatchUp(request.history, request.householdName), source: 'local' };
  }
  try {
    const client = new MetaModelClient(config);
    const transcript = request.history
      .map((message) => `${message.isAi ? 'famuse' : message.senderName}: ${message.text}`)
      .join('\n');
    const text = await client.chat(
      [
        { role: 'system', content: CATCHUP_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Summarize this ${request.householdName} chat so I can catch up:\n\n${transcript}`,
        },
      ],
      { maxTokens: 2000, reasoningEffort: 'low' },
    );
    return { text, source: 'meta-model-api' };
  } catch (error) {
    console.error('[famuse] Catch-up call failed, using local summary.', error);
    return { text: localCatchUp(request.history, request.householdName), source: 'local' };
  }
}
