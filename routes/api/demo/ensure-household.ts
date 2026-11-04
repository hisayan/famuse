import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { and, db, eq } from 'void/db';
import { householdMembers, households, tasks } from '@schema';
import {
  DEMO_HOUSEHOLD_ID,
  findDemoAccountByEmail,
} from '../../../src/shared/demo-accounts';
import type {
  Household,
  HouseholdMember,
  HouseholdTask,
  MemberRole,
} from '../../../src/shared/types';
import { seedDemoHousehold } from '../../../src/server/demo/seed-household';

function toMember(row: typeof householdMembers.$inferSelect): HouseholdMember {
  const role: MemberRole = row.role === 'admin' || row.role === 'agent' ? row.role : 'member';
  return {
    id: row.id,
    householdId: row.householdId,
    userId: row.userId,
    name: row.name,
    role,
    status: row.status,
  };
}

/**
 * Demo bootstrap: ensure the seeded household exists, link the signed-in
 * user to the roster (demo emails map to Mom/Dad/Leo, anyone else joins as
 * a new member), and return the full household snapshot.
 */
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  await seedDemoHousehold(db);

  const existing = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);

  if (!existing[0]) {
    const demo = findDemoAccountByEmail(user.email);
    if (demo) {
      await db
        .update(householdMembers)
        .set({ userId: user.id })
        .where(
          and(
            eq(householdMembers.householdId, DEMO_HOUSEHOLD_ID),
            eq(householdMembers.id, demo.memberId),
          ),
        );
    } else {
      const fallbackName = user.email.split('@')[0] || 'New Member';
      const name = (user.name?.trim() || fallbackName).slice(0, 100);
      await db.insert(householdMembers).values({
        id: crypto.randomUUID(),
        householdId: DEMO_HOUSEHOLD_ID,
        userId: user.id,
        name,
        role: 'member',
        status: 'Just joined',
        createdAt: Date.now(),
      });
    }
  }

  const householdRows = await db
    .select()
    .from(households)
    .where(eq(households.id, DEMO_HOUSEHOLD_ID))
    .limit(1);
  const householdRow = householdRows[0];
  if (!householdRow) {
    return c.json({ error: 'Demo household is unavailable.' }, 500);
  }
  const household: Household = {
    id: householdRow.id,
    name: householdRow.name,
    pinnedRecipeTitle: householdRow.pinnedRecipeTitle,
    pinnedRecipeDetail: householdRow.pinnedRecipeDetail,
  };

  const memberRows = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.householdId, DEMO_HOUSEHOLD_ID));
  const members = memberRows.map(toMember);
  const names = new Map(members.map((member) => [member.id, member.name]));

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.householdId, DEMO_HOUSEHOLD_ID));
  const householdTasks: HouseholdTask[] = taskRows.map((task) => ({
    id: task.id,
    householdId: task.householdId,
    title: task.title,
    assigneeMemberId: task.assigneeMemberId,
    assigneeName: task.assigneeMemberId ? (names.get(task.assigneeMemberId) ?? null) : null,
    done: task.done === 1,
  }));

  return { household, members, tasks: householdTasks };
});
