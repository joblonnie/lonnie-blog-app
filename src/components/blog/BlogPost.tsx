import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPublicPost, fetchPublicPosts, trackPageView } from '@/lib/api';
import type { BlogPost as BlogPostType, BlogPostDetail } from '@/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { InfoPanelMobile } from '@/components/InfoPanel';
import SplitSidebar from '@/components/SplitSidebar';
import ContentSearchBar from '@/components/ContentSearchBar';
import { useContentSearch } from '@/hooks/useContentSearch';
import { extractToc } from '@/lib/toc';
import { subscribeMobile, getIsMobile } from '@/lib/mobile';

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile);

  // Split view state
  const [splitId, setSplitId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splitPost, setSplitPost] = useState<BlogPostDetail | null>(null);
  const [posts, setPosts] = useState<BlogPostType[]>([]);

  const contentSearch = useContentSearch(post?.content);

  // Ctrl/Cmd+F to open content search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        contentSearch.open();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contentSearch]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    fetchPublicPost(Number(id))
      .then((p) => {
        setPost(p);
        trackPageView({ path: `/post/${id}`, documentId: Number(id) });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch post list for sidebar (lazy, only when sidebar first opens)
  useEffect(() => {
    if (!sidebarOpen || posts.length > 0) return;
    fetchPublicPosts()
      .then(setPosts)
      .catch(() => {});
  }, [sidebarOpen, posts.length]);

  // Fetch split post
  useEffect(() => {
    if (splitId == null) { setSplitPost(null); return; }
    let cancelled = false;
    fetchPublicPost(splitId)
      .then((p) => { if (!cancelled) setSplitPost(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [splitId]);

  const toc = useMemo(() => {
    if (!post) return [];
    return extractToc(post.content);
  }, [post]);

  const sidebarItems = useMemo(() => posts.map((p) => ({
    id: p.id,
    title: p.title,
    date: p.createdAt,
    category: p.category,
  })), [posts]);

  const handleSplitSelect = useCallback((selectedId: number) => {
    setSplitId(selectedId);
    setSidebarOpen(false);
  }, []);

  // Reset split when navigating to different post
  useEffect(() => {
    setSplitId(null);
    setSplitPost(null);
    setSidebarOpen(false);
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="space-y-2 mt-8">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Post not found</h1>
        <p className="text-gray-500 mb-4">This post may be private or doesn&apos;t exist.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          &larr; All posts
        </Link>
      </div>
    );
  }

  const hasSplit = splitId !== null && splitPost !== null;

  return (
    <>
      {contentSearch.isOpen && (
        <ContentSearchBar
          query={contentSearch.query}
          setQuery={contentSearch.setQuery}
          matchCount={contentSearch.matchCount}
          currentIndex={contentSearch.currentIndex}
          goNext={contentSearch.goNext}
          goPrev={contentSearch.goPrev}
          onClose={contentSearch.close}
        />
      )}

      {sidebarOpen && (
        <SplitSidebar
          items={sidebarItems}
          currentId={Number(id)}
          selectedId={splitId}
          onSelect={handleSplitSelect}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className={hasSplit ? 'grid grid-cols-2 gap-6' : 'lg:flex lg:gap-8'}>
        {/* Main content */}
        <article className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">
              &larr; All posts
            </Link>
            {!isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-3 py-1 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Compare
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{post.title}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {post.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.topics.map((t) => (
                  <span
                    key={t.name}
                    className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <InfoPanelMobile
              topics={post.topics}
              summary={post.summary}
              keywords={post.keywords}
              content={post.content}
            />
          </div>

          <div ref={contentSearch.containerRef}>
            <MarkdownRenderer content={post.content} />
          </div>
        </article>

        {/* Split panel (when comparing) */}
        {hasSplit && splitPost && (
          <article className="flex-1 min-w-0 border-l border-gray-200 pl-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 truncate">{splitPost.title}</h2>
              <button
                onClick={() => setSplitId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Close split"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-gray-500">
                {new Date(splitPost.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {splitPost.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {splitPost.topics.map((t) => (
                    <span
                      key={t.name}
                      className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <InfoPanelMobile
                topics={splitPost.topics}
                summary={splitPost.summary}
                keywords={splitPost.keywords}
                content={splitPost.content}
              />
            </div>

            <MarkdownRenderer content={splitPost.content} />
          </article>
        )}

        {/* TOC sidebar (desktop only, hidden in split mode) */}
        {!hasSplit && toc.length > 0 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Table of Contents</h3>
              <nav className="space-y-1.5">
                {toc.map((item) => (
                  <a
                    key={item.slug}
                    href={`#${item.slug}`}
                    className="block text-sm text-gray-500 hover:text-gray-900 transition-colors truncate"
                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.slug)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
