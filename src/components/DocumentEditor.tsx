import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useDocument, useDocumentList, isAiPending } from '@/hooks/useDocuments';
import { createDocument, updateDocument, generateDocumentAI, togglePublished } from '@/lib/api';
import { InfoPanelDesktop, InfoPanelMobile } from './InfoPanel';
import { toastManager } from './Toast';
import { useRegenerate } from '@/hooks/useRegenerate';
import TiptapEditor from './editor/TiptapEditor';

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { document, loading, refresh } = useDocument(isNew ? undefined : Number(id));
  const { documents: allDocs, refresh: refreshList } = useDocumentList();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Derive existing categories from cached document list (no extra fetch)
  const existingCategories = useMemo(
    () => [...new Set(allDocs.map((d) => d.category).filter(Boolean))].sort() as string[],
    [allDocs],
  );

  // Close category dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content);
      setCategory(document.category);
      setSaved(false);
    }
  }, [document]);

  const isDirty = useMemo(() => {
    if (saved) return false;
    if (isNew) return title.trim() !== '' || content !== '';
    if (!document) return false;
    return title !== document.title || content !== document.content || category !== document.category;
  }, [isNew, document, title, content, category, saved]);

  // Block in-app navigation when dirty
  const skipBlockerRef = useRef(false);
  const blocker = useBlocker(() => {
    if (skipBlockerRef.current) {
      skipBlockerRef.current = false;
      return false;
    }
    return isDirty;
  });

  // Block browser close/refresh when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Auto-save every 30s when dirty (existing documents only)
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const isDirtyRef = useRef(isDirty);
  const savingRef = useRef(saving);
  titleRef.current = title;
  contentRef.current = content;
  isDirtyRef.current = isDirty;
  savingRef.current = saving;

  useEffect(() => {
    clearInterval(autoSaveRef.current);
    if (isNew || !id) return;
    autoSaveRef.current = setInterval(() => {
      if (!isDirtyRef.current || savingRef.current) return;
      updateDocument(Number(id), { title: titleRef.current, content: contentRef.current }).then(() => {
        setSaved(true);
        toastManager.add({ title: 'Auto-saved' });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [isNew, id]);

  const { regenerating, setRegenerating, handleRegenerate } = useRegenerate(
    id ? Number(id) : undefined,
    refresh,
  );
  const [toggling, setToggling] = useState(false);

  const handleTogglePublish = useCallback(async () => {
    if (!id || toggling) return;
    setToggling(true);
    try {
      await togglePublished(Number(id));
      await refresh();
      toastManager.add({ title: document?.published ? 'Unpublished' : 'Published' });
    } catch {
      toastManager.add({ title: 'Toggle failed' });
    } finally {
      setToggling(false);
    }
  }, [id, toggling, refresh, document?.published]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const doc = await createDocument({ title, content });
        toastManager.add({ title: 'Document created' });
        setSaved(true);
        refreshList();
        skipBlockerRef.current = true;
        navigate(`/admin/doc/${doc.id}/edit`, { replace: true });
      } else {
        await updateDocument(Number(id), { title, content, category });
        setSaved(true);
        // AI 메타데이터 생성
        if (content.length >= 10) {
          setRegenerating(true);
          try {
            await generateDocumentAI(Number(id));
          } finally {
            setRegenerating(false);
          }
        }
        await Promise.all([refresh(), refreshList()]);
        toastManager.add({ title: 'Saved' });
      }
    } catch {
      toastManager.add({ title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [title, content, category, isNew, id, navigate, refresh, refreshList]);

  const handleContentChange = useCallback((markdown: string) => {
    setSaved(false);
    setContent(markdown);
  }, []);

  if (!isNew && loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg" />
          <div className="flex-1 h-9 bg-gray-100 rounded border-b-2 border-gray-200" />
        </div>
        <div className="flex items-center gap-2 max-w-xs">
          <div className="w-16 h-4 bg-gray-100 rounded" />
          <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const aiLoading = isAiPending(document);
  const panelProps = {
    topics: document?.topics ?? [],
    summary: document?.summary ?? null,
    keywords: document?.keywords ?? [],
    content,
    onRegenerate: isNew ? undefined : handleRegenerate,
    regenerating,
    loading: loading || regenerating || aiLoading,
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-[52px] z-20 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12,4 6,10 12,16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => { setSaved(false); setTitle(e.target.value); }}
              placeholder="Document title"
              className="w-full text-xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none py-2 text-gray-900 placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => mdFileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Import markdown file"
            title="Import .md file"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6z" />
              <polyline points="14,2 14,6 18,6" />
              <line x1="10" y1="9" x2="10" y2="15" />
              <polyline points="7,12 10,9 13,12" />
            </svg>
          </button>
          {!isNew && (
            <button
              onClick={handleTogglePublish}
              disabled={toggling}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                document?.published
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {toggling ? '...' : document?.published ? 'Published' : 'Draft'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || regenerating || !title.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {saving ? 'Saving...' : regenerating ? 'AI...' : 'Save'}
          </button>
          <input
            ref={mdFileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  const md = reader.result as string;
                  setSaved(false);
                  setContent(md);
                  if (!title.trim()) {
                    const name = file.name.replace(/\.(md|markdown)$/, '');
                    setTitle(name);
                  }
                  toastManager.add({ title: `${file.name} loaded` });
                };
                reader.readAsText(file);
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Category selector */}
      {!isNew && (() => {
        const catDisplay = category ?? '';
        return (
          <div ref={categoryRef} className="relative max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Category</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={catDisplay}
                  onChange={(e) => {
                    setSaved(false);
                    setCategory(e.target.value || null);
                    setCategoryOpen(true);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  placeholder="Type or select..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:border-blue-400"
                />
                {category && (
                  <button
                    onClick={() => { setCategory(null); setSaved(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="4" y1="4" x2="10" y2="10" /><line x1="10" y1="4" x2="4" y2="10" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {categoryOpen && (() => {
              const filtered = existingCategories.filter(
                (c) => c.toLowerCase().includes(catDisplay.toLowerCase()) && c !== catDisplay
              );
              const trimmed = catDisplay.trim();
              const showNew = trimmed && !existingCategories.includes(trimmed);
              if (filtered.length === 0 && !showNew) return null;
              return (
                <div className="absolute z-20 mt-1 left-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
                  {filtered.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        setCategoryOpen(false);
                        setSaved(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {cat}
                    </button>
                  ))}
                  {showNew && (
                    <button
                      onClick={() => {
                        setCategory(trimmed);
                        setCategoryOpen(false);
                        setSaved(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                    >
                      + Create "{trimmed}"
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Mobile InfoPanel */}
      {!isNew && (
        <div className="xl:hidden">
          <InfoPanelMobile {...panelProps} />
        </div>
      )}

      <div className="xl:flex xl:gap-6">
        <div className="flex-1 min-w-0">
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
          />

          {regenerating && (
            <div className="mt-2 text-xs text-gray-400">AI가 메타데이터를 생성하고 있습니다...</div>
          )}
        </div>

        {/* Desktop InfoPanel */}
        {!isNew && (
          <div className="hidden xl:block">
            <InfoPanelDesktop {...panelProps} />
          </div>
        )}
      </div>

      {/* Unsaved changes dialog */}
      <AlertDialog.Root open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 z-[60]" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl z-[60] w-[90vw] max-w-sm">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900">
              Unsaved Changes
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-500 mt-2">
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialog.Close className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={() => blocker.proceed?.()}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
