import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicPosts } from '@/lib/api';
import type { BlogPost } from '@/types';

// --- Post Card ---
function PostCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer select-none flex flex-col"
    >
      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{post.title}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs text-gray-400">
          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
        </span>
        {post.category && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
            {post.category}
          </span>
        )}
      </div>
      {post.summary && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{post.summary}</p>
      )}
      {post.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.topics.slice(0, 3).map((t) => (
            <span
              key={t.name}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
            </span>
          ))}
          {post.topics.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
              +{post.topics.length - 3}
            </span>
          )}
        </div>
      )}
      {post.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600"
            >
              {kw}
            </span>
          ))}
          {post.keywords.length > 4 && (
            <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
              +{post.keywords.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main BlogHome ---
export default function BlogHome() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicPosts()
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive topics and categories from posts (no extra fetches needed)
  const topics = useMemo(() => {
    const topicMap = new Map<string, { name: string; color: string }>();
    for (const p of posts) {
      for (const t of p.topics) {
        if (!topicMap.has(t.name)) topicMap.set(t.name, { name: t.name, color: t.color });
      }
    }
    return Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [posts]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of posts) {
      if (p.category) cats.add(p.category);
    }
    return [...cats].sort();
  }, [posts]);

  // Client-side filtering: category then topic (no extra fetch)
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedCategory) result = result.filter((p) => p.category === selectedCategory);
    if (selectedTopic) result = result.filter((p) => p.topics.some((t) => t.name === selectedTopic));
    return result;
  }, [posts, selectedCategory, selectedTopic]);

  // Group posts by category
  const groupedPosts = useMemo(() => {
    if (selectedCategory) return null;
    const groups = new Map<string, BlogPost[]>();
    const uncategorized: BlogPost[] = [];
    for (const post of filteredPosts) {
      if (post.category) {
        const arr = groups.get(post.category);
        if (arr) arr.push(post);
        else groups.set(post.category, [post]);
      } else {
        uncategorized.push(post);
      }
    }
    const result: { label: string; posts: BlogPost[] }[] = [];
    for (const cat of [...groups.keys()].sort()) {
      result.push({ label: cat, posts: groups.get(cat)! });
    }
    if (uncategorized.length > 0) {
      result.push({ label: 'Uncategorized', posts: uncategorized });
    }
    return result;
  }, [filteredPosts, selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-14 bg-gray-100 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !selectedCategory) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lonnie's Blog</h1>
        <p className="text-gray-500">No posts published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setSelectedCategory(null); setSelectedTopic(null); }}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setSelectedTopic(null); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Topic filter */}
      {topics.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTopic(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTopic === null
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Topics
          </button>
          {topics.map((topic) => (
            <button
              key={topic.name}
              onClick={() => setSelectedTopic(selectedTopic === topic.name ? null : topic.name)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedTopic === topic.name ? 'text-white' : 'text-gray-600 hover:opacity-80'
              }`}
              style={
                selectedTopic === topic.name
                  ? { backgroundColor: topic.color }
                  : { backgroundColor: `${topic.color}20`, color: topic.color }
              }
            >
              {topic.name}
            </button>
          ))}
        </div>
      )}

      {/* Post card grid — grouped by category or flat */}
      {groupedPosts && groupedPosts.length > 1 ? (
        groupedPosts.map(({ label, posts: groupPosts }) => (
          <div key={label}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">{label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => navigate(`/post/${post.id}`)}
            />
          ))}
        </div>
      )}

      {filteredPosts.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No posts found.
        </div>
      )}
    </div>
  );
}
