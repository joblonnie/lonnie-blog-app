import { Hono } from 'hono';
import { sql, eq, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { pageViews, documents, documentTopics, topics } from '../db/schema.js';

const app = new Hono();

// POST /analytics/track — 페이지뷰 기록 (공개)
app.post('/track', async (c) => {
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

// GET /analytics/dashboard — 요약 통계 (관리자)
app.get('/dashboard', async (c) => {
  const db = getDb();
  const tz = `'Asia/Seoul'`;

  // 단일 쿼리로 today/week/month/total 계산 (KST 기준, 월요일 시작 주)
  const [counts] = await db.select({
    total: sql<number>`count(*)::int`,
    today: sql<number>`count(*) FILTER (
      WHERE (${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date = (NOW() AT TIME ZONE ${sql.raw(tz)})::date
    )::int`,
    thisWeek: sql<number>`count(*) FILTER (
      WHERE (${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date >= DATE_TRUNC('week', (NOW() AT TIME ZONE ${sql.raw(tz)})::date)
    )::int`,
    thisMonth: sql<number>`count(*) FILTER (
      WHERE (${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE ${sql.raw(tz)})::date)
    )::int`,
  }).from(pageViews);

  // 최근 30일 일별 추이 (KST 기준)
  const daily = await db
    .select({
      date: sql<string>`((${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(sql`(${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date >= (NOW() AT TIME ZONE ${sql.raw(tz)})::date - 30`)
    .groupBy(sql`(${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date`)
    .orderBy(sql`(${pageViews.createdAt} AT TIME ZONE ${sql.raw(tz)})::date`);

  return c.json({
    today: counts.today,
    thisWeek: counts.thisWeek,
    thisMonth: counts.thisMonth,
    total: counts.total,
    daily,
  });
});

// GET /analytics/dashboard/documents — 인기 문서 (관리자)
app.get('/dashboard/documents', async (c) => {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      views: sql<number>`count(${pageViews.id})::int`,
    })
    .from(pageViews)
    .innerJoin(documents, eq(pageViews.documentId, documents.id))
    .groupBy(documents.id, documents.title)
    .orderBy(desc(sql`count(${pageViews.id})`))
    .limit(20);

  return c.json(rows);
});

// GET /analytics/dashboard/referrers — 유입 경로 (관리자)
app.get('/dashboard/referrers', async (c) => {
  const db = getDb();

  const rows = await db
    .select({
      referrer: pageViews.referrer,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(sql`${pageViews.referrer} IS NOT NULL AND ${pageViews.referrer} != ''`)
    .groupBy(pageViews.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return c.json(rows);
});

// GET /analytics/dashboard/topics — 인기 토픽 (관리자)
app.get('/dashboard/topics', async (c) => {
  const db = getDb();

  const rows = await db
    .select({
      name: topics.name,
      color: topics.color,
      views: sql<number>`count(${pageViews.id})::int`,
    })
    .from(pageViews)
    .innerJoin(documents, eq(pageViews.documentId, documents.id))
    .innerJoin(documentTopics, eq(documents.id, documentTopics.documentId))
    .innerJoin(topics, eq(documentTopics.topicId, topics.id))
    .groupBy(topics.name, topics.color)
    .orderBy(desc(sql`count(${pageViews.id})`))
    .limit(20);

  return c.json(rows);
});

export default app;
