import { getDb } from '../db/index.js';
import { documents, topics, documentTopics, documentRelationships } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { callGroq } from './groq.js';

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply: string;
  sources: { id: number; title: string }[];
}

export async function askQuestion(message: string, history: ChatHistory[]): Promise<ChatResponse> {
  const db = getDb();

  // 1. Fetch all documents metadata
  const allDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      summary: documents.summary,
      keywords: documents.keywords,
    })
    .from(documents);

  if (allDocs.length === 0) {
    return { reply: '등록된 문서가 없습니다. 먼저 문서를 추가해 주세요.', sources: [] };
  }

  // 2. Fetch ontology data
  const allTopics = await db.select().from(topics);
  const allDocTopics = await db.select().from(documentTopics);
  const allRelationships = await db.select().from(documentRelationships);

  // Build ontology context string
  const topicMap = new Map(allTopics.map((t) => [t.id, t.name]));
  const docTopicLines = allDocTopics.map((dt) => {
    const topicName = topicMap.get(dt.topicId) ?? `topic_${dt.topicId}`;
    return `  Doc#${dt.documentId} — ${topicName} (relevance: ${dt.relevance})`;
  });
  const relationshipLines = allRelationships.map(
    (r) => `  Doc#${r.sourceDocumentId} —[${r.relationshipType}]→ Doc#${r.targetDocumentId}${r.description ? ` (${r.description})` : ''}`,
  );

  const ontologyContext = [
    `Topics: ${allTopics.map((t) => t.name).join(', ')}`,
    docTopicLines.length > 0 ? `Document-Topic assignments:\n${docTopicLines.join('\n')}` : '',
    relationshipLines.length > 0 ? `Document relationships:\n${relationshipLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // 3. Select relevant documents
  let relevantDocIds: number[];

  if (allDocs.length <= 5) {
    // Small corpus — use all
    relevantDocIds = allDocs.map((d) => d.id);
  } else {
    // Ask Groq to pick relevant documents
    const docList = allDocs
      .map((d) => `- ID: ${d.id}, Title: "${d.title}", Summary: "${d.summary ?? 'N/A'}", Keywords: [${(d.keywords ?? []).join(', ')}]`)
      .join('\n');

    const selectionResponse = await callGroq(
      [
        {
          role: 'user',
          content: `Given the user's question and document list below, return a JSON object with a single key "ids" containing an array of document IDs (numbers) most relevant to answering the question. Select up to 5 most relevant documents.

Question: "${message}"

Documents:
${docList}

Return ONLY valid JSON like: {"ids": [1, 3, 5]}`,
        },
      ],
      { json: true, temperature: 0.1, max_tokens: 256 },
    );

    try {
      const parsed = JSON.parse(selectionResponse);
      relevantDocIds = Array.isArray(parsed.ids)
        ? parsed.ids.filter((id: unknown) => typeof id === 'number')
        : allDocs.map((d) => d.id);
    } catch {
      relevantDocIds = allDocs.map((d) => d.id);
    }

    if (relevantDocIds.length === 0) {
      relevantDocIds = allDocs.map((d) => d.id);
    }
  }

  // 4. Fetch actual content for selected documents
  const relevantDocs = relevantDocIds.length > 0
    ? await db
        .select({ id: documents.id, title: documents.title, content: documents.content })
        .from(documents)
        .where(inArray(documents.id, relevantDocIds))
    : [];

  const docContextParts = relevantDocs.map((d) => {
    const truncated = d.content.slice(0, 2000);
    return `=== Document #${d.id}: ${d.title} ===\n${truncated}${d.content.length > 2000 ? '\n...(truncated)' : ''}`;
  });

  // 5. Build system prompt
  const systemPrompt = `You are a document knowledge assistant. Answer the user's questions based ONLY on the provided document context and ontology information.

Rules:
- Answer in the same language as the user's question
- If the information is not in the documents, say so clearly
- Reference the document IDs you used in your answer (e.g., [Doc#1], [Doc#3])
- Be concise but thorough

Ontology Information:
${ontologyContext}

Document Contents:
${docContextParts.join('\n\n')}`;

  // 6. Build messages for Groq
  const groqMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (last 10 messages to stay within context)
  const recentHistory = history.slice(-10);
  for (const h of recentHistory) {
    groqMessages.push({ role: h.role, content: h.content });
  }
  groqMessages.push({ role: 'user', content: message });

  // 7. Call Groq for final answer
  const reply = await callGroq(groqMessages, { temperature: 0.4, max_tokens: 1024 });

  // 8. Extract referenced document IDs from the reply
  const refPattern = /\[Doc#(\d+)\]/g;
  const referencedIds = new Set<number>();
  let match;
  while ((match = refPattern.exec(reply)) !== null) {
    referencedIds.add(Number(match[1]));
  }

  // Build sources list from referenced docs, falling back to all relevant docs
  const sourceDocIds = referencedIds.size > 0 ? [...referencedIds] : relevantDocIds;
  const sources = allDocs
    .filter((d) => sourceDocIds.includes(d.id))
    .map((d) => ({ id: d.id, title: d.title }));

  return { reply, sources };
}
