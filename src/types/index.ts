export interface Document {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentListItem = Omit<Document, 'content'>;
