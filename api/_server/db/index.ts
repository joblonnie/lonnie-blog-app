import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
  if (!db) {
    const sql = neon(process.env.POSTGRES_URL!);
    db = drizzle(sql, { schema });
  }
  return db;
}
