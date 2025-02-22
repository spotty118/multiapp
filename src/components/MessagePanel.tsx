import { useEffect, useRef, useState } from 'react';
import { StopCircle, Trash2 } from 'lucide-react';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import type { Chat } from '../lib/types';
import { ChatInput } from './ChatInput';
import { ModelDropdown } from './ModelDropdown';
import { ProxyDialog } from './ProxyDialog';
import { SettingsDialog } from './SettingsDialog';
import { ProxyStatusIndicator } from './ProxyStatusIndicator';
import { getLiteLLMProxyUrl } from '../lib/store';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';

type ChatError = 
  | { type: 'auth'; provider: string }
  | { type: 'network' }
  | { type: 'server'; status: number }
  | { type: 'unknown'; message: string };

interface MessagePanelProps {
  chat: Chat;
  onSend: (content: string) => Promise<void>;
  isLoading?: boolean;
  error?: ChatError | null;
  onStopResponse?: () => void;
  onClearChat?: () => void;
  onModelChange?: (model: string) => void;
}

const formatErrorMessage = (error: ChatError): string => {
  switch (error.type) {
    case 'auth':
      return `Authentication failed for ${error.provider}. Please check your API key in settings.`;
    case 'network':
      return 'Network error. Please check your internet connection and try again.';
    case 'server':
      return `Server error (${error.status}). Please try again later.`;
    case 'unknown':
      return error.message;
  }
};

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
  const [proxyUrl, setProxyUrl] = useState<string | null>(getLiteLLMProxyUrl());

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

  const handleStopServer = async () => {
    try {
      await virtualProxyServer.stop();
      setProxyUrl(null);
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  // Format error message if error exists
  const errorMessage = error ? formatErrorMessage(error) : null;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-zinc-200">
      <header className="px-4 py-3 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-800">
            {chat.title || 'New Chat'}
          </h2>
          <div className="flex items-center gap-2">
            <ProxyStatusIndicator 
              url={proxyUrl} 
              onStopServer={virtualProxyServer.isRunning() ? handleStopServer : undefined}
            />
            <ProxyDialog onServerStarted={setProxyUrl} />
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
            onModelChange={onModelChange || (() => {})}
          />
        </div>
      </header>

      <VirtualizedMessageList 
        messages={chat.messages} 
        isLoading={isLoading} 
      />

      <div className="border-t border-zinc-200">
        <div className="p-4">
          <ChatInput
            onSend={onSend}
            onRetry={lastFailedMessage ? handleRetry : undefined}
            provider={chat.provider}
            disabled={isLoading}
            error={errorMessage}
            lastMessage={lastFailedMessage || undefined}
          />
        </div>
      </div>
    </div>
  );
};
