import { and, eq, notInArray } from 'void/db';
import {
  householdMembers,
  messages,
  petEvents,
  tasks,
} from '../../../db/schema';
import { DEMO_ACCOUNTS, DEMO_HOUSEHOLD_ID } from '../../shared/demo-accounts';
import { seedDemoHousehold, type AppDb } from './seed-household';

const DEMO_MEMBER_IDS = DEMO_ACCOUNTS.map((account) => account.memberId);

/**
 * Wipe the public demo household back to a fresh seed: chat history, tasks,
 * pet events, visitor-added members, and demo R2 uploads. Only touches rows
 * and objects scoped to DEMO_HOUSEHOLD_ID — auth users are left alone and
 * re-link to the roster on their next visit.
 *
 * @returns number of R2 uploads deleted.
 */
export async function resetDemoHousehold(target: AppDb, bucket: R2Bucket): Promise<number> {
  await target.delete(messages).where(eq(messages.householdId, DEMO_HOUSEHOLD_ID));
  await target.delete(tasks).where(eq(tasks.householdId, DEMO_HOUSEHOLD_ID));
  await target.delete(petEvents).where(eq(petEvents.householdId, DEMO_HOUSEHOLD_ID));
  await target
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, DEMO_HOUSEHOLD_ID),
        notInArray(householdMembers.id, DEMO_MEMBER_IDS),
      ),
    );
  await target
    .update(householdMembers)
    .set({ userId: null })
    .where(eq(householdMembers.householdId, DEMO_HOUSEHOLD_ID));

  let uploads = 0;
  const prefix = `uploads/${DEMO_HOUSEHOLD_ID}/`;
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    if (listed.objects.length > 0) {
      await bucket.delete(listed.objects.map((object) => object.key));
      uploads += listed.objects.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  await seedDemoHousehold(target);
  return uploads;
}
