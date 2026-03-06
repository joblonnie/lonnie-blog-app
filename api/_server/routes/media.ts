import { Hono } from 'hono';
import { generateUploadUrl } from '../lib/s3.js';

const app = new Hono();

// POST /media/upload-url - presigned URL 발급
app.post('/upload-url', async (c) => {
  const body = await c.req.json<{ filename: string; contentType: string }>();

  if (!body.filename || !body.contentType) {
    return c.json({ error: 'filename and contentType are required' }, 400);
  }

  if (!body.contentType.startsWith('image/') && !body.contentType.startsWith('video/')) {
    return c.json({ error: 'Only image/* and video/* types are allowed' }, 400);
  }

  const { uploadUrl, publicUrl } = await generateUploadUrl(body.filename, body.contentType);
  return c.json({ uploadUrl, publicUrl });
});

export default app;
