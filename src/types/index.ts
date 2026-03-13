export interface DocumentTopic {
  name: string;
  color: string;
  relevance: number;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  keywords: string[];
  toc: string[];
  published: boolean;
  category: string | null;
  topics: DocumentTopic[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentListItem = Omit<Document, 'content' | 'toc'>;

export interface Topic {
  id: number;
  name: string;
  description: string | null;
  color: string;
}

export interface GraphNode {
  id: number;
  title: string;
  topics: DocumentTopic[];
}

export interface GraphEdge {
  source: number;
  target: number;
  relationshipType: string;
  description: string | null;
  strength: number;
}

export interface OntologyMeta {
  status: 'idle' | 'generating' | 'error' | 'stale';
  lastGeneratedAt: string | null;
  documentCount: number;
}

export interface OntologyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  topics: Topic[];
  meta: OntologyMeta;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: number; title: string }[];
}

// Annotation types
export type AnnotationType = 'highlight' | 'underline' | 'memo';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple';

export interface Annotation {
  id: number;
  documentId: number;
  type: AnnotationType;
  color: HighlightColor | null;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  memo: string | null;
  createdAt: string;
}

// Auth types
export interface AdminUser {
  githubId: string;
  username: string;
  avatarUrl: string;
}

// Blog types
export interface BlogPost {
  id: number;
  title: string;
  summary: string | null;
  keywords: string[];
  category: string | null;
  topics: DocumentTopic[];
  createdAt: string;
}

export interface BlogPostDetail extends BlogPost {
  content: string;
}

// Analytics types
export interface AnalyticsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  daily: { date: string; count: number }[];
}

export interface TopDocument {
  id: number;
  title: string;
  views: number;
}

export interface TopReferrer {
  referrer: string;
  count: number;
}

export interface PopularTopic {
  name: string;
  color: string;
  views: number;
}
