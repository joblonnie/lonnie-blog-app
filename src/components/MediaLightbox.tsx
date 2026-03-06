import { useEffect } from 'react';

interface MediaLightboxProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  onClose: () => void;
}

export default function MediaLightbox({ src, type, alt, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl leading-none cursor-pointer hover:opacity-70"
        aria-label="Close"
      >
        &times;
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        {type === 'image' ? (
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            loop
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        )}
      </div>
    </div>
  );
}
