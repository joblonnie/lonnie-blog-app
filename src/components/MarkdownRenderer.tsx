import { memo, useMemo, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import MediaLightbox from './MediaLightbox';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight, rehypeSlug];

const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

interface LightboxState {
  src: string;
  type: 'image' | 'video';
  alt?: string;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default memo(function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const components = useMemo<Components>(() => ({
    img({ src, alt, ...props }) {
      if (src && VIDEO_EXT.test(src)) {
        return (
          <video
            src={src}
            controls
            loop
            className="max-w-full rounded-lg cursor-pointer"
            onDoubleClick={() => setLightbox({ src, type: 'video', alt: alt ?? undefined })}
          >
            {alt}
          </video>
        );
      }
      return (
        <img
          src={src}
          alt={alt}
          {...props}
          className="cursor-pointer"
          onDoubleClick={() => src && setLightbox({ src, type: 'image', alt: alt ?? undefined })}
        />
      );
    },
  }), []);

  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </Markdown>
      {lightbox && (
        <MediaLightbox
          src={lightbox.src}
          type={lightbox.type}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
});
