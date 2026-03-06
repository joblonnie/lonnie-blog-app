import { useMemo, useState } from 'react';
import { Collapsible } from '@base-ui-components/react/collapsible';
import { extractToc } from '@/lib/toc';

import type { DocumentTopic } from '@/types';

interface InfoPanelProps {
  topics: DocumentTopic[];
  summary: string | null;
  keywords: string[];
  content: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
      <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
      <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
    </div>
  );
}

function PanelContent({ topics, summary, keywords, content, onRegenerate, regenerating }: InfoPanelProps) {
  const toc = useMemo(() => extractToc(content), [content]);

  return (
    <div className="space-y-5">
      {/* Topics */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Topics</h3>
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span
                key={t.name}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <SkeletonChips />
        )}
      </section>

      {/* Summary */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</h3>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
          )}
        </div>
        {summary ? (
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        ) : (
          <SkeletonLines />
        )}
      </section>

      {/* Keywords */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Keywords</h3>
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <SkeletonChips />
        )}
      </section>

      {/* TOC */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Table of Contents</h3>
        {toc.length > 0 ? (
          <nav className="space-y-1">
            {toc.map((item, i) => (
              <a
                key={i}
                href={`#${item.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.slug);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="block text-sm text-gray-600 hover:text-blue-600 transition-colors truncate"
                style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
              >
                {item.text}
              </a>
            ))}
          </nav>
        ) : (
          <SkeletonLines />
        )}
      </section>
    </div>
  );
}

export function InfoPanelDesktop(props: InfoPanelProps) {
  return (
    <div className="w-72 shrink-0 self-stretch">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto bg-white rounded-xl border border-gray-200 p-5">
        <PanelContent {...props} />
      </div>
    </div>
  );
}

export function InfoPanelMobile(props: InfoPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <polyline points="6,3 11,8 6,13" />
        </svg>
        Document Info
      </Collapsible.Trigger>
      <Collapsible.Panel className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <PanelContent {...props} />
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
