import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs } from '@base-ui-components/react/tabs';
import { useDocument } from '@/hooks/useDocuments';
import { useToast } from '@/hooks/useToast';
import { createDocument, updateDocument } from '@/lib/api';
import MarkdownRenderer from './MarkdownRenderer';
import Toast from './Toast';

const textareaClass = 'w-full p-4 bg-white border border-gray-200 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { document, loading } = useDocument(isNew ? undefined : Number(id));
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const deferredContent = useDeferredValue(content);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content);
    }
  }, [document]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const doc = await createDocument({ title, content });
        toast.show('Document created');
        navigate(`/doc/${doc.id}`, { replace: true });
      } else {
        await updateDocument(Number(id), { title, content });
        toast.show('Document saved');
      }
    } catch {
      toast.show('Save failed');
    } finally {
      setSaving(false);
    }
  }, [title, content, isNew, id, navigate, toast]);

  if (!isNew && loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="flex-1 text-xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none py-2 text-gray-900 placeholder-gray-400"
        />
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Desktop: Split View */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4 min-h-[60vh]">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
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

      <Toast message={toast.message} />
    </div>
  );
}
