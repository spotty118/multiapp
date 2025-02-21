import { useEffect, useRef, useState } from 'react';
import { StopCircle, Trash2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { Chat } from '../lib/types';
import { ChatInput } from './ChatInput';
import { ModelDropdown } from './ModelDropdown';
import { ProxyDialog } from './ProxyDialog';
import { SettingsDialog } from './SettingsDialog';
import { ProxyStatusIndicator } from './ProxyStatusIndicator';
import { getLiteLLMProxyUrl } from '../lib/store';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';

interface MessagePanelProps {
  chat: Chat;
  onSend: (content: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onStopResponse?: () => void;
  onClearChat?: () => void;
  onModelChange?: (model: string) => void;
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

      <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4 scrollbar-thin">
        {chat.messages.map((message) => (
          <div key={message.id} className="px-4">
            <ChatMessage message={message} />
          </div>
        ))}
        {isLoading && (
          <div className="px-4">
            <div className="animate-pulse text-zinc-500">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
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