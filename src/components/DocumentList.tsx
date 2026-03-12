import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentList } from '@/hooks/useDocuments';
import { createDocument, togglePublished, updateDocument } from '@/lib/api';
import { toastManager } from './Toast';
import FileUpload from './FileUpload';
import type { DocumentListItem } from '@/types';

// --- Main DocumentList ---
export default function DocumentList() {
  const { documents, loading, refresh } = useDocumentList();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Extract unique categories from documents
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const doc of documents) {
      if (doc.category) cats.add(doc.category);
    }
    return [...cats].sort();
  }, [documents]);

  // Filter by category first
  const categoryFiltered = useMemo(() => {
    if (!selectedCategory) return documents;
    return documents.filter((d) => d.category === selectedCategory);
  }, [documents, selectedCategory]);

  // Extract unique topics from category-filtered documents
  const allTopics = useMemo(() => {
    const topicMap = new Map<string, { name: string; color: string }>();
    for (const doc of categoryFiltered) {
      for (const t of doc.topics) {
        if (!topicMap.has(t.name)) {
          topicMap.set(t.name, { name: t.name, color: t.color });
        }
      }
    }
    return Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryFiltered]);

  // Filter documents by topic within category
  const filteredDocs = useMemo(() => {
    if (!selectedTopic) return categoryFiltered;
    return categoryFiltered.filter((d) => d.topics.some((t) => t.name === selectedTopic));
  }, [categoryFiltered, selectedTopic]);

  // Group documents by category
  const groupedDocs = useMemo(() => {
    if (selectedCategory) return null; // no grouping when a specific category is selected
    const groups = new Map<string, typeof filteredDocs>();
    const uncategorized: typeof filteredDocs = [];
    for (const doc of filteredDocs) {
      if (doc.category) {
        const arr = groups.get(doc.category);
        if (arr) arr.push(doc);
        else groups.set(doc.category, [doc]);
      } else {
        uncategorized.push(doc);
      }
    }
    const result: { label: string; docs: typeof filteredDocs }[] = [];
    for (const cat of [...groups.keys()].sort()) {
      result.push({ label: cat, docs: groups.get(cat)! });
    }
    if (uncategorized.length > 0) {
      result.push({ label: 'Uncategorized', docs: uncategorized });
    }
    return result;
  }, [filteredDocs, selectedCategory]);

  // Drag start (for category reordering)
  const handleDragStart = useCallback((e: React.DragEvent, docId: number) => {
    e.dataTransfer.setData('text/plain', String(docId));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverCategory(null);
  }, []);

  // Drag-and-drop between category groups
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const handleCategoryDrop = useCallback(async (e: React.DragEvent, groupLabel: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    const docId = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(docId)) return;

    const targetCategory = groupLabel === 'Uncategorized' ? null : groupLabel;
    const doc = documents.find((d) => d.id === docId);
    if (!doc || doc.category === targetCategory) return;

    try {
      await updateDocument(docId, { category: targetCategory });
      refresh();
      toastManager.add({ title: `Moved to ${groupLabel}` });
    } catch {
      toastManager.add({ title: 'Move failed' });
    }
  }, [documents, refresh]);

  const handleCategoryDragOver = useCallback((e: React.DragEvent, groupLabel: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(groupLabel);
  }, []);

  const handleCategoryDragLeave = useCallback(() => {
    setDragOverCategory(null);
  }, []);

  const handleCardTogglePublish = useCallback(async (docId: number) => {
    try {
      await togglePublished(docId);
      refresh();
    } catch {
      toastManager.add({ title: 'Toggle failed' });
    }
  }, [refresh]);

  const handleUpload = useCallback(async (title: string, content: string) => {
    try {
      await createDocument({ title, content });
      toastManager.add({ title: `"${title}" uploaded` });
      refresh();
    } catch {
      toastManager.add({ title: 'Upload failed' });
    }
  }, [refresh]);

  if (loading && documents.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Category skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
        {/* Topic skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full" />
          ))}
        </div>
        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No documents yet</p>
        <p className="text-gray-300 text-sm mt-2">Create a new one or upload a markdown file</p>
        <div className="mt-6 max-w-sm mx-auto">
          <FileUpload onUpload={handleUpload} />
        </div>
        <button
          onClick={() => navigate('/admin/new')}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Create Document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      {allCategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => { setSelectedCategory(null); setSelectedTopic(null); }}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setSelectedTopic(null); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Topic filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedTopic(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedTopic === null
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({categoryFiltered.length})
        </button>
        {allTopics.map((topic) => (
          <button
            key={topic.name}
            onClick={() => setSelectedTopic(selectedTopic === topic.name ? null : topic.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTopic === topic.name
                ? 'text-white'
                : 'text-gray-600 hover:opacity-80'
            }`}
            style={
              selectedTopic === topic.name
                ? { backgroundColor: topic.color }
                : { backgroundColor: `${topic.color}20`, color: topic.color }
            }
          >
            {topic.name}
          </button>
        ))}
      </div>

      {/* Document grid — grouped by category or flat */}
      {groupedDocs && groupedDocs.length > 1 ? (
        groupedDocs.map(({ label, docs }) => (
          <div
            key={label}
            onDragOver={(e) => handleCategoryDragOver(e, label)}
            onDragLeave={handleCategoryDragLeave}
            onDrop={(e) => handleCategoryDrop(e, label)}
            className={`rounded-xl p-3 -mx-3 transition-colors ${
              dragOverCategory === label
                ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
                : ''
            }`}
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-0">{label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onClick={() => navigate(`/admin/doc/${doc.id}`)}
                  onDragStart={(e) => handleDragStart(e, doc.id)}
                  onDragEnd={handleDragEnd}
                  onTogglePublish={handleCardTogglePublish}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => navigate(`/admin/doc/${doc.id}`)}
              onDragStart={(e) => handleDragStart(e, doc.id)}
              onDragEnd={handleDragEnd}
              onTogglePublish={handleCardTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Document Card (draggable for category reordering) ---
function DocumentCard({
  doc,
  onClick,
  onDragStart,
  onDragEnd,
  onTogglePublish,
}: {
  doc: DocumentListItem;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTogglePublish: (id: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing select-none flex flex-col"
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePublish(doc.id); }}
          className={`w-3 h-3 rounded-full shrink-0 border-2 transition-colors ${
            doc.published
              ? 'bg-green-400 border-green-500 hover:bg-green-300'
              : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
          }`}
          title={doc.published ? 'Click to unpublish' : 'Click to publish'}
        />
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{doc.title}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <p className="text-xs text-gray-400">
          {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
        </p>
        {doc.category && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
            {doc.category}
          </span>
        )}
      </div>
      {doc.summary && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{doc.summary}</p>
      )}
      {doc.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.topics.slice(0, 3).map((t) => (
            <span
              key={t.name}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
            </span>
          ))}
          {doc.topics.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
              +{doc.topics.length - 3}
            </span>
          )}
        </div>
      )}
      {doc.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600"
            >
              {kw}
            </span>
          ))}
          {doc.keywords.length > 4 && (
            <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
              +{doc.keywords.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
