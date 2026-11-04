import type { Attachment, ChatMessage, OnlinePresence } from '../shared/types';
import type { ServerRoomEvent } from '../shared/room-events';
import {
  FAMUSE_SENDER_ID,
  FAMUSE_SENDER_NAME,
  buildSystemPrompt,
  mentionsFamuse,
} from './muse/persona';
import { generateAssistantReply, generateCatchUp } from './muse/assistant';
import {
  collectContextSummaries,
  pluginsForChannel,
  quickActionsForChannel,
  runPluginPipeline,
  systemPromptExtensionsForChannel,
} from './plugins/registry';
import {
  mirrorPetMutationsToD1,
  readPetSummary,
  type PetStatusSummary,
} from './plugins/pet';

export interface RoomConnectionState {
  memberId: string;
  memberName: string;
  householdId: string;
  householdName: string;
  userId: string;
}

export interface RoomMembership extends RoomConnectionState {}

export interface RoomIO {
  broadcast(event: ServerRoomEvent, excludeIds?: string[]): Promise<void>;
  send(event: ServerRoomEvent): Promise<void>;
}

export const RECENT_CACHE_KEY = 'room:recent';
export const RECENT_CACHE_LIMIT = 50;
export const AI_CONTEXT_LIMIT = 10;
export const CATCHUP_HISTORY_LIMIT = 20;

interface MessageRow {
  id: string;
  household_id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  is_ai: number;
  attachments: string | null;
  created_at: number;
}

interface MembershipRow {
  memberId: string;
  householdId: string;
  memberName: string;
  householdName: string;
}

function parseAttachments(raw: string | null): Attachment[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Attachment[]) : [];
  } catch {
    return [];
  }
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    text: row.text,
    isAi: row.is_ai === 1,
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at,
  };
}

export async function findMembership(
  db: D1Database,
  userId: string,
): Promise<RoomMembership | null> {
  const row = await db
    .prepare(
      `SELECT m.id AS memberId, m.household_id AS householdId, m.name AS memberName, h.name AS householdName
       FROM household_members m
       JOIN households h ON h.id = m.household_id
       WHERE m.user_id = ? LIMIT 1`,
    )
    .bind(userId)
    .first<MembershipRow>();
  if (!row) return null;
  return {
    memberId: row.memberId,
    memberName: row.memberName,
    householdId: row.householdId,
    householdName: row.householdName,
    userId,
  };
}

export async function insertMessageRow(
  db: D1Database,
  householdId: string,
  message: ChatMessage,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages (id, household_id, channel_id, sender_id, sender_name, text, is_ai, attachments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      message.id,
      householdId,
      message.channelId,
      message.senderId,
      message.senderName,
      message.text,
      message.isAi ? 1 : 0,
      message.attachments.length > 0 ? JSON.stringify(message.attachments) : null,
      message.createdAt,
    )
    .run();
}

