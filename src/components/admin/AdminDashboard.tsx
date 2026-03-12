import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAnalyticsDashboard,
  fetchTopDocuments,
  fetchTopReferrers,
  fetchPopularTopics,
} from '@/lib/api';
import type { AnalyticsSummary, TopDocument, TopReferrer, PopularTopic } from '@/types';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topDocs, setTopDocs] = useState<TopDocument[]>([]);
  const [topRefs, setTopRefs] = useState<TopReferrer[]>([]);
  const [popTopics, setPopTopics] = useState<PopularTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsDashboard(),
      fetchTopDocuments(),
      fetchTopReferrers(),
      fetchPopularTopics(),
    ])
      .then(([s, d, r, t]) => {
        setSummary(s);
        setTopDocs(d);
        setTopRefs(r);
        setPopTopics(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxDailyCount = useMemo(() => {
    if (!summary?.daily.length) return 1;
    return Math.max(...summary.daily.map((d) => d.count), 1);
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="오늘 조회수" value={summary?.today ?? 0} />
        <SummaryCard label="이번 주 조회수" value={summary?.thisWeek ?? 0} description="월요일부터" />
        <SummaryCard label="이번 달 조회수" value={summary?.thisMonth ?? 0} />
        <SummaryCard label="전체 조회수" value={summary?.total ?? 0} />
      </div>

      {/* Daily chart */}
      {summary && summary.daily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">일별 조회수 (최근 30일)</h2>
          <div className="flex items-end gap-1 h-32">
            {summary.daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 min-w-0 group relative"
                title={`${d.date}: ${d.count}회 조회`}
              >
                <div
                  className="bg-blue-500 rounded-t-sm w-full transition-all hover:bg-blue-600"
                  style={{
                    height: `${Math.max((d.count / maxDailyCount) * 100, 2)}%`,
                  }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                  {d.count}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{summary.daily[0]?.date.slice(5)}</span>
            <span>{summary.daily[summary.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">인기 문서 (조회수 순)</h2>
          {topDocs.length === 0 ? (
            <p className="text-sm text-gray-400">아직 데이터가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {topDocs.map((doc, i) => (
                <Link
                  key={doc.id}
                  to={`/admin/doc/${doc.id}/edit`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                  <span className="text-sm text-gray-900 truncate flex-1">{doc.title}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{doc.views}회</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top referrers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">유입 경로</h2>
          {topRefs.length === 0 ? (
            <p className="text-sm text-gray-400">아직 데이터가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {topRefs.map((ref, i) => (
                <div
                  key={ref.referrer}
                  className="flex items-center gap-3 p-2"
                >
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                  <span className="text-sm text-gray-700 truncate flex-1">{ref.referrer}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{ref.count}회</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popular topics */}
      {popTopics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">인기 토픽 (조회수 순)</h2>
          <div className="flex flex-wrap gap-2">
            {popTopics.map((topic) => (
              <span
                key={topic.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: topic.color }}
              >
                {topic.name}
                <span className="text-xs opacity-75">{topic.views}회</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, description }: { label: string; value: number; description?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">회</span></p>
      {description && <p className="text-[10px] text-gray-400 mt-0.5">{description}</p>}
    </div>
  );
}
