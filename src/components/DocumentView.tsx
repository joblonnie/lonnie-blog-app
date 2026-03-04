import { useParams, Link } from 'react-router-dom';
import { Separator } from '@base-ui-components/react/separator';
import { useDocument } from '@/hooks/useDocuments';
import MarkdownRenderer from './MarkdownRenderer';

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
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
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
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
