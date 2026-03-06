import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface CommandItem {
  label: string;
  description: string;
  action: (editor: Editor) => void;
}

const COMMANDS: CommandItem[] = [
  { label: 'Heading 1', description: '큰 제목', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', description: '중간 제목', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', description: '작은 제목', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', description: '순서 없는 목록', action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Ordered List', description: '순서 있는 목록', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Task List', description: '체크리스트', action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Code Block', description: '코드 블록', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Blockquote', description: '인용문', action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Horizontal Rule', description: '구분선', action: (e) => e.chain().focus().setHorizontalRule().run() },
];

interface SlashCommandMenuProps {
  editor: Editor;
}

export default function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const execute = useCallback(
    (cmd: CommandItem) => {
      // Delete the slash and query text
      const { from } = editor.state.selection;
      const slashPos = from - query.length - 1;
      editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();
      cmd.action(editor);
      close();
    },
    [editor, query, close],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filtered[selectedIndex]) execute(filtered[selectedIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, filtered, selectedIndex, execute, close]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        '\n',
      );

      const match = textBefore.match(/\/([a-zA-Z0-9]*)$/);

      if (match) {
        setQuery(match[1]);
        setSelectedIndex(0);

        // Get cursor position for menu placement
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        setPosition({
          top: coords.bottom - editorRect.top + 8,
          left: coords.left - editorRect.left,
        });

        setOpen(true);
      } else {
        if (open) close();
      }
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, open, close]);

  // Reset index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const selected = menuRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execute(cmd)}
          className={`w-full text-left px-3 py-2 flex flex-col transition-colors ${
            i === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm font-medium">{cmd.label}</span>
          <span className="text-xs text-gray-400">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
