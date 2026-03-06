import { useState, useEffect, useCallback } from 'react';
import type { OntologyGraph } from '@/types';
import * as api from '@/lib/api';

export function useOntology() {
  const [graph, setGraph] = useState<OntologyGraph | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchOntologyGraph();
      setGraph(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(async () => {
    await api.generateOntology();
  }, []);

  const pollStatus = useCallback(async () => {
    const status = await api.fetchOntologyStatus();
    return status;
  }, []);

  return { graph, loading, refresh, generate, pollStatus };
}
