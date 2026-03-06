import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents } from '../db/schema.js';
import { callGroq } from './groq.js';
import { getDistinctCategories } from './categories.js';

export async function generateAIMetadata(documentId: number, content: string) {
  if (!content || content.length < 10) return;

  const truncated = content.slice(0, 4000);

  const existingCategories = await getDistinctCategories();
  const categoryHint = existingCategories.length > 0
    ? `\nExisting categories: [${existingCategories.join(', ')}]. Reuse one of these if it fits. Only create a new category if none of the existing ones match.`
    : '';

  try {
    const text = await callGroq(
      [
        {
          role: 'user',
          content: `Analyze the following document and return a JSON object with:
- "category": A single short category label (1-3 words) that best describes the document's primary topic, in the same language as the document${categoryHint}
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
    const category = typeof parsed.category === 'string' ? parsed.category : null;
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
      .set({ category, summary, keywords, toc })
      .where(eq(documents.id, documentId));
  } catch (err) {
    console.error('AI metadata generation failed:', err);
  }
}
