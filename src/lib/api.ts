import type { Document, DocumentListItem } from '@/types';

const BASE = '/api/documents';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchDocuments(): Promise<DocumentListItem[]> {
  return request(BASE);
}

export function fetchDocument(id: number): Promise<Document> {
  return request(`${BASE}/${id}`);
}

export function createDocument(data: { title: string; content: string }): Promise<Document> {
  return request(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateDocument(id: number, data: { title?: string; content?: string }): Promise<Document> {
  return request(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: number): Promise<void> {
  await request(`${BASE}/${id}`, { method: 'DELETE' });
}
