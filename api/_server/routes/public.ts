import { Hono } from 'hono';
import { desc, eq, and, inArray, isNotNull, ilike, or, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents, documentTopics, topics } from '../db/schema.js';

const app = new Hono();

// GET /public/posts — published 문서 목록
app.get('/posts', async (c) => {
  const db = getDb();
  const topicFilter = c.req.query('topic');
  const categoryFilter = c.req.query('category');
  const search = c.req.query('search');

  const conditions = [eq(documents.published, true)];
  if (categoryFilter) conditions.push(eq(documents.category, categoryFilter));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(documents.title, pattern),
        ilike(documents.content, pattern),
        sql`${documents.keywords}::text ILIKE ${pattern}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      summary: documents.summary,
      keywords: documents.keywords,
      category: documents.category,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));

  // Fetch topic assignments only for matched docs
  const docIds = rows.map((r) => r.id);
  if (docIds.length === 0) return c.json([]);

  const allAssignments = await db
    .select({
      documentId: documentTopics.documentId,
      name: topics.name,
      color: topics.color,
      relevance: documentTopics.relevance,
    })
    .from(documentTopics)
    .innerJoin(topics, eq(documentTopics.topicId, topics.id))
    .where(inArray(documentTopics.documentId, docIds));

  const topicsByDoc = new Map<number, { name: string; color: string; relevance: number }[]>();
  for (const a of allAssignments) {
    const arr = topicsByDoc.get(a.documentId);
    if (arr) arr.push({ name: a.name, color: a.color, relevance: a.relevance });
    else topicsByDoc.set(a.documentId, [{ name: a.name, color: a.color, relevance: a.relevance }]);
  }

  let result = rows.map((r) => ({
    ...r,
    topics: topicsByDoc.get(r.id) ?? [],
  }));

  // Filter by topic if specified
  if (topicFilter) {
    result = result.filter((r) => r.topics.some((t) => t.name === topicFilter));
  }

  return c.json(result);
});

// GET /public/posts/:id — published 단일 문서
app.get('/posts/:id', async (c) => {
  const db = getDb();
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.published, true)));

  if (!doc) return c.json({ error: 'Not found' }, 404);

  const docTopics = await db
    .select({
      name: topics.name,
      color: topics.color,
      relevance: documentTopics.relevance,
    })
    .from(documentTopics)
    .innerJoin(topics, eq(documentTopics.topicId, topics.id))
    .where(eq(documentTopics.documentId, id));

  return c.json({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    summary: doc.summary,
    keywords: doc.keywords,
    category: doc.category,
    topics: docTopics,
    createdAt: doc.createdAt,
  });
});

// GET /public/topics — published 문서가 있는 토픽만 (single join query)
app.get('/topics', async (c) => {
  const db = getDb();

  const assignments = await db
    .select({
      name: topics.name,
      color: topics.color,
    })
    .from(documentTopics)
    .innerJoin(topics, eq(documentTopics.topicId, topics.id))
    .innerJoin(documents, eq(documentTopics.documentId, documents.id))
    .where(eq(documents.published, true));

  const topicMap = new Map<string, { name: string; color: string }>();
  for (const a of assignments) {
    if (!topicMap.has(a.name)) {
      topicMap.set(a.name, { name: a.name, color: a.color });
    }
  }

  return c.json(Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
});

// GET /public/categories — published 문서가 있는 카테고리 목록
app.get('/categories', async (c) => {
  const db = getDb();
  const rows = await db
    .selectDistinct({ category: documents.category })
    .from(documents)
    .where(and(eq(documents.published, true), isNotNull(documents.category)))
    .orderBy(documents.category);

  return c.json(rows.map((r) => r.category));
});

export default app;
