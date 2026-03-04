import { useState, useCallback, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onUpload: (title: string, content: string) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.md')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const title = file.name.replace(/\.md$/, '');
      onUpload(title, content);
    };
    reader.readAsText(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.md'));
    if (files.length > 0) processFile(files[0]);
  }, [processFile]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFile(files[0]);
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-white'
      }`}
    >
      <div className="text-gray-500">
        <p className="text-lg font-medium">Drop .md file here</p>
        <p className="text-sm mt-1">or click to browse</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".md"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
