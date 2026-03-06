import { Hono } from 'hono';
import { desc, eq, isNull, and, gte, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents, documentTopics, topics } from '../db/schema.js';
import { generateAIMetadata } from '../lib/ai.js';
import { markOntologyStale } from '../lib/ontology.js';
import { getDistinctCategories } from '../lib/categories.js';

const app = new Hono();

// GET /documents/categories - 카테고리 목록
app.get('/categories', async (c) => {
  return c.json(await getDistinctCategories());
});

// GET /documents - 목록 (content 제외, 최신순)
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .orderBy(desc(documents.updatedAt));
  return c.json(rows);
});

// GET /documents/:id - 단건 조회 (topics 포함)
app.get('/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return c.json({ error: 'Not found' }, 404);

  // 문서에 연결된 topics 조회
  const docTopics = await db
    .select({
      name: topics.name,
      color: topics.color,
      relevance: documentTopics.relevance,
    })
    .from(documentTopics)
    .innerJoin(topics, eq(documentTopics.topicId, topics.id))
    .where(eq(documentTopics.documentId, id));

  return c.json({ ...doc, topics: docTopics });
});

// POST /documents - 생성
app.post('/', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ title: string; content: string; category?: string }>();
  if (!body.title || typeof body.title !== 'string') {
    return c.json({ error: 'title is required' }, 400);
  }
  const [doc] = await db
    .insert(documents)
    .values({ title: body.title, content: body.content ?? '', category: body.category ?? null })
    .returning();

  // fire-and-forget AI generation
  if (doc.content) {
    generateAIMetadata(doc.id, doc.content).catch(() => {});
  }

  markOntologyStale().catch(() => {});

  return c.json(doc, 201);
});

// PUT /documents/:id - 수정
app.put('/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json<{ title?: string; content?: string; category?: string }>();

  // Check if content actually changed
  let contentChanged = false;
  if (body.content !== undefined) {
    const [existing] = await db.select({ content: documents.content }).from(documents).where(eq(documents.id, id));
    if (existing && existing.content !== body.content) {
      contentChanged = true;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.category !== undefined) updates.category = body.category;
  if (contentChanged) {
    updates.summary = null;
    updates.keywords = [];
    updates.toc = [];
    updates.category = null;
  }
  const [doc] = await db
    .update(documents)
    .set(updates)
    .where(eq(documents.id, id))
    .returning();
  if (!doc) return c.json({ error: 'Not found' }, 404);

  markOntologyStale().catch(() => {});

  return c.json(doc);
});

// POST /documents/:id/generate - 수동 AI 재생성
app.post('/:id/generate', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return c.json({ error: 'Not found' }, 404);

  await generateAIMetadata(doc.id, doc.content);

  const [updated] = await db.select().from(documents).where(eq(documents.id, id));
  return c.json({ category: updated.category, summary: updated.summary, keywords: updated.keywords, toc: updated.toc });
});

// POST /documents/generate-categories - 카테고리 없는 문서 일괄 AI 생성
app.post('/generate-categories', async (c) => {
  const db = getDb();
  const docs = await db
    .select({ id: documents.id, content: documents.content })
    .from(documents)
    .where(and(isNull(documents.category), gte(sql`length(${documents.content})`, 50)));

  let count = 0;
  for (const doc of docs) {
    generateAIMetadata(doc.id, doc.content).catch(() => {});
    count++;
  }

  return c.json({ queued: count });
});

// DELETE /documents/:id - 삭제
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  const [doc] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id });
  if (!doc) return c.json({ error: 'Not found' }, 404);

  markOntologyStale().catch(() => {});

  return c.json({ success: true });
});

export default app;
