import type { Document, DocumentListItem, OntologyGraph, OntologyMeta, ChatMessage } from '@/types';
import { router } from '@/app/router';
import { fireOffline, fireOnline } from '@/components/OfflineDialog';

const BASE = '/api/documents';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    if (!navigator.onLine) {
      fireOffline();
    } else {
      router.navigate('/error', { replace: true });
    }
    throw new Error('Network error');
  }
  fireOnline();
  if (res.status >= 500) {
    router.navigate('/error', { replace: true });
    throw new Error(`Server error: ${res.status}`);
  }
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

export function generateDocumentAI(id: number): Promise<{ summary: string | null; keywords: string[]; toc: string[] }> {
  return request(`${BASE}/${id}/generate`, { method: 'POST' });
}

// Ontology
export function fetchOntologyGraph(): Promise<OntologyGraph> {
  return request('/api/ontology/graph');
}

export function generateOntology(): Promise<{ status: string }> {
  return request('/api/ontology/generate', { method: 'POST' });
}

export function fetchOntologyStatus(): Promise<OntologyMeta> {
  return request('/api/ontology/status');
}

// Media upload
export function getUploadUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  return request('/api/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType }),
  });
}

// Chat
export function sendChatMessage(
  message: string,
  history: Pick<ChatMessage, 'role' | 'content'>[],
): Promise<{ reply: string; sources: { id: number; title: string }[] }> {
  return request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
}
