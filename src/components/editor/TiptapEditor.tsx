import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useCallback, useRef } from 'react';
import { getUploadUrl, uploadFileToS3 } from '@/lib/api';
import { toastManager } from '@/components/Toast';
import BubbleToolbar from './BubbleToolbar';
import SlashCommandMenu from './SlashCommandMenu';

const ALLOWED_MEDIA_TYPES = /^(image|video)\//;

function isMarkdownFile(file: File): boolean {
  return file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown';
}

interface TiptapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const initialContentRef = useRef(content);
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder ?? 'Type \'/\' for commands...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContentRef.current,
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        onChange((editor.storage as Record<string, any>).markdown.getMarkdown());
      }
    },
  });

  // Sync external content changes (e.g., initial load from DB)
  useEffect(() => {
    if (!editor) return;
    const currentMd = (editor.storage as Record<string, any>).markdown.getMarkdown();
    if (content !== currentMd) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content);
      isExternalUpdate.current = false;
    }
  }, [content, editor]);

  const handleMarkdownFile = useCallback(
    (file: File) => {
      if (!editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        const md = reader.result as string;
        editor.commands.setContent(md);
        onChange(md);
        toastManager.add({ title: `${file.name} loaded` });
      };
      reader.onerror = () => {
        toastManager.add({ title: 'Failed to read file' });
      };
      reader.readAsText(file);
    },
    [editor, onChange],
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor || !ALLOWED_MEDIA_TYPES.test(file.type)) {
        toastManager.add({ title: 'Only image and video files are supported' });
        return;
      }

      // Insert placeholder image
      const placeholderSrc = `uploading-${file.name}`;
      editor.chain().focus().setImage({ src: placeholderSrc, alt: `Uploading ${file.name}...` }).run();

      try {
        const { uploadUrl, publicUrl } = await getUploadUrl(file.name, file.type);
        await uploadFileToS3(uploadUrl, file);

        // Replace placeholder with actual URL
        const { doc } = editor.state;
        let replaced = false;
        doc.descendants((node, pos) => {
          if (replaced) return false;
          if (node.type.name === 'image' && node.attrs.src === placeholderSrc) {
            editor
              .chain()
              .focus()
              .setNodeSelection(pos)
              .setImage({ src: publicUrl, alt: file.name })
              .run();
            replaced = true;
            return false;
          }
        });

        toastManager.add({ title: 'Upload complete' });
      } catch {
        // Remove placeholder on failure
        const { doc } = editor.state;
        doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === placeholderSrc) {
            editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
            return false;
          }
        });
        toastManager.add({ title: 'Upload failed' });
      }
    },
    [editor],
  );

  // Handle drop events
  useEffect(() => {
    if (!editor || !editor.view?.dom) return;

    const dom = editor.view.dom;

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files) return;
      for (const file of files) {
        if (isMarkdownFile(file)) {
          event.preventDefault();
          handleMarkdownFile(file);
          return;
        }
        if (ALLOWED_MEDIA_TYPES.test(file.type)) {
          event.preventDefault();
          handleImageUpload(file);
          return;
        }
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (ALLOWED_MEDIA_TYPES.test(item.type)) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          return;
        }
      }
    };

    dom.addEventListener('drop', handleDrop);
    dom.addEventListener('paste', handlePaste);
    return () => {
      dom.removeEventListener('drop', handleDrop);
      dom.removeEventListener('paste', handlePaste);
    };
  }, [editor, handleImageUpload, handleMarkdownFile]);

  if (!editor) return null;

  return (
    <div className="relative">
      <BubbleToolbar editor={editor} />
      <SlashCommandMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="tiptap-editor prose prose-sm max-w-none min-h-[60vh] bg-white border border-gray-200 rounded-xl p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
      />
    </div>
  );
}
