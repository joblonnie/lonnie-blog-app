import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents, topics, documentTopics, documentRelationships, ontologyMeta } from '../db/schema.js';
import { callGroq } from './groq.js';

interface TopicResult {
  name: string;
  description: string;
  color: string;
}

interface AssignmentResult {
  documentId: number;
  topicName: string;
  relevance: number;
}

interface RelationshipResult {
  sourceDocumentId: number;
  targetDocumentId: number;
  relationshipType: string;
  description: string;
  strength: number;
}

interface OntologyResult {
  topics: TopicResult[];
  assignments: AssignmentResult[];
  relationships: RelationshipResult[];
}

export async function markOntologyStale() {
  const db = getDb();
  const [existing] = await db.select().from(ontologyMeta).limit(1);
  if (existing) {
    await db.update(ontologyMeta).set({ status: 'stale' }).where(eq(ontologyMeta.id, existing.id));
  }
}

async function ensureMetaRow() {
  const db = getDb();
  const [existing] = await db.select().from(ontologyMeta).limit(1);
  if (!existing) {
    const [row] = await db.insert(ontologyMeta).values({ status: 'idle' }).returning();
    return row;
  }
  return existing;
}

export async function getOntologyStatus() {
  const meta = await ensureMetaRow();
  return { status: meta.status, lastGeneratedAt: meta.lastGeneratedAt, documentCount: meta.documentCount };
}

export async function generateOntology() {
  const db = getDb();
  const meta = await ensureMetaRow();

  if (meta.status === 'generating') {
    return { conflict: true };
  }

  await db.update(ontologyMeta).set({ status: 'generating' }).where(eq(ontologyMeta.id, meta.id));

  try {
    const allDocs = await db
      .select({ id: documents.id, title: documents.title, summary: documents.summary, keywords: documents.keywords })
      .from(documents);

    if (allDocs.length === 0) {
      await db.update(ontologyMeta).set({ status: 'idle', documentCount: 0, lastGeneratedAt: new Date() }).where(eq(ontologyMeta.id, meta.id));
      return { empty: true };
    }

    const docSummaries = allDocs.map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary || '',
      keywords: d.keywords || [],
    }));

    const prompt = `Analyze the following documents and create a knowledge ontology. Return a JSON object with:

1. "topics": Array of 3-10 topic clusters. Each has:
   - "name": short topic name
   - "description": one-sentence description
   - "color": hex color code (e.g. "#3B82F6")

2. "assignments": Array mapping documents to topics. Each has:
   - "documentId": the document's id number
   - "topicName": name matching a topic above
   - "relevance": 0-1 score

3. "relationships": Array of meaningful relationships between document pairs. Each has:
   - "sourceDocumentId": id of first document
   - "targetDocumentId": id of second document
   - "relationshipType": one of "extends", "contrasts", "shares_concept", "prerequisite", "related"
   - "description": brief description of the relationship
   - "strength": 0-1 score

Only include relationships that are meaningful. A document can belong to multiple topics.
Return ONLY valid JSON.

Documents:
${JSON.stringify(docSummaries)}`;

    const text = await callGroq(
      [{ role: 'user', content: prompt }],
      { json: true, temperature: 0.3, max_tokens: 2048 },
    );

    if (!text) {
      await db.update(ontologyMeta).set({ status: 'error' }).where(eq(ontologyMeta.id, meta.id));
      return { error: 'Empty response from AI' };
    }

    const result: OntologyResult = JSON.parse(text);
    await persistOntologyResult(result, allDocs.length, meta.id);

    return { success: true };
  } catch (err) {
    console.error('Ontology generation failed:', err);
    await db.update(ontologyMeta).set({ status: 'error' }).where(eq(ontologyMeta.id, meta.id));
    return { error: 'Generation failed' };
  }
}

async function persistOntologyResult(result: OntologyResult, docCount: number, metaId: number) {
  const db = getDb();

  // Clear existing data
  await db.delete(documentRelationships);
  await db.delete(documentTopics);
  await db.delete(topics);

  // Insert topics (batch)
  const topicMap = new Map<string, number>();
  if (result.topics.length > 0) {
    const insertedTopics = await db.insert(topics).values(
      result.topics.map((t) => ({ name: t.name, description: t.description, color: t.color }))
    ).returning();
    for (const t of insertedTopics) {
      topicMap.set(t.name, t.id);
    }
  }

  // Insert assignments (batch)
  const assignmentValues = result.assignments
    .filter((a) => topicMap.has(a.topicName))
    .map((a) => ({ documentId: a.documentId, topicId: topicMap.get(a.topicName)!, relevance: a.relevance }));
  if (assignmentValues.length > 0) {
    await db.insert(documentTopics).values(assignmentValues).onConflictDoNothing();
  }

  // Insert relationships (batch)
  if (result.relationships.length > 0) {
    await db.insert(documentRelationships).values(
      result.relationships.map((r) => ({
        sourceDocumentId: r.sourceDocumentId,
        targetDocumentId: r.targetDocumentId,
        relationshipType: r.relationshipType,
        description: r.description,
        strength: r.strength,
      }))
    );
  }

  // Update meta
  await db.update(ontologyMeta).set({
    status: 'idle',
    documentCount: docCount,
    lastGeneratedAt: new Date(),
  }).where(eq(ontologyMeta.id, metaId));
}
