import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { documents } from '../db/schema.js';

export async function getDistinctCategories(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ category: documents.category })
    .from(documents)
    .where(sql`${documents.category} IS NOT NULL AND ${documents.category} != ''`);
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c)).sort();
}