export async function fetchRecentMessages(
  db: D1Database,
  householdId: string,
  channelId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const result = await db
    .prepare(
      `SELECT id, household_id, channel_id, sender_id, sender_name, text, is_ai, attachments, created_at
       FROM messages WHERE household_id = ? AND channel_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(householdId, channelId, limit)
    .all<MessageRow>();
  return (result.results ?? []).map(rowToMessage).reverse();
}

export async function readRecentCache(
  storage: DurableObjectStorage,
): Promise<ChatMessage[]> {
  const cached = await storage.get<unknown>(RECENT_CACHE_KEY);
  return Array.isArray(cached) ? (cached as ChatMessage[]) : [];
}

export async function appendRecentCache(
  storage: DurableObjectStorage,
  message: ChatMessage,
): Promise<ChatMessage[]> {
  const next = [...(await readRecentCache(storage)), message].slice(-RECENT_CACHE_LIMIT);
  await storage.put(RECENT_CACHE_KEY, next);
  return next;
}

export function buildPresence(
  connections: Iterable<{ state: unknown }>,
): OnlinePresence[] {
  const seen = new Map<string, string>();
  for (const connection of connections) {
    const state = connection.state as Partial<RoomConnectionState> | null | undefined;
    if (state && typeof state.memberId === 'string' && typeof state.memberName === 'string') {
      seen.set(state.memberId, state.memberName);
    }
  }
  return [...seen].map(([memberId, name]) => ({ memberId, name }));
}

async function persistAndBroadcastAiMessage(
  db: D1Database,
  storage: DurableObjectStorage,
  io: RoomIO,
  channelId: string,
  householdId: string,
  text: string,
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    channelId,
    senderId: FAMUSE_SENDER_ID,
    senderName: FAMUSE_SENDER_NAME,
    text,
    isAi: true,
    attachments: [],
    createdAt: Date.now(),
  };
  await insertMessageRow(db, householdId, message);
  await appendRecentCache(storage, message);
  await io.broadcast({ type: 'room.message.new', message });
  return message;
}

async function petSummaryForChannel(
  channelId: string,
  storage: DurableObjectStorage,
): Promise<PetStatusSummary | null> {
  const active = pluginsForChannel(channelId).some((plugin) => plugin.id === 'pet-care');
  if (!active) return null;
  try {
    return await readPetSummary(storage);
  } catch (error) {
    console.error('[famuse] Pet summary lookup failed.', error);
    return null;
  }
}

export interface IncomingUserMessage {
  id: string;
  text: string;
  attachments: Attachment[];
}

/**
 * Full inbound pipeline: persist, broadcast, run plugins, then answer
 * @famuse mentions. Plugin-handled messages skip the AI mention step so a
 * logged walk does not also trigger a second reply.
 */
export async function handleIncomingUserMessage(args: {
  db: D1Database;
  storage: DurableObjectStorage;
  io: RoomIO;
  env: Record<string, unknown>;
  channelId: string;
  membership: RoomMembership;
  input: IncomingUserMessage;
}): Promise<void> {
  const { db, storage, io, env, channelId, membership, input } = args;
  const createdAt = Date.now();
  const message: ChatMessage = {
    id: input.id,
    channelId,
    senderId: membership.memberId,
    senderName: membership.memberName,
    text: input.text,
    isAi: false,
    attachments: input.attachments,
    createdAt,
  };

  await insertMessageRow(db, membership.householdId, message);
  const recent = await appendRecentCache(storage, message);
  await io.broadcast({ type: 'room.message.new', message });

  const pluginResult = await runPluginPipeline(
    channelId,
    { sender: membership.memberName, text: input.text, timestamp: createdAt },
    storage,
  );
  if (pluginResult.mutations.length > 0) {
    for (const mutation of pluginResult.mutations) {
      await storage.put(mutation.key, mutation.value);
    }
    try {
      await mirrorPetMutationsToD1(db, membership.householdId, pluginResult.mutations);
    } catch (mirrorError) {
      console.error('[famuse] Pet event mirror to D1 failed.', mirrorError);
    }
    await io.broadcast({
      type: 'room.context.updated',
      summaries: await collectContextSummaries(channelId, storage),
    });
  }

  if (pluginResult.proactiveReply) {
    await persistAndBroadcastAiMessage(
      db,
      storage,
      io,
      channelId,
      membership.householdId,
      pluginResult.proactiveReply,
    );
    return;
  }

  if (mentionsFamuse(input.text)) {
    const history = recent
      .slice(0, -1)
      .slice(-AI_CONTEXT_LIMIT)
      .map((entry) => ({ senderName: entry.senderName, text: entry.text, isAi: entry.isAi }));
    const reply = await generateAssistantReply({
      env,
      systemPrompt: buildSystemPrompt(systemPromptExtensionsForChannel(channelId)),
      history,
      userText: `${membership.memberName}: ${input.text}`,
      localContext: {
        requestText: input.text,
        recentMessages: history,
        petSummary: await petSummaryForChannel(channelId, storage),
        householdName: membership.householdName,
      },
    });
    await persistAndBroadcastAiMessage(
      db,
      storage,
      io,
      channelId,
      membership.householdId,
      reply.text,
    );
  }
}

export async function handleCatchUpRequest(args: {
  db: D1Database;
  io: RoomIO;
  env: Record<string, unknown>;
  channelId: string;
  membership: RoomMembership;
}): Promise<void> {
  const { db, io, env, channelId, membership } = args;
  const history = await fetchRecentMessages(
    db,
    membership.householdId,
    channelId,
    CATCHUP_HISTORY_LIMIT,
  );
  const reply = await generateCatchUp({
    env,
    history,
    householdName: membership.householdName,
  });
  await io.send({ type: 'room.catchup.result', text: reply.text });
}

export async function buildContextPayload(
  channelId: string,
  storage: DurableObjectStorage,
): Promise<{ summaries: Record<string, unknown>; quickActions: ReturnType<typeof quickActionsForChannel> }> {
  return {
    summaries: await collectContextSummaries(channelId, storage),
    quickActions: quickActionsForChannel(channelId),
  };
}
