import { useState, useEffect, useCallback } from 'react';
import type { Document, DocumentListItem } from '@/types';
import * as api from '@/lib/api';

export function useDocumentList() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await api.fetchDocuments();
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { documents, loading, refresh };
}

export function useDocument(id: number | undefined) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(id != null);

  useEffect(() => {
    if (id == null) return;
    setDocument(null);
    setLoading(true);
    api.fetchDocument(id).then(setDocument).finally(() => setLoading(false));
  }, [id]);

  return { document, loading };
}
