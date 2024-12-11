import React from 'react';
import { Message } from '../lib/types';

interface ChatMessageProps {
  role: Message['role'];
  content: string | React.ReactNode;
  timestamp?: number;
  model?: string;
}

export function ChatMessage({ role, content, timestamp, model }: ChatMessageProps) {
  return (
    <div className={`py-4 ${role === 'assistant' ? 'bg-zinc-50' : ''}`}>
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          role === 'assistant' ? 'bg-indigo-500 text-white' : 'bg-zinc-200'
        }`}>
          {role === 'assistant' ? 'A' : 'U'}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{role}</span>
            {timestamp && (
              <span className="text-sm text-zinc-500">
                {new Date(timestamp).toLocaleTimeString()}
              </span>
            )}
            {model && (
              <span className="text-sm text-zinc-500">
                using {model}
              </span>
            )}
          </div>
          <div className="prose prose-zinc max-w-none">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}