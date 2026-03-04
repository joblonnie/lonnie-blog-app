import { config } from 'dotenv';
config({ path: '.env.local' });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './api/_server/db/schema.ts',
  out: './api/_server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
