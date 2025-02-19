import { memo } from 'react';
import { User } from 'lucide-react';
import { Message } from '../lib/types';
import { getProviderIcon } from './ProviderIcons';
import { getModelDisplay } from '../lib/providers';

interface ChatMessageProps {
  message: Message;
}

const ChatMessageComponent = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const ProviderIcon = !isUser ? getProviderIcon(message.provider) : null;
  
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{
        transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
        willChange: 'transform',
        opacity: 1,
        animation: 'messageSlideIn 0.2s ease-out'
      }}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' 
            : 'bg-zinc-100 text-zinc-600'
        }`}>
          {isUser ? (
            <User className="w-6 h-6" />
          ) : (
            <ProviderIcon className="w-6 h-6" />
          )}
        </div>
        
        <div className={`group relative flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3.5 rounded-2xl max-w-full break-words
            ${isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white/95 shadow-sm' 
              : 'bg-zinc-100 text-zinc-900'
            }
          `}>
            {!isUser && message.model && (
              <div className="mb-2">
                <span className={`
                  inline-block px-2 py-0.5 rounded-full text-xs font-medium
                  ${message.provider === 'anthropic' 
                    ? 'bg-[#0582FF]/10 text-[#0582FF]' 
                    : message.provider === 'openai'
                    ? 'bg-black/10 text-black'
                    : message.provider === 'google'
                    ? 'bg-[#4285F4]/10 text-[#4285F4]'
                    : 'bg-[#F48120]/10 text-[#F48120]'
                  }
                `}>
                  {getModelDisplay(message.provider, message.model)}
                </span>
              </div>
            )}
            <div className="prose prose-lg max-w-none leading-relaxed">
              <div className={`text-[16px] font-regular ${
                isUser ? 'text-white drop-shadow-sm' : ''
              }`}>
                {message.content}
              </div>
            </div>
          </div>
          <div className="text-sm mt-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ChatMessage = memo(ChatMessageComponent, (prev, next) => {
  // Only re-render if the message content or timestamp changes
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.timestamp === next.message.timestamp
  );
});