import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentList } from '@/hooks/useDocuments';

export default function DocumentList() {
  const { documents, loading } = useDocumentList();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && documents.length > 0) {
      navigate(`/doc/${documents[0].id}`, { replace: true });
    }
  }, [loading, documents, navigate]);

  if (loading) return null;

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No documents yet</p>
        <p className="text-gray-300 text-sm mt-2">Create a new one to get started</p>
      </div>
    );
  }

  return null;
}
