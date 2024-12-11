import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessagePanel } from './MessagePanel';
import { Sidebar } from './Sidebar';
import { Chat, Message, Provider, APIError } from '../lib/types';
import { createApiClient } from '../lib/api/factory';
import { getDefaultModel } from '../lib/providers';
import { saveChat, deleteChat } from '../lib/store';
import { useKeyboardShortcuts } from '../lib/hooks/useKeyboardShortcuts';

interface ChatViewProps {
  initialChats: Chat[];
}

export function ChatView({ initialChats }: ChatViewProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [chats, setChats] = useState<Chat[]>(initialChats || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentApiClient = useRef<ReturnType<typeof createApiClient> | null>(null);

  const ensureDefaultChat = useCallback((): Chat => {
    const defaultChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      provider: 'openai',
      model: getDefaultModel('openai')
    };

    if (chats.length === 0) {
      setChats([defaultChat]);
      saveChat(defaultChat);
      return defaultChat;
    }

    return chats[0] || defaultChat;
  }, [chats]);

  useEffect(() => {
    if (!chatId) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
      return;
    }

    const chatExists = chats.some(c => c?.id === chatId);
    if (!chatExists) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
    }
  }, [chatId, chats, navigate, ensureDefaultChat]);

  const currentChat = chatId ? chats.find(c => c?.id === chatId) : ensureDefaultChat();

  const handleSend = async (content: string) => {
    if (!currentChat) {
      setError('No active chat found.');
      return;
    }

    if (currentApiClient.current) {
      currentApiClient.current.stopResponse();
    }

    setError(null);
    setIsLoading(true);

    try {
      if (!content.trim()) {
        throw new APIError('Message cannot be empty', 400);
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
        provider: currentChat.provider,
        model: currentChat.model
      };

      const updatedChatWithUserMessage = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage]
      };

      setChats(prev => prev.map(c => 
        c?.id === updatedChatWithUserMessage.id ? updatedChatWithUserMessage : c
      ));
      saveChat(updatedChatWithUserMessage);

      currentApiClient.current = createApiClient(currentChat.provider);
      const response = await currentApiClient.current.sendMessage(content, currentChat.model);

      if (!response?.result?.response) {
        throw new APIError('Invalid response from API');
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.result.response,
        timestamp: Date.now(),
        provider: currentChat.provider,
        model: currentChat.model
      };

      const finalChat = {
        ...updatedChatWithUserMessage,
        messages: [...updatedChatWithUserMessage.messages, assistantMessage]
      };

      setChats(prev => prev.map(c => 
        c?.id === finalChat.id ? finalChat : c
      ));
      saveChat(finalChat);

    } catch (err) {
      if (err instanceof APIError) {
        let errorMessage = err.message;

        if (typeof err.status === 'number') {
          if (err.status === 401) {
            errorMessage = `Authentication failed for ${currentChat.provider}. Please check your API key in settings.`;
          } else if (err.status === 0 || err.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (err.status >= 500) {
            errorMessage = `Server error (${err.status}). Please try again later.`;
          }
        }

        setError(errorMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send message');
      }

      setChats(prev => prev.map(c => 
        c?.id === currentChat.id ? currentChat : c
      ));
    } finally {
      setIsLoading(false);
      currentApiClient.current = null;
    }
  };

  const handleStopResponse = () => {
    if (currentApiClient.current) {
      currentApiClient.current.stopResponse();
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      provider: currentChat?.provider || 'openai',
      model: currentChat?.model || getDefaultModel('openai')
    };

    setChats(prev => [newChat, ...prev]);
    saveChat(newChat);
    navigate(`/chat/${newChat.id}`);
  };

  const handleDeleteChat = (chatIdToDelete: string) => {
    if (chats.length === 1) return;

    setChats(prev => prev.filter(c => c?.id !== chatIdToDelete));
    deleteChat(chatIdToDelete);

    if (chatId === chatIdToDelete) {
      const remainingChats = chats.filter(c => c?.id !== chatIdToDelete);
      if (remainingChats.length > 0) {
        navigate(`/chat/${remainingChats[0].id}`);
      } else {
        handleNewChat();
      }
    }
  };

  const handleProviderChange = (provider: Provider) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      provider,
      model: getDefaultModel(provider)
    };

    setChats(prev => prev.map(c => 
      c?.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  };

  // For Sidebar
  const handleModelChange = (model: string) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      model
    };

    setChats(prev => prev.map(c => 
      c?.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  };

  // For MessagePanel
  const handleMessagePanelModelChange = (model: string, context: Chat['messages']) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      model
    };

    setChats(prev => prev.map(c => 
      c?.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  };

  useKeyboardShortcuts({
    'ctrl+n': {
      handler: () => {
        const newChat = ensureDefaultChat();
        setChats(prev => [...prev, newChat]);
        navigate(`/chat/${newChat.id}`);
      },
      description: 'New chat',
    },
    'esc': {
      handler: () => setError(null),
      description: 'Clear error',
    },
  });

  const chat = currentChat || ensureDefaultChat();

  return (
    <div className="flex h-screen bg-zinc-50">
      <Sidebar
        chats={chats}
        currentChat={chat}
        onNewChat={handleNewChat}
        onSelectChat={(chat) => navigate(`/chat/${chat.id}`)}
        onDeleteChat={handleDeleteChat}
        provider={chat.provider}
        onProviderChange={handleProviderChange}
        model={chat.model}
        onModelChange={handleModelChange}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">
            {currentChat?.title || 'New Chat'}
          </h1>
        </div>
        <main className="flex-1">
          <MessagePanel
            chat={chat}
            onSend={handleSend}
            isLoading={isLoading}
            error={error}
            onClearChat={() => {
              const clearedChat = { ...chat, messages: [] };
              setChats(prev => prev.map(c => 
                c.id === clearedChat.id ? clearedChat : c
              ));
              saveChat(clearedChat);
            }}
            onModelChange={handleModelChange}
            onStopResponse={handleStopResponse}
          />
        </main>
      </div>
    </div>
  );
}
