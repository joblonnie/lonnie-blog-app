export default function DropZone({
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
  label = 'Drop here',
}: {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
  label?: string;
}) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed flex items-center justify-center h-full min-h-[200px] transition-colors ${
        dragOver
          ? 'border-blue-400 bg-blue-50 text-blue-500'
          : 'border-gray-300 text-gray-400'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="text-center">
        <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
