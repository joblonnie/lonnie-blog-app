import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DocumentList from '@/components/DocumentList';
import DocumentEditor from '@/components/DocumentEditor';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import AskAI from '@/components/AskAI';
import ServerError from '@/components/ServerError';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DocumentList /> },
      { path: 'doc/:id/edit', element: <DocumentEditor /> },
      { path: 'new', element: <DocumentEditor /> },
      { path: 'graph', element: <KnowledgeGraph /> },
      { path: 'ask', element: <AskAI /> },
    ],
  },
  {
    path: '/error',
    element: <ServerError />,
  },
]);
