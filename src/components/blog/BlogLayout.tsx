import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { trackPageView } from '@/lib/api';
import ScrollToTop from '@/components/ScrollToTop';

export default function BlogLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const initialReferrer = useRef(document.referrer);
  const lastPath = useRef('');

  // Track page views on route change
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    trackPageView({
      path: location.pathname,
      referrer: initialReferrer.current || undefined,
    });
    // Only send referrer on first load
    initialReferrer.current = '';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gray-900 hover:text-gray-700">
            Lonnie's Blog
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            {user ? (
              <Link
                to="/admin"
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Admin
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Lonnie's Blog. All rights reserved.
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
