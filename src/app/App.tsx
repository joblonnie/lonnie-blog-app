import { useState, useCallback, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, toastManager } from '@/components/Toast';
import { createDocument } from '@/lib/api';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const handleCreate = useCallback(async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const doc = await createDocument({ title: 'Untitled', content: '' });
      navigate(`/doc/${doc.id}/edit`);
    } catch {
      toastManager.add({ title: 'Create failed' });
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [navigate]);

  const isHome = location.pathname === '/';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="text-lg font-bold text-gray-900 hover:text-gray-700 shrink-0">
              Lonnie Blog
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isHome
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="hidden sm:inline">Docs</span>
              </Link>
              <Link
                to="/graph"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/graph'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="12" cy="18" r="3" />
                  <line x1="8.5" y1="7.5" x2="10.5" y2="16" />
                  <line x1="15.5" y1="7.5" x2="13.5" y2="16" />
                </svg>
                <span className="hidden sm:inline">Graph</span>
              </Link>
              <Link
                to="/ask"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/ask'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="hidden sm:inline">AI Ask</span>
              </Link>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-1 ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="7" y1="2" x2="7" y2="12" />
                  <line x1="2" y1="7" x2="12" y2="7" />
                </svg>
                <span className="hidden sm:inline">Create</span>
              </button>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
