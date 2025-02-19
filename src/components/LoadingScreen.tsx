import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export function LoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading application...');
  const [loadAttempt, setLoadAttempt] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetry(true);
      setLoadingText('Loading is taking longer than expected');
    }, 5000); // Show retry after 5 seconds

    return () => clearTimeout(timer);
  }, [loadAttempt]);

  const handleRetry = () => {
    setShowRetry(false);
    setLoadingText('Retrying load...');
    setLoadAttempt(prev => prev + 1);
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
        
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          MultiMind Chat
        </h1>
        
        <p className="text-zinc-600 mb-4">
          {loadingText}
        </p>

        {showRetry && (
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
}