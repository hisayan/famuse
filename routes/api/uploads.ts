import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { db, eq } from 'void/db';
import { storage } from 'void/storage';
import { householdMembers } from '@schema';
import { MAX_ATTACHMENT_BYTES } from '../../src/shared/room-events';

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const membership = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);
  if (!membership[0]) {
    return c.json({ error: 'Join the household first.' }, 403);
  }

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: 'Attach a file with the "file" field.' }, 400);
  }
  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Only image uploads are supported.' }, 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return c.json({ error: 'Images must be smaller than 5 MB.' }, 400);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'photo';
  const key = `uploads/${membership[0].householdId}/${crypto.randomUUID()}-${safeName}`;
  await storage.put(key, file, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  return {
    key,
    url: `/api/files/${key}`,
    name: file.name.slice(0, 200) || 'photo',
    contentType: file.type || 'application/octet-stream',
    size: file.size,
  };
});
