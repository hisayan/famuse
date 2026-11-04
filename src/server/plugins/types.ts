export interface PluginQuickAction {
  id: string;
  label: string;
  iconName: string;
  actionText: string;
}

export interface PluginStateMutation {
  key: string;
  value: unknown;
  timestamp: number;
}

export interface PluginMessageContext {
  sender: string;
  text: string;
  timestamp: number;
}

export interface PluginMessageResult {
  handled: boolean;
  stateMutations?: PluginStateMutation[];
  proactiveReply?: string;
}

export interface FamilyPlugin {
  id: string;
  name: string;
  description: string;
  version: string;

  /** Prompt fragment merged into the famuse system prompt. */
  systemPromptExtension: string;

  /** Action chips rendered above the message input. */
  quickActions: PluginQuickAction[];

  /** Channel ids where this plugin is active. Omit for every channel. */
  channels?: string[];

  /** Intercept inbound messages to mutate state or trigger side effects. */
  onMessageReceived?: (
    message: PluginMessageContext,
    storage: DurableObjectStorage,
  ) => Promise<PluginMessageResult | void>;

  /** Summary data for the UI context drawer. */
  getContextSummary?: (
    storage: DurableObjectStorage,
  ) => Promise<Record<string, unknown>>;
}
