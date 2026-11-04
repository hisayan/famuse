import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { storage } from 'void/storage';

export const GET = defineHandler(async (c) => {
  requireAuth(c);
  const paramKey = c.req.param('key');
  const key = paramKey && paramKey.length > 0
    ? paramKey
    : c.req.path.replace(/^\/api\/files\//, '');
  if (!key.startsWith('uploads/') || key.includes('..')) {
    return c.notFound();
  }

  const object = await storage.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Uploaded files must never run as pages on our own origin.
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Disposition', 'attachment');
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(object.body, { headers });
});
