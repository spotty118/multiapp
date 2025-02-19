import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [isLoading, setIsLoading] = useLocalStorage('app-loading', true);
  const [loadError, setLoadError] = useLocalStorage<Error | null>('app-error', null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Test localStorage availability with modern pattern
        if (!('localStorage' in window)) {
          throw new Error('LocalStorage is not available');
        }

        // Modern storage quota check
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage && estimate.quota - estimate.usage < 1000000) {
          console.warn('Storage space is running low');
        }

        // Simulate checking critical resources
        await Promise.all([
          // Add any critical resource loading here
          new Promise(resolve => setTimeout(resolve, 1000)) // Minimum loading time
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoadError(error as Error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setIsLoading, setLoadError]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
        <div className="text-center p-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl shadow-lg">
          <h1 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Failed to Load Application
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mb-4">
            {loadError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
