import { useState, FormEvent } from 'react';
import { Send, AlertCircle, RefreshCcw, Wifi, WifiOff, Server, Settings, ShieldAlert } from 'lucide-react';
import { ProviderType } from '../lib/types';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  onRetry?: () => void;
  provider: ProviderType;
  disabled?: boolean;
  error?: string | null;
  lastMessage?: string;
}

export const ChatInput = ({ 
  onSend, 
  onRetry, 
  provider, 
  disabled, 
  error, 
  lastMessage 
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    
    if (trimmedInput && !disabled && !isSubmitting) {
      try {
        setIsSubmitting(true);
        await onSend(trimmedInput);
        setInput('');
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Determine error type for appropriate UI feedback
  const isNetworkError = error?.toLowerCase().includes('network') || 
                        error?.toLowerCase().includes('unable to connect') ||
                        error?.toLowerCase().includes('failed to fetch');
  const isServerError = error?.includes('500') || 
                       error?.toLowerCase().includes('server error') ||
                       error?.toLowerCase().includes('internal server error');
  const isTimeoutError = error?.toLowerCase().includes('timeout') ||
                        error?.toLowerCase().includes('took too long');
  const isAuthError = error?.toLowerCase().includes('api key') || 
                     error?.toLowerCase().includes('unauthorized') ||
                     error?.toLowerCase().includes('authentication');
  const isRateLimitError = error?.toLowerCase().includes('rate limit') ||
                          error?.toLowerCase().includes('too many requests');

  return (
    <div className="py-4 space-y-2">
      {error && (
        <div className={`flex flex-col gap-3 p-4 text-sm rounded-2xl mb-2 ${
          isServerError ? 'bg-red-50 border border-red-200 text-red-800' :
          isNetworkError ? 'bg-amber-50 border border-amber-200 text-amber-800' :
          isAuthError ? 'bg-violet-50 border border-violet-200 text-violet-800' :
          'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {isNetworkError ? (
              <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : isServerError ? (
              <Server className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : isAuthError ? (
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium mb-1">
                {isServerError ? 'Server Error' :
                 isNetworkError ? 'Network Error' :
                 isTimeoutError ? 'Request Timeout' :
                 isAuthError ? 'Authentication Error' :
                 isRateLimitError ? 'Rate Limit Exceeded' :
                 'Error'}
              </div>
              <div className="whitespace-pre-wrap">{error}</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {onRetry && lastMessage && (
              <button
                onClick={onRetry}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isServerError ? 'bg-red-100 hover:bg-red-200 text-red-700' :
                  isNetworkError ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' :
                  isAuthError ? 'bg-violet-100 hover:bg-violet-200 text-violet-700' :
                  'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                <RefreshCcw className="w-4 h-4" />
                Retry last message
              </button>
            )}
            
            {isNetworkError && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
              >
                <Wifi className="w-4 h-4" />
                Check Connection
              </button>
            )}
            
            {isServerError && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <Server className="w-4 h-4" />
                Reload Application
              </button>
            )}

            {isAuthError && (
              <button
                onClick={() => document.querySelector<HTMLButtonElement>('[title="Settings"]')?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Check API Settings
              </button>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${provider}...`}
          disabled={disabled || isSubmitting}
          className="flex-1 p-3 bg-zinc-100/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] max-h-32 resize-none transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled || isSubmitting}
          className="p-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-indigo-600"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};