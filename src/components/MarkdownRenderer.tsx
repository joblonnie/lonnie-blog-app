import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default memo(function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </Markdown>
    </div>
  );
});
