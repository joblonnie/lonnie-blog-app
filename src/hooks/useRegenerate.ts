import { useState, useCallback } from 'react';
import { generateDocumentAI } from '@/lib/api';

export function useRegenerate(docId: number | undefined, refresh: () => Promise<void>) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    if (!docId) return;
    setRegenerating(true);
    try {
      await generateDocumentAI(docId);
      await refresh();
    } finally {
      setRegenerating(false);
    }
  }, [docId, refresh]);

  return { regenerating, setRegenerating, handleRegenerate };
}
