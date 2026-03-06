import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { documents, topics, documentTopics, documentRelationships } from '../db/schema.js';
import { generateOntology, getOntologyStatus } from '../lib/ontology.js';

const app = new Hono();

// GET /ontology/graph — 전체 그래프 데이터
app.get('/graph', async (c) => {
  const db = getDb();

  const [allTopics, allAssignments, allRelationships, allDocs, meta] = await Promise.all([
    db.select().from(topics),
    db.select().from(documentTopics),
    db.select().from(documentRelationships),
    db.select({ id: documents.id, title: documents.title }).from(documents),
    getOntologyStatus(),
  ]);

  // Build lookup maps for O(1) access
  const topicMap = new Map(allTopics.map((t) => [t.id, t]));
  const assignmentsByDoc = new Map<number, typeof allAssignments>();
  for (const a of allAssignments) {
    const arr = assignmentsByDoc.get(a.documentId);
    if (arr) arr.push(a);
    else assignmentsByDoc.set(a.documentId, [a]);
  }

  // Build nodes from documents that have topic assignments
  const nodes = allDocs
    .filter((d) => assignmentsByDoc.has(d.id))
    .map((d) => {
      const docTopics = (assignmentsByDoc.get(d.id) || [])
        .map((a) => {
          const topic = topicMap.get(a.topicId);
          return topic ? { name: topic.name, color: topic.color, relevance: a.relevance } : null;
        })
        .filter(Boolean);
      return {
        id: d.id,
        title: d.title,
        topics: docTopics,
      };
    });

  const edges = allRelationships.map((r) => ({
    source: r.sourceDocumentId,
    target: r.targetDocumentId,
    relationshipType: r.relationshipType,
    description: r.description,
    strength: r.strength,
  }));

  return c.json({
    nodes,
    edges,
    topics: allTopics.map((t) => ({ id: t.id, name: t.name, description: t.description, color: t.color })),
    meta,
  });
});

// POST /ontology/generate — 온톨로지 재생성
app.post('/generate', async (c) => {
  // generateOntology() internally checks for 'generating' status
  generateOntology().catch((err) => console.error('Ontology generation error:', err));

  return c.json({ status: 'generating' });
});

// GET /ontology/status — 생성 상태
app.get('/status', async (c) => {
  const status = await getOntologyStatus();
  return c.json(status);
});

export default app;
