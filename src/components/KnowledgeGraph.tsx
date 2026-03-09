import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOntology } from '@/hooks/useOntology';
import GraphCanvas from './GraphCanvas';

export default function KnowledgeGraph() {
  const { graph, loading, refresh, generate, pollStatus } = useOntology();
  const [generating, setGenerating] = useState(false);
  const [activeTopics, setActiveTopics] = useState<Set<string> | null>(null);

  // Poll while generating
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(async () => {
      const status = await pollStatus();
      if (status.status !== 'generating') {
        setGenerating(false);
        refresh();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [generating, pollStatus, refresh]);

  // Sync generating state from graph meta
  useEffect(() => {
    if (graph?.meta.status === 'generating') {
      setGenerating(true);
    }
  }, [graph?.meta.status]);

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);
      await generate();
    } catch {
      setGenerating(false);
    }
  }, [generate]);

  const toggleTopic = useCallback((topicName: string) => {
    setActiveTopics((prev) => {
      if (prev === null) {
        // First filter: show only this topic
        return new Set([topicName]);
      }
      const next = new Set(prev);
      if (next.has(topicName)) {
        next.delete(topicName);
        return next.size === 0 ? null : next;
      }
      next.add(topicName);
      return next;
    });
  }, []);

  const hasData = graph && graph.nodes.length > 0;
  const isStale = graph?.meta.status === 'stale';

  // Filter nodes/edges by active topics (memoized to prevent GraphCanvas simulation reset)
  const filteredNodes = useMemo(() => {
    if (!hasData) return graph?.nodes || [];
    if (!activeTopics) return graph.nodes;
    return graph.nodes.filter((n) => n.topics.some((t) => activeTopics.has(t.name)));
  }, [graph?.nodes, activeTopics, hasData]);

  const filteredEdges = useMemo(() => {
    if (!hasData) return [];
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return (graph.edges || []).filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [graph?.edges, filteredNodes, hasData]);

  return (
    <div className="flex flex-col -mx-4 -my-6 h-screen md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Knowledge Graph</h1>
          {graph?.meta.lastGeneratedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last generated: {new Date(graph.meta.lastGeneratedAt).toLocaleString('ko-KR')}
              {' · '}{graph.meta.documentCount} documents
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {generating && (
            <span className="text-sm text-blue-600 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
              </svg>
              Generating...
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {hasData ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Stale banner */}
      {isStale && hasData && (
        <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-700 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Documents have changed since last generation. Click "Regenerate" to update.
        </div>
      )}

      {/* Topic legend */}
      {hasData && graph.topics.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          {graph.topics.map((t) => {
            const isActive = activeTopics === null || activeTopics.has(t.name);
            return (
              <button
                key={t.id}
                onClick={() => toggleTopic(t.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: t.color + '20',
                  color: t.color,
                  border: `1px solid ${t.color}40`,
                }}
                title={t.description || t.name}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            );
          })}
          {activeTopics && (
            <button
              onClick={() => setActiveTopics(null)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Graph area */}
      <div className="flex-1 relative bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No knowledge graph yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate an ontology to discover topics and relationships between your documents.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate Knowledge Graph'}
            </button>
          </div>
        ) : (
          <GraphCanvas nodes={filteredNodes} edges={filteredEdges} />
        )}
      </div>
    </div>
  );
}
