import { useEffect, useRef, useState } from 'react';
import { StopCircle, Trash2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Chat } from '../lib/types';
import { ChatInput } from './ChatInput';
import { ModelDropdown } from './ModelDropdown';
import { SettingsDialog } from './SettingsDialog';

interface MessagePanelProps {
  chat: Chat;
  onSend: (content: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onStopResponse?: () => void;
  onClearChat?: () => void;
  onModelChange?: (model: string, context: Chat['messages']) => void;
}

export const MessagePanel = ({
  chat,
  onSend,
  isLoading,
  error,
  onStopResponse,
  onClearChat,
  onModelChange,
}: MessagePanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  useEffect(() => {
    // Update last failed message when an error occurs
    if (error) {
      const lastUserMessage = [...chat.messages]
        .reverse()
        .find(m => m.role === 'user');
      if (lastUserMessage) {
        setLastFailedMessage(lastUserMessage.content);
      }
    } else {
      setLastFailedMessage(null);
    }
  }, [error, chat.messages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages.length]);

  const handleRetry = () => {
    if (lastFailedMessage) {
      onSend(lastFailedMessage);
    }
  };

  const handleModelChange = (model: string) => {
    if (onModelChange) {
      onModelChange(model, chat.messages); // Pass the chat context to the new model
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-zinc-200">
      <header className="px-4 py-3 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-800">
            {chat.title || 'New Chat'}
          </h2>
          <div className="flex items-center gap-2">
            <SettingsDialog />
            {isLoading && onStopResponse && (
              <button
                onClick={onStopResponse}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Stop generating"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            )}
            {onClearChat && (
              <button
                onClick={onClearChat}
                className="p-1.5 text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModelDropdown
            provider={chat.provider}
            model={chat.model}
            onModelChange={handleModelChange}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-4xl mx-auto">
          {chat.messages.map((message, index) => (
            <ChatMessage
              key={`${message.timestamp}-${index}`}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              model={message.model}
            />
          ))}
          {error && lastFailedMessage && (
            <div className="text-red-500 mt-4">
              <p className="font-medium">Error: {error}</p>
              <p className="text-sm mt-1">Failed to send: "{lastFailedMessage}"</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200">
        <div className="p-4">
          <ChatInput
            onSend={onSend}
            onRetry={lastFailedMessage ? handleRetry : undefined}
            provider={chat.provider}
            disabled={isLoading}
            error={error}
            lastMessage={lastFailedMessage || undefined}
          />
        </div>
      </div>
    </div>
  );
};
