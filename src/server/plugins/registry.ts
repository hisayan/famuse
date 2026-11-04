import type {
  FamilyPlugin,
  PluginMessageContext,
  PluginMessageResult,
  PluginQuickAction,
  PluginStateMutation,
} from './types';
import { petPlugin } from './pet';

/** First-party plugin set. Append new family domains here to wire them in. */
export const FAMILY_PLUGINS: FamilyPlugin[] = [petPlugin];

/** Built-in chip that drops an @famuse mention into the composer. */
export const ASK_FAMUSE_ACTION: PluginQuickAction = {
  id: 'ask-famuse',
  label: '✨ Ask famuse',
  iconName: 'sparkles',
  actionText: '@famuse ',
};

export function pluginsForChannel(channelId: string): FamilyPlugin[] {
  return FAMILY_PLUGINS.filter(
    (plugin) => !plugin.channels || plugin.channels.includes(channelId),
  );
}

export function quickActionsForChannel(channelId: string): PluginQuickAction[] {
  const actions = pluginsForChannel(channelId).flatMap((plugin) => plugin.quickActions);
  return [...actions, ASK_FAMUSE_ACTION];
}

export function systemPromptExtensionsForChannel(channelId: string): string[] {
  return pluginsForChannel(channelId).map((plugin) => plugin.systemPromptExtension);
}

export async function collectContextSummaries(
  channelId: string,
  storage: DurableObjectStorage,
): Promise<Record<string, unknown>> {
  const summaries: Record<string, unknown> = {};
  for (const plugin of pluginsForChannel(channelId)) {
    if (!plugin.getContextSummary) continue;
    try {
      summaries[plugin.id] = await plugin.getContextSummary(storage);
    } catch (error) {
      console.error(`[famuse] Context summary failed for plugin ${plugin.id}.`, error);
    }
  }
  return summaries;
}

export interface PluginPipelineResult {
  handled: boolean;
  mutations: PluginStateMutation[];
  proactiveReply: string | null;
}

/**
 * Run every active plugin against an inbound message and aggregate the
 * outcome. The caller applies mutations and delivers the proactive reply.
 */
export async function runPluginPipeline(
  channelId: string,
  message: PluginMessageContext,
  storage: DurableObjectStorage,
): Promise<PluginPipelineResult> {
  const aggregated: PluginPipelineResult = { handled: false, mutations: [], proactiveReply: null };
  for (const plugin of pluginsForChannel(channelId)) {
    if (!plugin.onMessageReceived) continue;
    let result: PluginMessageResult | void;
    try {
      result = await plugin.onMessageReceived(message, storage);
    } catch (error) {
      console.error(`[famuse] Plugin ${plugin.id} failed on message.`, error);
      continue;
    }
    if (!result) continue;
    if (result.handled) aggregated.handled = true;
    if (result.stateMutations) aggregated.mutations.push(...result.stateMutations);
    if (result.proactiveReply && !aggregated.proactiveReply) {
      aggregated.proactiveReply = result.proactiveReply;
    }
  }
  return aggregated;
}
