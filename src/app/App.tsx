import { Outlet } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </AuthProvider>
  );
}
