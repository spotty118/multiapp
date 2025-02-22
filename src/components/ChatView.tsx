import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessagePanel } from './MessagePanel';
import { Sidebar } from './Sidebar';
import { Chat, Message, APIError, ProviderType } from '../lib/types';
import { createApiClient } from '../lib/api/factory';
import { getDefaultModel } from '../lib/providers';
import { saveChat, deleteChat } from '../lib/store';

type ChatError = 
  | { type: 'auth'; provider: string }
  | { type: 'network' }
  | { type: 'server'; status: number }
  | { type: 'unknown'; message: string };

interface ChatViewProps {
  initialChats: Chat[];
}

export function ChatView({ initialChats }: ChatViewProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const currentApiClient = useRef<ReturnType<typeof createApiClient> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentApiClient.current) {
        currentApiClient.current.stopResponse();
        currentApiClient.current = null;
      }
    };
  }, []);

  // Memoize the ensureDefaultChat function
  const ensureDefaultChat = useCallback((): Chat => {
    const defaultChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      provider: 'openai',
      model: getDefaultModel('openai')
    };

    // Only create if no chats exist
    if (chats.length === 0) {
      setChats([defaultChat]);
      saveChat(defaultChat);
      return defaultChat;
    }

    return chats[0];
  }, [chats.length]);

  // Handle navigation in useEffect
  useEffect(() => {
    // If we're at root /chat without an ID, redirect to first chat or create new one
    if (!chatId) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
      return;
    }

    // If chat ID doesn't exist, redirect to first chat or create new one
    const chatExists = chats.some(c => c.id === chatId);
    if (!chatExists) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
    }
  }, [chatId, chats, navigate, ensureDefaultChat]);

  // Find current chat
  const currentChat = chatId ? chats.find(c => c.id === chatId) : ensureDefaultChat();

  const isAPIError = (error: unknown): error is APIError => {
    return typeof error === 'object' && error !== null && 'status' in error;
  };

  const handleSend = async (content: string) => {
    if (!currentChat) return;

    // Cancel any ongoing request first
    if (currentApiClient.current) {
      currentApiClient.current.stopResponse();
    }

    setError(null);
    setIsLoading(true);

    try {
      // Validate message before proceeding
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
      
      // Update UI immediately with user message
      setChats(prev => prev.map(c => 
        c.id === updatedChatWithUserMessage.id ? updatedChatWithUserMessage : c
      ));
      saveChat(updatedChatWithUserMessage);

      // Create new API client instance for each request to ensure fresh state
      currentApiClient.current = createApiClient(currentChat.provider);
      const response = await currentApiClient.current.sendMessage(content, currentChat.model);

      // Ensure we have a valid response content
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
        c.id === finalChat.id ? finalChat : c
      ));
      saveChat(finalChat);

    } catch (err) {
      if (isAPIError(err)) {
        const status = err.status;
        const message = err.message;

        let chatError: ChatError;
        if (status === 401) {
          chatError = { type: 'auth', provider: currentChat.provider };
        } else if (status === 0 || message.includes('network')) {
          chatError = { type: 'network' };
        } else if (typeof status === 'number' && status >= 500) {
          chatError = { type: 'server', status };
        } else {
          chatError = { type: 'unknown', message };
        }
        setError(chatError);

      } else if (err instanceof APIError) {
        setError({ type: 'unknown', message: err.message });
      } else {
        setError({ type: 'unknown', message: 'Failed to send message' });
      }

      // Revert the chat to its previous state if there was an error
      setChats(prev => prev.map(c => 
        c.id === currentChat.id ? currentChat : c
      ));
    } finally {
      setIsLoading(false);
      currentApiClient.current = null;
    }
  };

  const handleStopResponse = useCallback(() => {
    if (currentApiClient.current) {
      currentApiClient.current.stopResponse();
      setIsLoading(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
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
  }, [currentChat, navigate]);

  const handleDeleteChat = useCallback((chatIdToDelete: string) => {
    // Don't delete the last chat
    if (chats.length === 1) return;

    setChats(prev => prev.filter(c => c.id !== chatIdToDelete));
    deleteChat(chatIdToDelete);

    // If we deleted the current chat, navigate to another one
    if (chatId === chatIdToDelete) {
      const remainingChats = chats.filter(c => c.id !== chatIdToDelete);
      if (remainingChats.length > 0) {
        navigate(`/chat/${remainingChats[0].id}`);
      } else {
        handleNewChat();
      }
    }
  }, [chats.length, chatId, navigate, handleNewChat]);

  const handleProviderChange = useCallback((provider: ProviderType) => {
    if (!currentChat) return;

    const updatedChat = {
      provider,
      model: getDefaultModel(provider)
    };

    setChats(prev => prev.map(c => 
      c.id === currentChat.id ? { ...currentChat, ...updatedChat } : c
    ));
    saveChat({ ...currentChat, ...updatedChat });
  }, [currentChat]);

  const handleModelChange = useCallback((model: string) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      model
    };

    setChats(prev => prev.map(c => 
      c.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  }, [currentChat]);

  // Ensure we always have a valid chat
  const chat = currentChat || ensureDefaultChat();

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <Sidebar
        chats={chats}
        currentChat={chat}
        onSelectChat={(chat) => navigate(`/chat/${chat.id}`)}
        onDeleteChat={handleDeleteChat}
        provider={chat.provider}
        onProviderChange={handleProviderChange}
        model={chat.model}
        onModelChange={handleModelChange}
        onNewChat={handleNewChat}
      />
      
      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto h-full">
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
        </div>
      </main>
    </div>
  );
}
