import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { ChatView } from '../components/ChatView';
import { NotFound } from '../components/NotFound';
import { getChats } from './store';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: 'chat',
        element: <ChatView initialChats={getChats()} />,
      },
      {
        path: 'chat/:chatId',
        element: <ChatView initialChats={getChats()} />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
