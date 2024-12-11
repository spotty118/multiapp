import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { Provider } from '../lib/types';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  onRetry?: () => void;
  provider: Provider;
  disabled?: boolean;
  error?: string | null;
  lastMessage?: string;
}

export function ChatInput({
  onSend,
  onRetry,
  provider,
  disabled,
  error,
  lastMessage
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSend(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isConnectionError = error?.toLowerCase().includes('connection refused');

  return (
    <form onSubmit={handleSubmit} className="relative">
      {error && (
        <div className="absolute -top-16 left-0 right-0">
          <div className={`p-3 rounded-lg text-sm ${
            isConnectionError ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
          }`}>
            <div className="flex items-start gap-2">
              <div className="flex-1">{error}</div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`p-1 rounded hover:bg-white/50 transition-colors ${
                    isConnectionError ? 'text-amber-700' : 'text-red-700'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 resize-none overflow-hidden bg-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
