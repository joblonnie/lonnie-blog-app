import type { Context, Next } from 'hono';
import { getSession, isAdmin } from '../lib/auth.js';

export async function adminOnly(c: Context, next: Next) {
  const session = await getSession(c);
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (!isAdmin(session.githubId)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('admin', session);
  await next();
}
