import { useState, useEffect, useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Tabs } from '@base-ui-components/react/tabs';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { useDocument, useDocumentList } from '@/hooks/useDocuments';
import { createDocument, updateDocument, generateDocumentAI, getUploadUrl, uploadFileToS3, fetchCategories } from '@/lib/api';
import MarkdownRenderer from './MarkdownRenderer';
import { InfoPanelDesktop, InfoPanelMobile } from './InfoPanel';
import { toastManager } from './Toast';
import { useRegenerate } from '@/hooks/useRegenerate';

const ALLOWED_TYPES = /^(image|video)\//;


const textareaClass = 'w-full p-4 bg-white border border-gray-200 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { document, loading, refresh } = useDocument(isNew ? undefined : Number(id));
  const { refresh: refreshList } = useDocumentList();
  const toast = { show: (msg: string) => toastManager.add({ title: msg }) };

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [content, setContent] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const deferredContent = useDeferredValue(content);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaDesktopRef = useRef<HTMLTextAreaElement>(null);
  const textareaMobileRef = useRef<HTMLTextAreaElement>(null);

  const getActiveTextarea = () => textareaDesktopRef.current ?? textareaMobileRef.current;

  const handleFileUpload = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.test(file.type)) {
      toastManager.add({ title: 'Only image and video files are supported' });
      return;
    }

    const placeholder = `![Uploading ${file.name}...]()`;
    const textarea = getActiveTextarea();

    // Insert placeholder
    setContent(prev => {
      if (textarea) {
        const start = textarea.selectionStart;
        const before = prev.substring(0, start);
        const after = prev.substring(textarea.selectionEnd);
        return before + '\n' + placeholder + '\n' + after;
      }
      return prev + '\n' + placeholder + '\n';
    });
    setSaved(false);
    setUploading(true);

    try {
      const { uploadUrl, publicUrl } = await getUploadUrl(file.name, file.type);
      await uploadFileToS3(uploadUrl, file);
      const tag = `![${file.name}](${publicUrl})`;
      setContent(prev => prev.replace(placeholder, tag));
      toastManager.add({ title: 'Upload complete' });
    } catch {
      setContent(prev => prev.replace('\n' + placeholder + '\n', '').replace(placeholder, ''));
      toastManager.add({ title: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (ALLOWED_TYPES.test(item.type)) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFileUpload(file);
        return;
      }
    }
  }, [handleFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer.files;
    for (const file of files) {
      if (ALLOWED_TYPES.test(file.type)) {
        e.preventDefault();
        handleFileUpload(file);
        return;
      }
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setCategory(document.category ?? '');
      setContent(document.content);
      setSaved(false);
    }
  }, [document]);

  const isDirty = useMemo(() => {
    if (saved) return false;
    if (isNew) return title.trim() !== '' || content !== '';
    if (!document) return false;
    return title !== document.title || content !== document.content || category !== (document.category ?? '');
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
  useEffect(() => {
    clearInterval(autoSaveRef.current);
    if (isNew || !id) return;
    autoSaveRef.current = setInterval(() => {
      if (!isDirty || saving) return;
      updateDocument(Number(id), { title, content, category: category || undefined }).then(() => {
        setSaved(true);
        toastManager.add({ title: 'Auto-saved' });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [isNew, id, isDirty, saving, title, content, category]);

  const { regenerating, setRegenerating, handleRegenerate } = useRegenerate(
    id ? Number(id) : undefined,
    refresh,
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const doc = await createDocument({ title, content, category: category || undefined });
        toast.show('Document created');
        setSaved(true);
        refreshList();
        skipBlockerRef.current = true;
        navigate(`/doc/${doc.id}`, { replace: true });
      } else {
        await updateDocument(Number(id), { title, content, category: category || undefined });
        setSaved(true);
        // AI 메타데이터 생성 (category, summary, keywords, toc)
        if (content.length >= 10) {
          setRegenerating(true);
          try {
            await generateDocumentAI(Number(id));
          } finally {
            setRegenerating(false);
          }
        }
        await refresh();
        refreshList();
        fetchCategories().then(setCategories).catch(() => {});
        toast.show('Saved');
      }
    } catch {
      toast.show('Save failed');
    } finally {
      setSaving(false);
    }
  }, [title, content, category, isNew, id, navigate, toast, refresh, refreshList]);

  if (!isNew && loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const panelProps = {
    category: document?.category ?? null,
    topics: document?.topics ?? [],
    summary: document?.summary ?? null,
    keywords: document?.keywords ?? [],
    content: deferredContent,
    onRegenerate: isNew ? undefined : handleRegenerate,
    regenerating,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isNew ? '/' : `/doc/${id}`)}
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
          <div className="relative mt-1">
            <input
              ref={categoryInputRef}
              type="text"
              value={category}
              onChange={(e) => { setSaved(false); setCategory(e.target.value); setCategoryOpen(true); }}
              onFocus={() => setCategoryOpen(true)}
              onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
              placeholder="카테고리 (비우면 AI가 자동 생성)"
              className="w-full text-xs bg-transparent border-b border-gray-100 focus:border-blue-300 outline-none py-1 text-gray-500 placeholder-gray-300"
            />
            {categoryOpen && categories.filter((c) => c.toLowerCase().includes(category.toLowerCase())).length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {categories
                  .filter((c) => c.toLowerCase().includes(category.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSaved(false); setCategory(c); setCategoryOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${c === category ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      {c}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Upload image or video"
          title="Upload image or video"
        >
          {uploading ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="8" strokeDasharray="40" strokeDashoffset="10" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <circle cx="7" cy="8" r="1.5" />
              <path d="M2 14l4-4 3 3 4-5 5 6" />
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Mobile InfoPanel */}
      {!isNew && (
        <div className="xl:hidden">
          <InfoPanelMobile {...panelProps} />
        </div>
      )}

      <div className="xl:flex xl:gap-6">
        <div className="flex-1 min-w-0">
          {/* Desktop: Split View */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-4 min-h-[60vh]">
            <textarea
              ref={textareaDesktopRef}
              value={content}
              onChange={(e) => { setSaved(false); setContent(e.target.value); }}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              placeholder="Write your markdown here..."
              className={`${textareaClass} h-full`}
            />
            <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-auto">
              <MarkdownRenderer content={deferredContent} />
            </div>
          </div>

          {/* Mobile/Tablet: Tab View */}
          <div className="lg:hidden">
            <Tabs.Root defaultValue="write">
              <Tabs.List className="flex border-b border-gray-200 mb-4">
                <Tabs.Tab
                  value="write"
                  className="px-4 py-2 text-sm font-medium text-gray-500 data-[selected]:text-blue-600 data-[selected]:border-b-2 data-[selected]:border-blue-600 transition-colors"
                >
                  Write
                </Tabs.Tab>
                <Tabs.Tab
                  value="preview"
                  className="px-4 py-2 text-sm font-medium text-gray-500 data-[selected]:text-blue-600 data-[selected]:border-b-2 data-[selected]:border-blue-600 transition-colors"
                >
                  Preview
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="write">
                <textarea
                  ref={textareaMobileRef}
                  value={content}
                  onChange={(e) => { setSaved(false); setContent(e.target.value); }}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  placeholder="Write your markdown here..."
                  className={`${textareaClass} min-h-[50vh]`}
                />
              </Tabs.Panel>
              <Tabs.Panel value="preview">
                <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-[50vh]">
                  <MarkdownRenderer content={deferredContent} />
                </div>
              </Tabs.Panel>
            </Tabs.Root>
          </div>

          {/* Save button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || regenerating || !title.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : regenerating ? 'Generating AI...' : 'Save'}
            </button>
            {regenerating && (
              <span className="text-xs text-gray-400">AI가 메타데이터를 생성하고 있습니다...</span>
            )}
          </div>
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
