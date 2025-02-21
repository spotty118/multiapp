import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { ChatView } from '../components/ChatView';
import { NotFound } from '../components/NotFound';
import { ProxyGuide } from '../components/ProxyGuide';
import { getChats } from './store';
import { LoadingScreen } from '../components/LoadingScreen';

// Create router with loading states
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    // Provide the component function, not a JSX element
    HydrateFallback: LoadingScreen,
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: 'chat',
        element: <ChatView initialChats={getChats()} />,
        loader: async () => {
          // Add any route-specific data loading here
          await new Promise(resolve => setTimeout(resolve, 500)); // Minimum loader time
          return { chats: getChats() };
        },
        // Provide the component function, not a JSX element
        HydrateFallback: LoadingScreen,
      },
      {
        path: 'chat/:chatId',
        element: <ChatView initialChats={getChats()} />,
        loader: async ({ params }) => {
          // Add any route-specific data loading here
          await new Promise(resolve => setTimeout(resolve, 500)); // Minimum loader time
          const chats = getChats();
          const chat = chats.find(c => c.id === params.chatId);
          if (!chat) {
            throw new Error('Chat not found');
          }
          return { chat, chats };
        },
        // Provide the component function, not a JSX element
        HydrateFallback: LoadingScreen,
      },
      {
        path: 'proxy-guide',
        element: <ProxyGuide />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
], {
  future: {
    // Enable React 18 transitions
    // v7_startTransition removed as it's not supported in current version              // Enable React 18 transitions
    v7_relativeSplatPath: true,            // Enable relative splat paths
    v7_fetcherPersist: true,              // Persist fetcher results
    v7_normalizeFormMethod: true,          // Normalize form methods
    v7_partialHydration: true,             // Enable partial hydration
    // v7_prependBasename removed as it's not supported              // Enable prepending basename
    // v7_skipEntireTreeOnNullChild removed as it's not supported    // Skip entire tree on null child
    // v7_unwrapElementsByDefault removed as it's not supported      // Unwrap elements by default
    // v7_skipActionErrorRevalidation removed as it's not supported   // Skip revalidation on action errors
  }
});