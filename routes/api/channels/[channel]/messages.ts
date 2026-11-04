import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { and, db, desc, eq } from 'void/db';
import { householdMembers, messages } from '@schema';
import { isChannelId } from '../../../../src/shared/channels';
import type { Attachment, ChatMessage } from '../../../../src/shared/types';

function toChatMessage(row: typeof messages.$inferSelect): ChatMessage {
  let attachments: Attachment[] = [];
  if (row.attachments) {
    try {
      const parsed: unknown = JSON.parse(row.attachments);
      if (Array.isArray(parsed)) attachments = parsed as Attachment[];
    } catch {
      attachments = [];
    }
  }
  return {
    id: row.id,
    channelId: row.channelId,
    senderId: row.senderId,
    senderName: row.senderName,
    text: row.text,
    isAi: row.isAi === 1,
    attachments,
    createdAt: row.createdAt,
  };
}

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const channelId = c.req.param('channel') ?? '';
  if (!isChannelId(channelId)) {
    return c.json({ error: 'Unknown channel.' }, 404);
  }
  const membership = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);
  if (!membership[0]) {
    return c.json({ error: 'Join the household first.' }, 403);
  }
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.householdId, membership[0].householdId),
        eq(messages.channelId, channelId),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(50);
  return rows.reverse().map(toChatMessage);
});
