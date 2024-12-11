import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-zinc-800">
          Loading MultiMind...
        </h1>
      </div>
    </div>
  );
}
