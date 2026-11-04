import { z } from 'zod';
import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { and, db, eq } from 'void/db';
import { householdMembers, tasks } from '@schema';

export const PATCH = defineHandler.withValidator({
  body: z.object({ done: z.boolean() }),
})(async (c, { body }) => {
  const user = requireAuth(c);
  const membership = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);
  if (!membership[0]) {
    return c.json({ error: 'Join the household first.' }, 403);
  }

  const taskId = c.req.param('id') ?? '';
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.householdId, membership[0].householdId)))
    .limit(1);
  if (!existing[0]) {
    return c.json({ error: 'Task not found.' }, 404);
  }

  await db.update(tasks).set({ done: body.done ? 1 : 0 }).where(eq(tasks.id, taskId));
  return { id: taskId, done: body.done };
});
