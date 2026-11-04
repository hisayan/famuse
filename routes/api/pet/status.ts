import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { db, desc, eq } from 'void/db';
import { householdMembers, petEvents } from '@schema';
import {
  defaultPetState,
  PET_STORAGE_KEYS,
  summarizePetEvents,
  type PetEventState,
} from '../../../src/server/plugins/pet';

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const membership = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);
  if (!membership[0]) {
    return c.json({ error: 'Join the household first.' }, 403);
  }

  const now = Date.now();
  const rows = await db
    .select()
    .from(petEvents)
    .where(eq(petEvents.householdId, membership[0].householdId))
    .orderBy(desc(petEvents.createdAt))
    .limit(30);

  const latest = new Map<string, PetEventState>();
  for (const row of rows) {
    if (!latest.has(row.kind)) {
      latest.set(row.kind, {
        timestamp: row.createdAt,
        memberName: row.memberName,
        note: row.note ?? undefined,
      });
    }
  }
  const defaults = defaultPetState(now);
  return summarizePetEvents(
    {
      walk: latest.get('walk') ?? defaults[PET_STORAGE_KEYS.lastWalk],
      fed: latest.get('fed') ?? defaults[PET_STORAGE_KEYS.lastFed],
      potty: latest.get('potty') ?? defaults[PET_STORAGE_KEYS.lastPotty],
    },
    now,
  );
});
