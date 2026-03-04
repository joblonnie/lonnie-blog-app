import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import DocumentList from '@/components/DocumentList';
import DocumentView from '@/components/DocumentView';
import DocumentEditor from '@/components/DocumentEditor';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DocumentList /> },
      { path: 'doc/:id', element: <DocumentView /> },
      { path: 'doc/:id/edit', element: <DocumentEditor /> },
      { path: 'new', element: <DocumentEditor /> },
    ],
  },
]);
