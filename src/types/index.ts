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
  topics: DocumentTopic[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentListItem = Omit<Document, 'content' | 'summary' | 'keywords' | 'toc'>;

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
