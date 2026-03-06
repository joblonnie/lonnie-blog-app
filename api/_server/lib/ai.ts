import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents } from '../db/schema.js';
import { callGroq } from './groq.js';

export async function generateAIMetadata(documentId: number, content: string) {
  if (!content || content.length < 10) return;

  const truncated = content.slice(0, 4000);

  try {
    const text = await callGroq(
      [
        {
          role: 'user',
          content: `Analyze the following document and return a JSON object with:
- "summary": A concise 2-3 sentence summary in the same language as the document
- "keywords": An array of 3-7 relevant keyword tags in the same language as the document
- "toc": An array of strings representing the main sections/topics covered in the document (3-8 items), in the same language as the document

Return ONLY valid JSON.

Document:
${truncated}`,
        },
      ],
      { json: true, temperature: 0.2, max_tokens: 512 },
    );

    if (!text) return;

    const parsed = JSON.parse(text);
    const summary = typeof parsed.summary === 'string' ? parsed.summary : null;
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === 'string')
      : [];

    const toc = Array.isArray(parsed.toc)
      ? parsed.toc.filter((t: unknown) => typeof t === 'string')
      : [];

    const db = getDb();
    await db
      .update(documents)
      .set({ summary, keywords, toc })
      .where(eq(documents.id, documentId));
  } catch (err) {
    console.error('AI metadata generation failed:', err);
  }
}
