import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents, documentTopics, topics } from '../db/schema.js';
import { generateAIMetadata } from '../lib/ai.js';
import { markOntologyStale } from '../lib/ontology.js';

const app = new Hono();

// GET /documents - 목록 (content 제외, 최신순, topics 포함)
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .orderBy(desc(documents.updatedAt));

  // Fetch all topic assignments in one query
  const allAssignments = await db
    .select({
      documentId: documentTopics.documentId,
      name: topics.name,
      color: topics.color,
      relevance: documentTopics.relevance,
    })
    .from(documentTopics)
    .innerJoin(topics, eq(documentTopics.topicId, topics.id));

  const topicsByDoc = new Map<number, { name: string; color: string; relevance: number }[]>();
  for (const a of allAssignments) {
    const arr = topicsByDoc.get(a.documentId);
    if (arr) arr.push({ name: a.name, color: a.color, relevance: a.relevance });
    else topicsByDoc.set(a.documentId, [{ name: a.name, color: a.color, relevance: a.relevance }]);
  }

  const result = rows.map((r) => ({
    ...r,
    topics: topicsByDoc.get(r.id) ?? [],
  }));

  return c.json(result);
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
  const body = await c.req.json<{ title: string; content: string }>();
  if (!body.title || typeof body.title !== 'string') {
    return c.json({ error: 'title is required' }, 400);
  }
  const [doc] = await db
    .insert(documents)
    .values({ title: body.title, content: body.content ?? '' })
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
  const body = await c.req.json<{ title?: string; content?: string }>();

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
  if (contentChanged) {
    updates.summary = null;
    updates.keywords = [];
    updates.toc = [];
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
  return c.json({ summary: updated.summary, keywords: updated.keywords, toc: updated.toc });
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
