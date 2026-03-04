import { useParams, Link, useNavigate } from 'react-router-dom';
import { Separator } from '@base-ui-components/react/separator';
import { useDocument } from '@/hooks/useDocuments';
import MarkdownRenderer from './MarkdownRenderer';

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document, loading } = useDocument(id ? Number(id) : undefined);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!document) {
    return <div className="text-center py-12 text-gray-500">Document not found</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12,4 6,10 12,16" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        </div>
        <Link
          to={`/doc/${document.id}/edit`}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Updated {new Date(document.updatedAt).toLocaleDateString('ko-KR')}
      </p>
      <Separator className="my-6 border-t border-gray-200" />
      <MarkdownRenderer content={document.content} />
    </div>
  );
}
