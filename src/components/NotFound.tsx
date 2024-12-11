import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-zinc-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-zinc-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
