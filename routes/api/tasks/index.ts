import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { db, eq } from 'void/db';
import { householdMembers, tasks } from '@schema';
import type { HouseholdTask } from '../../../src/shared/types';

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

  const householdId = membership[0].householdId;
  const [taskRows, memberRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.householdId, householdId)),
    db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId)),
  ]);
  const names = new Map(memberRows.map((member) => [member.id, member.name]));
  const result: HouseholdTask[] = taskRows.map((task) => ({
    id: task.id,
    householdId: task.householdId,
    title: task.title,
    assigneeMemberId: task.assigneeMemberId,
    assigneeName: task.assigneeMemberId ? (names.get(task.assigneeMemberId) ?? null) : null,
    done: task.done === 1,
  }));
  return result;
});
