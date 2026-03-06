import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Document, DocumentListItem } from '@/types';
import * as api from '@/lib/api';

// --- Shared document list store ---
type Listener = () => void;
const docListListeners = new Set<Listener>();
let docListCache: DocumentListItem[] = [];
let docListLoading = true;
let docListFetched = false;

function notifyDocList() {
  docListListeners.forEach((l) => l());
}

async function fetchDocList() {
  docListLoading = true;
  notifyDocList();
  try {
    docListCache = await api.fetchDocuments();
  } finally {
    docListLoading = false;
    docListFetched = true;
    notifyDocList();
  }
}

function subscribeDocList(listener: Listener) {
  docListListeners.add(listener);
  if (!docListFetched) fetchDocList();
  return () => docListListeners.delete(listener);
}

let snapshotRef = { documents: docListCache, loading: docListLoading };

function getDocListSnapshot() {
  const next = { documents: docListCache, loading: docListLoading };
  if (next.documents !== snapshotRef.documents || next.loading !== snapshotRef.loading) {
    snapshotRef = next;
  }
  return snapshotRef;
}

export function useDocumentList() {
  const { documents, loading } = useSyncExternalStore(subscribeDocList, getDocListSnapshot);

  const refresh = useCallback(() => fetchDocList(), []);

  return { documents, loading, refresh };
}

export function useDocument(id: number | undefined) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(id != null);

  const refresh = useCallback(async () => {
    if (id == null) return;
    const doc = await api.fetchDocument(id);
    setDocument(doc);
  }, [id]);

  useEffect(() => {
    if (id == null) return;
    setDocument(null);
    setLoading(true);
    api.fetchDocument(id).then(setDocument).finally(() => setLoading(false));
  }, [id]);

  return { document, loading, refresh };
}
