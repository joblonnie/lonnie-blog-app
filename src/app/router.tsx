import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DocumentList from '@/components/DocumentList';
import DocumentEditor from '@/components/DocumentEditor';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import AskAI from '@/components/AskAI';
import ServerError from '@/components/ServerError';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminDocDetail from '@/components/admin/AdminDocDetail';
import LoginPage from '@/components/auth/LoginPage';
import BlogLayout from '@/components/blog/BlogLayout';
import BlogHome from '@/components/blog/BlogHome';
import BlogPost from '@/components/blog/BlogPost';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Public blog routes
      {
        element: <BlogLayout />,
        children: [
          { path: '/', element: <BlogHome /> },
          { path: '/post/:id', element: <BlogPost /> },
        ],
      },
      // Login
      { path: '/login', element: <LoginPage /> },
      // Admin routes
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DocumentList /> },
          { path: 'doc/:id', element: <AdminDocDetail /> },
          { path: 'doc/:id/edit', element: <DocumentEditor /> },
          { path: 'new', element: <DocumentEditor /> },
          { path: 'graph', element: <KnowledgeGraph /> },
          { path: 'ask', element: <AskAI /> },
          { path: 'dashboard', element: <AdminDashboard /> },
        ],
      },
      // Error
      { path: '/error', element: <ServerError /> },
    ],
  },
]);
