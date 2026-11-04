import { formatClockTime, formatElapsedShort } from '../../shared/format';
import type { FamilyPlugin, PluginMessageResult, PluginStateMutation } from './types';

export const PET_STORAGE_KEYS = {
  lastWalk: 'pet:buddy:last_walk',
  lastFed: 'pet:buddy:last_fed',
  lastPotty: 'pet:buddy:last_potty',
} as const;

export type PetEventKind = 'walk' | 'fed' | 'potty';

export const PET_KEY_TO_KIND: Record<string, PetEventKind> = {
  [PET_STORAGE_KEYS.lastWalk]: 'walk',
  [PET_STORAGE_KEYS.lastFed]: 'fed',
  [PET_STORAGE_KEYS.lastPotty]: 'potty',
};

const WALK_ALERT_AFTER_MS = 8 * 60 * 60_000;
const FED_ALERT_AFTER_MS = 10 * 60 * 60_000;

export interface PetEventState {
  timestamp: number;
  memberName: string;
  note?: string;
}

export interface PetEventSummary extends PetEventState {
  display: string;
}

export interface PetStatusSummary {
  lastWalk: PetEventSummary;
  lastFed: PetEventSummary;
  lastPotty: PetEventSummary;
  alerts: string[];
}

export function isPetEventState(value: unknown): value is PetEventState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.memberName === 'string'
  );
}

/** Seed plausible first-run values so the drawer is useful immediately. */
export function defaultPetState(now: number): Record<string, PetEventState> {
  return {
    [PET_STORAGE_KEYS.lastWalk]: { timestamp: now - 9 * 60 * 60_000, memberName: 'Dad' },
    [PET_STORAGE_KEYS.lastFed]: { timestamp: now - 3 * 60 * 60_000, memberName: 'Mom' },
    [PET_STORAGE_KEYS.lastPotty]: { timestamp: now - 60 * 60_000, memberName: 'Dad' },
  };
}

export function summarizePetEvents(
  events: { walk: PetEventState; fed: PetEventState; potty: PetEventState },
  now: number,
): PetStatusSummary {
  const alerts: string[] = [];
  if (now - events.walk.timestamp > WALK_ALERT_AFTER_MS) {
    alerts.push(
      `Buddy hasn't been walked in ${formatElapsedShort(events.walk.timestamp, now)} — he is doing the stare.`,
    );
  }
  if (now - events.fed.timestamp > FED_ALERT_AFTER_MS) {
    alerts.push(
      `Buddy hasn't eaten in ${formatElapsedShort(events.fed.timestamp, now)} — dinner time?`,
    );
  }
  return {
    lastWalk: {
      ...events.walk,
      display: `Last walked ${formatElapsedShort(events.walk.timestamp, now)} by ${events.walk.memberName}`,
    },
    lastFed: {
      ...events.fed,
      display: `Last fed ${formatElapsedShort(events.fed.timestamp, now)} by ${events.fed.memberName}`,
    },
    lastPotty: {
      ...events.potty,
      display: `Last potty ${formatElapsedShort(events.potty.timestamp, now)} by ${events.potty.memberName}`,
    },
    alerts,
  };
}

export async function readPetEvent(
  storage: DurableObjectStorage,
  key: string,
  fallback: PetEventState,
): Promise<PetEventState> {
  const stored = await storage.get<unknown>(key);
  if (isPetEventState(stored)) return stored;
  await storage.put(key, fallback);
  return fallback;
}

export async function readPetSummary(storage: DurableObjectStorage): Promise<PetStatusSummary> {
  const now = Date.now();
  const defaults = defaultPetState(now);
  const [walk, fed, potty] = await Promise.all([
    readPetEvent(storage, PET_STORAGE_KEYS.lastWalk, defaults[PET_STORAGE_KEYS.lastWalk]),
    readPetEvent(storage, PET_STORAGE_KEYS.lastFed, defaults[PET_STORAGE_KEYS.lastFed]),
    readPetEvent(storage, PET_STORAGE_KEYS.lastPotty, defaults[PET_STORAGE_KEYS.lastPotty]),
  ]);
  return summarizePetEvents({ walk, fed, potty }, now);
}

/**
 * Mirror pet mutations into D1 so Buddy's log stays consistent across every
 * channel (each channel is its own Durable Object with separate storage).
 */
