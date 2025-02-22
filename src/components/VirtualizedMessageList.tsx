import React, { useEffect, useRef, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { ArrowDown } from 'lucide-react';
import type { Message } from '../lib/types';
import { ChatMessage } from './ChatMessage';

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

interface MessageMeasurements {
  [key: string]: number;
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({ 
  messages,
  isLoading 
}) => {
  const listRef = useRef<List>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementCache = useRef<MessageMeasurements>({});
  const observer = useRef<ResizeObserver | null>(null);
  
  // Setup container height measurement
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setListHeight(containerRef.current.offsetHeight);
      }
    };

    updateHeight();
    
    observer.current = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      observer.current.observe(containerRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  // Scroll handling
  useEffect(() => {
    if (listRef.current) {
      const list = listRef.current;
      
      // Reset size cache when messages change
      list.resetAfterIndex(0);
      
      // Scroll to bottom for new messages
      if (messages.length > 0) {
        list.scrollToItem(messages.length - 1, 'end');
      }
    }
  }, [messages.length]);

  const getItemHeight = (index: number) => {
    const message = messages[index];
    if (!message) return 0;
    
    const cachedHeight = measurementCache.current[message.id];
    if (cachedHeight) return cachedHeight;
    
    // Default heights based on content length
    const baseHeight = 80; // minimum height
    const contentLength = message.content.length;
    const estimatedHeight = Math.max(baseHeight, Math.ceil(contentLength / 50) * 30);
    
    return estimatedHeight;
  };

  const handleScroll = ({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: string }) => {
    if (!listRef.current) return;
    
    // If scrolling down and near the bottom, don't show the button
    const totalHeight = messages.reduce((acc, _, index) => acc + getItemHeight(index), 0);
    const isAtBottom = scrollOffset + listHeight >= totalHeight - 100;
    
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  };

  const Row: React.FC<{ index: number; style: React.CSSProperties }> = React.memo(({ 
    index,
    style 
  }) => {
    const message = messages[index];
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (rowRef.current) {
        const updateHeight = () => {
          const height = rowRef.current?.offsetHeight || 0;
          if (height !== measurementCache.current[message.id]) {
            measurementCache.current[message.id] = height;
            if (listRef.current) {
              listRef.current.resetAfterIndex(index);
            }
          }
        };

        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(rowRef.current);

        return () => resizeObserver.disconnect();
      }
    }, [message.id, index]);

    return (
      <div ref={rowRef} style={style} className="px-4">
        <ChatMessage message={message} />
      </div>
    );
  });

  Row.displayName = 'MessageRow';

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      <List
        ref={listRef}
        height={listHeight}
        itemCount={messages.length}
        itemSize={getItemHeight}
        width="100%"
        onScroll={handleScroll}
        className="scrollbar-thin"
      >
        {Row}
      </List>

      {isLoading && (
        <div className="px-4 py-2">
          <div className="animate-pulse text-zinc-500">Thinking...</div>
        </div>
      )}

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-zinc-800 transition-colors"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
