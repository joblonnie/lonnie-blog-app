import type { Document, DocumentListItem, OntologyGraph, OntologyMeta, ChatMessage, AdminUser, BlogPost, BlogPostDetail, AnalyticsSummary, TopDocument, TopReferrer, PopularTopic } from '@/types';
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
  if (res.status === 401) {
    router.navigate('/login', { replace: true });
    throw new Error('Unauthorized');
  }
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

// Public request (no 401 redirect)
async function publicRequest<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    if (!navigator.onLine) fireOffline();
    throw new Error('Network error');
  }
  fireOnline();
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Document APIs (admin)
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

export function updateDocument(id: number, data: { title?: string; content?: string; published?: boolean; category?: string | null }): Promise<Document> {
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

export function togglePublished(id: number): Promise<Document> {
  return request(`${BASE}/${id}/publish`, { method: 'PATCH' });
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

// Auth APIs
export async function fetchCurrentUser(): Promise<AdminUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 401 || !res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

// Public blog APIs
export function fetchPublicPosts(topic?: string, category?: string): Promise<BlogPost[]> {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (category) params.set('category', category);
  const qs = params.toString();
  const url = qs ? `/api/public/posts?${qs}` : '/api/public/posts';
  return publicRequest(url);
}

export function fetchPublicCategories(): Promise<string[]> {
  return publicRequest('/api/public/categories');
}

export function fetchPublicPost(id: number): Promise<BlogPostDetail> {
  return publicRequest(`/api/public/posts/${id}`);
}

export function fetchPublicTopics(): Promise<{ name: string; color: string }[]> {
  return publicRequest('/api/public/topics');
}

// Analytics APIs
export function trackPageView(data: { path: string; documentId?: number; referrer?: string }): void {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function fetchAnalyticsDashboard(): Promise<AnalyticsSummary> {
  return request('/api/analytics/dashboard');
}

export function fetchTopDocuments(): Promise<TopDocument[]> {
  return request('/api/analytics/dashboard/documents');
}

export function fetchTopReferrers(): Promise<TopReferrer[]> {
  return request('/api/analytics/dashboard/referrers');
}

export function fetchPopularTopics(): Promise<PopularTopic[]> {
  return request('/api/analytics/dashboard/topics');
}
