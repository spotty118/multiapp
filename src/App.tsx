import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if localStorage is available
        const testKey = '_test_' + Math.random();
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);

        // Add any critical resource loading here
        await new Promise(resolve => setTimeout(resolve, 500)); // Minimum loading time

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoadError(error as Error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-red-600 mb-2">
            Failed to Load Application
          </h1>
          <p className="text-zinc-600 mb-4">
            {loadError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
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
      <Outlet />
    </ErrorBoundary>
  );
}

export default App;
