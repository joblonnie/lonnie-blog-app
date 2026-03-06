import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL = 5000;

export default function ServerError() {
  const navigate = useNavigate();
  const polling = useRef(true);

  const checkServer = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        navigate('/', { replace: true });
        return true;
      }
    } catch {
      // still failing
    }
    return false;
  }, [navigate]);

  useEffect(() => {
    polling.current = true;
    const poll = async () => {
      while (polling.current) {
        const ok = await checkServer();
        if (ok || !polling.current) break;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
    };
    poll();
    return () => { polling.current = false; };
  }, [checkServer]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">서버에 연결할 수 없습니다</h2>
        <p className="mt-2 text-gray-500">서버 연결을 시도하고 있습니다. 잠시만 기다려 주세요.</p>
        <div className="mt-6 flex justify-center">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
