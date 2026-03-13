import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { annotations } from '../db/schema.js';

const app = new Hono();

// GET /annotations?documentId=N
app.get('/', async (c) => {
  const db = getDb();
  const documentId = Number(c.req.query('documentId'));
  if (Number.isNaN(documentId)) return c.json({ error: 'documentId required' }, 400);
  const rows = await db.select().from(annotations).where(eq(annotations.documentId, documentId));
  return c.json(rows);
});

// POST /annotations
app.post('/', async (c) => {
  const db = getDb();
  const body = await c.req.json<{
    documentId: number;
    type: 'highlight' | 'underline' | 'memo';
    color?: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    memo?: string;
  }>();
  if (!body.documentId || !body.type || !body.selectedText || body.startOffset == null || body.endOffset == null) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  const [row] = await db.insert(annotations).values({
    documentId: body.documentId,
    type: body.type,
    color: body.color ?? null,
    selectedText: body.selectedText,
    startOffset: body.startOffset,
    endOffset: body.endOffset,
    memo: body.memo ?? null,
  }).returning();
  return c.json(row, 201);
});

// DELETE /annotations/:id
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const [row] = await db.delete(annotations).where(eq(annotations.id, id)).returning({ id: annotations.id });
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

export default app;
