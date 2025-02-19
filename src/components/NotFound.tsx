import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Page Not Found</h1>
          <p className="text-zinc-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          Return Home
        </button>
      </div>
    </div>
  );
};