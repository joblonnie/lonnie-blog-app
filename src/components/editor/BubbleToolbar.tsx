import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useCallback, useState } from 'react';

interface BubbleToolbarProps {
  editor: Editor;
}

export default function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [linkInput, setLinkInput] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  const toggleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const existing = editor.getAttributes('link').href ?? '';
    setLinkInput(existing);
    setShowLinkForm(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkInput.trim()) {
      editor.chain().focus().setLink({ href: linkInput.trim() }).run();
    }
    setShowLinkForm(false);
    setLinkInput('');
  }, [editor, linkInput]);

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`;

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 bg-gray-800 rounded-lg shadow-xl px-1 py-1"
    >
      {showLinkForm ? (
        <form
          onSubmit={(e) => { e.preventDefault(); applyLink(); }}
          className="flex items-center gap-1 px-1"
        >
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://..."
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 w-48 outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
          <button type="submit" className={btn(false)}>OK</button>
          <button type="button" onClick={() => setShowLinkForm(false)} className={btn(false)}>
            &times;
          </button>
        </form>
      ) : (
        <>
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={btn(editor.isActive('heading', { level }))}
            >
              H{level}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-600 mx-0.5" />
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btn(editor.isActive('bold'))} font-bold`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btn(editor.isActive('italic'))} italic`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${btn(editor.isActive('strike'))} line-through`}
          >
            S
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`${btn(editor.isActive('code'))} font-mono`}
          >
            {'<>'}
          </button>
          <div className="w-px h-4 bg-gray-600 mx-0.5" />
          <button
            onClick={toggleLink}
            className={btn(editor.isActive('link'))}
          >
            Link
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