export async function mirrorPetMutationsToD1(
  db: D1Database,
  householdId: string,
  mutations: PluginStateMutation[],
): Promise<void> {
  for (const mutation of mutations) {
    const kind = PET_KEY_TO_KIND[mutation.key];
    if (!kind || !isPetEventState(mutation.value)) continue;
    await db
      .prepare(
        `INSERT INTO pet_events (id, household_id, kind, member_name, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        householdId,
        kind,
        mutation.value.memberName.slice(0, 100),
        typeof mutation.value.note === 'string' ? mutation.value.note.slice(0, 200) : null,
        mutation.value.timestamp,
      )
      .run();
  }
}

type PetIntent = 'walk' | 'fed' | 'potty' | null;

function detectPetIntent(text: string): PetIntent {
  const lower = text.toLowerCase();
  const aboutBuddy = /(buddy|\bdog\b|pup)/.test(lower);
  if (!aboutBuddy) return null;
  if (/(potty|poop|pee\b|piddle|toilet|outside)/.test(lower)) return 'potty';
  if (/(fed\b|feed|ate\b|eat|kibble|meal|breakfast|lunch|dinner|treat)/.test(lower)) return 'fed';
  if (/(walk|stroll)/.test(lower)) return 'walk';
  return null;
}

function describeMeal(text: string): string {
  const match = text
    .toLowerCase()
    .match(/(morning|evening|night|breakfast|lunch|dinner)(?:\s+(kibble|meal|food|dinner|breakfast))?/);
  if (!match) return 'meal';
  return match[2] ? `${match[1]} ${match[2]}` : `${match[1]} meal`;
}

function describePotty(text: string): string {
  const lower = text.toLowerCase();
  if (/poop/.test(lower)) return 'poop';
  if (/(pee\b|piddle)/.test(lower)) return 'pee';
  return 'potty';
}

export const petPlugin: FamilyPlugin = {
  id: 'pet-care',
  name: 'Pet Care',
  description: 'Tracks Buddy the Golden Retriever: walks, meals, and potty breaks.',
  version: '1.0.0',
  channels: ['living-room', 'pet-care'],
  systemPromptExtension:
    'Pet Care extension: Buddy is the family Golden Retriever. Walks, meals, and potty breaks are logged automatically from chat. ' +
    'A walk older than 8 hours or a meal older than 10 hours is an alert worth one gentle nudge.',
  quickActions: [
    {
      id: 'pet-walk',
      label: '🐾 Walked Buddy',
      iconName: 'paw',
      actionText: '@famuse Buddy just had a 20-minute walk around the block.',
    },
    {
      id: 'pet-fed',
      label: '🍖 Fed Buddy',
      iconName: 'bone',
      actionText: '@famuse Buddy ate his evening kibble.',
    },
    {
      id: 'pet-potty',
      label: '🌱 Potty Break',
      iconName: 'sprout',
      actionText: '@famuse Buddy took a quick potty break outside.',
    },
  ],

  async onMessageReceived(message, _storage): Promise<PluginMessageResult | void> {
    const intent = detectPetIntent(message.text);
    if (!intent) return;

    const clock = formatClockTime(message.timestamp, 'UTC');
    if (intent === 'walk') {
      return {
        handled: true,
        stateMutations: [
          {
            key: PET_STORAGE_KEYS.lastWalk,
            value: { timestamp: message.timestamp, memberName: message.sender } satisfies PetEventState,
            timestamp: message.timestamp,
          },
        ],
        proactiveReply: `Logged! Buddy finished his walk at ${clock} UTC with ${message.sender}. Good boy energy restored. 🐕`,
      };
    }
    if (intent === 'fed') {
      const meal = describeMeal(message.text);
      return {
        handled: true,
        stateMutations: [
          {
            key: PET_STORAGE_KEYS.lastFed,
            value: {
              timestamp: message.timestamp,
              memberName: message.sender,
              note: meal,
            } satisfies PetEventState,
            timestamp: message.timestamp,
          },
        ],
        proactiveReply: `Logged! Buddy ate his ${meal} at ${clock} UTC. Thanks, ${message.sender}! 🍖`,
      };
    }
    const pottyType = describePotty(message.text);
    return {
      handled: true,
      stateMutations: [
        {
          key: PET_STORAGE_KEYS.lastPotty,
          value: {
            timestamp: message.timestamp,
            memberName: message.sender,
            note: pottyType,
          } satisfies PetEventState,
          timestamp: message.timestamp,
        },
      ],
      proactiveReply: `Logged! Buddy's potty break (${pottyType}) at ${clock} UTC. Thanks, ${message.sender}! 🌱`,
    };
  },

  async getContextSummary(storage): Promise<Record<string, unknown>> {
    const summary = await readPetSummary(storage);
    return summary as unknown as Record<string, unknown>;
  },
};
