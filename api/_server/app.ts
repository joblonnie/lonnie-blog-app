import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { adminOnly } from './middleware/adminOnly.js';
import auth from './routes/auth.js';
import publicRoutes from './routes/public.js';
import analytics from './routes/analytics.js';
import documents from './routes/documents.js';
import media from './routes/media.js';
import ontology from './routes/ontology.js';
import chat from './routes/chat.js';
import annotationsRoute from './routes/annotations.js';

export const app = new Hono().basePath('/api');

app.use('*', cors());

// Public routes (no auth required)
app.route('/auth', auth);
app.route('/public', publicRoutes);

// Analytics track endpoint is public
app.post('/analytics/track', async (c) => {
  // Forward to analytics handler
  const { getDb } = await import('./db/index.js');
  const { pageViews } = await import('./db/schema.js');
  const db = getDb();
  const body = await c.req.json<{ path: string; documentId?: number; referrer?: string }>();
  const userAgent = c.req.header('user-agent') || null;
  await db.insert(pageViews).values({
    path: body.path,
    documentId: body.documentId ?? null,
    referrer: body.referrer || null,
    userAgent,
  });
  return c.json({ ok: true }, 202);
});

// Admin-only routes
const admin = new Hono();
admin.use('*', adminOnly);
admin.route('/documents', documents);
admin.route('/media', media);
admin.route('/ontology', ontology);
admin.route('/chat', chat);
admin.route('/analytics', analytics);
admin.route('/annotations', annotationsRoute);

app.route('/', admin);
