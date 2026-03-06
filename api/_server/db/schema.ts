import { pgTable, serial, text, timestamp, jsonb, integer, real, unique } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  summary: text('summary'),
  keywords: jsonb('keywords').$type<string[]>().default([]),
  toc: jsonb('toc').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  color: text('color').notNull(),
});

export const documentTopics = pgTable('document_topics', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  relevance: real('relevance').notNull().default(1),
}, (t) => [
  unique().on(t.documentId, t.topicId),
]);

export const documentRelationships = pgTable('document_relationships', {
  id: serial('id').primaryKey(),
  sourceDocumentId: integer('source_document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  targetDocumentId: integer('target_document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(),
  description: text('description'),
  strength: real('strength').notNull().default(0.5),
});

export const ontologyMeta = pgTable('ontology_meta', {
  id: serial('id').primaryKey(),
  lastGeneratedAt: timestamp('last_generated_at'),
  documentCount: integer('document_count').default(0),
  status: text('status').$type<'idle' | 'generating' | 'error' | 'stale'>().notNull().default('idle'),
});
