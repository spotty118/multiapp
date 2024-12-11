User:
You are tasked to implement a feature. Instructions are as follows:

enhance the code and make it better

Instructions for the output format:
- Output code without descriptions, unless it is important.
- Minimize prose, comments and empty lines.
- Only show the relevant code that needs to be modified. Use comments to represent the parts that are not modified.
- Make it easy to copy and paste.
- Consider other possibilities to achieve the result, do not be limited by the prompt.

.env.production
```production

VITE_WORKER_URL=/

VITE_API_BASE_URL=/api/chat
```

index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MultiMind Chat</title>
    <meta name="description" content="Chat with multiple AI models using a single interface">
    <link rel="icon" type="image/svg+xml" href="/favicon.ico">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

postcss.config.js
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

proxy.js
```js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const app = express();
const port = process.env.VITE_PROXY_CONTROL_PORT || 8787;

console.log('Starting proxy server with configuration:', {
  port,
  openaiKey: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  nodeEnv: process.env.NODE_ENV,
});

const requestCounts = new Map();
const RATE_LIMIT = 50;  const RATE_WINDOW = 60 * 1000;  
let proxyServerProcess = null;

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
    const validRequests = userRequests.filter(time => time > now - RATE_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        type: 'rate_limit_error'
      }
    });
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  next();
};

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(morgan('dev')); app.use(rateLimiter);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const validateMessages = (req, res, next) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Messages array is required'
      }
    });
  }

    for (const [index, msg] of messages.entries()) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid message at index ${index}: role and content are required`
        }
      });
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid role "${msg.role}" at index ${index}`
        }
      });
    }
  }
  
  next();
};

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      type: err.name || 'Error'
    }
  });
});

function handleProxyError(error) {
  console.error('Proxy error:', error);
  }

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/proxy/start', async (req, res) => {
  try {
    if (proxyServerProcess) {
      return res.status(400).json({ error: 'Proxy server is already running' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
        try {
      await new Promise((resolve, reject) => {
        const pip = spawn('pip', ['install', 'litellm']);
        pip.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pip install failed with code ${code}`));
        });
      });
    } catch (error) {
      console.warn('Could not install litellm:', error);
          }

        try {
      proxyServerProcess = spawn('litellm', ['--config', path.join(__dirname, 'config.yaml')]);

      proxyServerProcess.stdout.on('data', (data) => {
        console.log(`Proxy server stdout: ${data}`);
      });

      proxyServerProcess.stderr.on('data', (data) => {
        console.error(`Proxy server stderr: ${data}`);
      });

      proxyServerProcess.on('close', (code) => {
        console.log(`Proxy server process exited with code ${code}`);
        proxyServerProcess = null;
      });
    } catch (error) {
      handleProxyError(error);
      return res.status(500).json({ error: 'Failed to start proxy server' });
    }

    res.json({ success: true, message: 'Proxy server started' });
  } catch (error) {
    console.error('Error starting proxy server:', error);
    res.status(500).json({ error: 'Failed to start proxy server' });
  }
});

app.post('/proxy/stop', (req, res) => {
  if (!proxyServerProcess) {
    return res.status(400).json({ error: 'Proxy server is not running' });
  }

  try {
    proxyServerProcess.kill();
    proxyServerProcess = null;
    res.json({ success: true, message: 'Proxy server stopped' });
  } catch (error) {
    handleProxyError(error);
    console.error('Error stopping proxy server:', error);
    res.status(500).json({ error: 'Failed to stop proxy server' });
  }
});

app.post('/api/chat/completions', async (req, res) => {
  try {
    console.log('Received chat completion request:', {
      model: req.body.model,
      messagesCount: req.body.messages?.length
    });
    
    const { messages, model } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages array:', messages);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Messages array is required and must not be empty'
        }
      });
    }

    console.log('Using OpenAI API key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    
        const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('Making request to OpenAI with model:', model || 'gpt-3.5-turbo');
    
    const completion = await openai.chat.completions.create({
      messages,
      model: model || 'gpt-3.5-turbo',
    });

    console.log('Received successful response from OpenAI');
    res.json(completion);
  } catch (error) {
    console.error('Chat completion error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to generate chat completion',
        type: error.name || 'Error',
        details: error.response?.data || {}
      }
    });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});
```

src/App.tsx
```tsx
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
                const testKey = '_test_' + Math.random();
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);

                await Promise.all([
                    new Promise(resolve => setTimeout(resolve, 1000))         ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoadError(error as Error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-red-600 mb-2">
            Failed to Load Application
          </h1>
          <p className="text-zinc-600 mb-4">
            {loadError.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

export default App;
```

src/components/ChatInput.tsx
```tsx
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

    const isProxyError = error?.toLowerCase().includes('proxy') || 
                      error?.toLowerCase().includes('connection refused');
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
```

src/components/ChatMessage.tsx
```tsx
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
        transform: 'translate3d(0, 0, 0)',         willChange: 'transform',
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

export const ChatMessage = memo(ChatMessageComponent, (prev, next) => {
    return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.timestamp === next.message.timestamp
  );
});
```

src/components/ChatView.tsx
```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessagePanel } from './MessagePanel';
import { Sidebar } from './Sidebar';
import { Chat, Message, Provider, APIError } from '../lib/types';
import { createApiClient } from '../lib/api/factory';
import { getDefaultModel } from '../lib/providers';
import { saveChat, deleteChat } from '../lib/store';

interface ChatViewProps {
  initialChats: Chat[];
}

export function ChatView({ initialChats }: ChatViewProps) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [chats, setChats] = useState<Chat[]>(initialChats);
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

    return chats[0];
  }, [chats.length]);

    useEffect(() => {
        if (!chatId) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
      return;
    }

        const chatExists = chats.some(c => c.id === chatId);
    if (!chatExists) {
      const defaultChat = ensureDefaultChat();
      navigate(`/chat/${defaultChat.id}`, { replace: true });
    }
  }, [chatId, chats, navigate, ensureDefaultChat]);

    const currentChat = chatId ? chats.find(c => c.id === chatId) : ensureDefaultChat();

  const handleSend = async (content: string) => {
    if (!currentChat) return;

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
        c.id === updatedChatWithUserMessage.id ? updatedChatWithUserMessage : c
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
        c.id === finalChat.id ? finalChat : c
      ));
      saveChat(finalChat);

    } catch (err) {
      if (err instanceof APIError) {
                let errorMessage = err.message;
        
        if (err.status === 401) {
          errorMessage = `Authentication failed for ${currentChat.provider}. Please check your API key in settings.`;
        } else if (err.status === 0 || err.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (err.status >= 500) {
          errorMessage = `Server error (${err.status}). Please try again later.`;
        }
        
        setError(errorMessage);
      } else if (err.message !== 'Request cancelled') {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }

            setChats(prev => prev.map(c => 
        c.id === currentChat.id ? currentChat : c
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

    setChats(prev => prev.filter(c => c.id !== chatIdToDelete));
    deleteChat(chatIdToDelete);

        if (chatId === chatIdToDelete) {
      const remainingChats = chats.filter(c => c.id !== chatIdToDelete);
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
      c.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  };

  const handleModelChange = (model: string) => {
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      model
    };

    setChats(prev => prev.map(c => 
      c.id === updatedChat.id ? updatedChat : c
    ));
    saveChat(updatedChat);
  };

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
```

src/components/CloudflareClient.ts
```ts
import { BaseApiClient } from './base';
import { Model } from '../types';

export class CloudflareClient extends BaseApiClient {
  
  protected parseModelsResponse(response: CloudflareModelsResponse): Model[] {
    return response.data.map(model => {
      if (model.id.startsWith('gemini-')) {
        return {
          id: 'gemini-pro',            name: 'Gemini Pro',
          provider: 'google',
          capabilities: ['chat', 'code', 'analysis']
        };
      } else if (model.id.includes('gpt')) {
        return {
          id: model.id,
          name: model.id.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          provider: 'openai',
          capabilities: [
            'chat',
            'code',
            ...(model.id.includes('gpt-4') ? ['analysis'] as const : [])
          ]
        };
      } else {
                return {
          id: model.id,
          name: model.id.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          provider: 'cloudflare'
        };
      }
    });
  }
}
```

src/components/ErrorBoundary.tsx
```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Terminal, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
        if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
        window.location.reload();
  };

  private is502Error(): boolean {
    const { error } = this.state;
    return error?.message?.includes('502') || 
           error?.message?.includes('Bad Gateway') ||
           error?.message?.toLowerCase().includes('vite') ||
           error?.message?.includes('node_modules/.vite');
  }

  public render() {
    if (this.state.hasError) {
            if (this.is502Error()) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-red-600 text-center mb-2">
                Development Server Error
              </h1>
              <p className="text-gray-600 mb-4 text-center">
                Unable to connect to the Vite development server. This typically occurs when:
                <ul className="list-disc list-inside mt-2 text-left">
                  <li>The development server is not running</li>
                  <li>There's a build or bundling error</li>
                  <li>The server crashed or failed to start</li>
                  <li>Port 5173 is already in use</li>
                </ul>
              </p>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => window.open('http://localhost:5173')}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Local Development URL
                  </button>
                </div>
                <div className="mt-4 p-3 bg-zinc-50 rounded-md">
                  <p className="text-sm font-medium text-zinc-700 mb-2">Try these commands:</p>
                  <div className="font-mono text-sm bg-black text-white p-2 rounded overflow-x-auto">
                    <p className="mb-1">1. Stop any running servers</p>
                    <p className="mb-2 text-zinc-400">CTRL+C or CMD+C</p>
                    <p className="mb-1">2. Start the development server</p>
                    <p className="text-zinc-400">npm run dev</p>
                  </div>
                </div>
              </div>
              {this.state.error && import.meta.env.DEV && (
                <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-600">
                  <p className="font-medium mb-1">Error Details:</p>
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      }

            return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

src/components/index.d.ts
```ts
declare module 'markdown-it' {
  interface MarkdownIt {
    render(markdown: string): string;
  }
  
  interface MarkdownItConstructor {
    new (): MarkdownIt;
  }
  
  const markdown: MarkdownItConstructor;
  export = markdown;
}

interface Window {
  markdownit: () => import('markdown-it');
}
```

src/components/LoadingScreen.tsx
```tsx
import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export function LoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading application...');
  const [loadAttempt, setLoadAttempt] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetry(true);
      setLoadingText('Loading is taking longer than expected');
    }, 5000); 
    return () => clearTimeout(timer);
  }, [loadAttempt]);

  const handleRetry = () => {
    setShowRetry(false);
    setLoadingText('Retrying load...');
    setLoadAttempt(prev => prev + 1);
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
        
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          MultiMind Chat
        </h1>
        
        <p className="text-zinc-600 mb-4">
          {loadingText}
        </p>

        {showRetry && (
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
}
```

src/components/MessagePanel.tsx
```tsx
import { useEffect, useRef, useState } from 'react';
import { StopCircle, Trash2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Chat, Message } from '../lib/types';
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
```

src/components/ModelDropdown.tsx
```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2, Code, CheckCircle2, Brain, Eye, Wand2 } from 'lucide-react';
import { Model, Provider, ProviderType, ModelCapability } from '../lib/types';
import { getProviderModels, selectBestModel } from '../lib/providers';

interface ModelDropdownProps {
  provider: ProviderType;
  model: string;
  onModelChange: (model: string) => void;
}

export const ModelDropdown = ({ provider, model, onModelChange }: ModelDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectedModel, setAutoSelectedModel] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousProvider = useRef<ProviderType>(provider);

    useEffect(() => {
    if (provider !== previousProvider.current) {
            setModels([]);
      setError(null);
      setAutoSelectedModel(null);
            onModelChange('auto');
      previousProvider.current = provider;
    }

    setLoading(true);

    const loadModels = async () => {
      try {
                if (!provider) {
          throw new Error('Provider is required');
        }

        const providerModels = await getProviderModels(provider);
        setModels(providerModels);
        
                if (model === 'auto') {
          const bestModel = selectBestModel(provider, providerModels);
          setAutoSelectedModel(bestModel);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [provider, model, onModelChange]);

    useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCapabilityIcon = (capability: ModelCapability) => {
    switch (capability) {
      case 'code':
        return <Code className="w-3 h-3 text-indigo-500" />;
      case 'analysis':
        return <Brain className="w-3 h-3 text-purple-500" />;
      case 'vision':
        return <Eye className="w-3 h-3 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    }
  };

    const currentModel = models.find(m => m.id === (model === 'auto' ? 'auto' : model)) || {
    id: model,
    name: model === 'auto' ? 'Auto (Best Available)' : model.split('/').pop() || model,
    provider: provider,
    isAuto: model === 'auto'
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm bg-white 
          hover:bg-zinc-50 border border-zinc-200 rounded-lg 
          transition-all duration-200 ease-in-out
          ${loading ? 'opacity-75 cursor-wait' : ''}
        `}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        ) : currentModel.isAuto ? (
          <Wand2 className="w-4 h-4 text-indigo-500" />
        ) : (
          <Sparkles className="w-4 h-4 text-indigo-500" />
        )}
        <span className="text-zinc-700">
          {loading ? 'Loading models...' : currentModel.name}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-[350px] bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden transform opacity-0 scale-95 animate-in"
          style={{
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div className="max-h-[450px] overflow-y-auto scrollbar-thin divide-y divide-zinc-100">
            {loading && (
              <div className="p-4 text-center text-sm text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading available models...
              </div>
            )}

            {error && (
              <div className="p-4 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoading(true);
                    setError(null);
                    getProviderModels(provider)
                      .then(models => {
                        setModels(models);
                        setError(null);
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load models'))
                      .finally(() => setLoading(false));
                  }}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && models.length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">
                No models available for this provider
              </div>
            )}

            {!loading && !error && models.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onModelChange(m.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex flex-col gap-1 p-3 text-left text-sm transition-colors
                  hover:bg-zinc-50
                  ${m.id === model ? 'bg-indigo-50/70' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.isAuto ? (
                      <Wand2 className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-medium text-zinc-900">{m.name}</span>
                  </div>
                  {m.id === model && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                {m.capabilities && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {m.capabilities.map((capability) => (
                      <div 
                        key={capability}
                        className="flex items-center gap-1"
                        title={capability.charAt(0).toUpperCase() + capability.slice(1)}
                      >
                        {getCapabilityIcon(capability)}
                      </div>
                    ))}
                  </div>
                )}
                {m.context_length && (
                  <div className="text-xs text-zinc-500">
                    Context: {m.context_length.toLocaleString()} tokens
                  </div>
                )}
                {m.description && (
                  <div className="text-xs text-zinc-500">
                    {m.description}
                  </div>
                )}
                {m.isAuto && autoSelectedModel && (
                  <div className="text-xs text-indigo-600 mt-1">
                    Currently using: {models.find(m => m.id === autoSelectedModel)?.name || autoSelectedModel}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
```

src/components/ModelSelect.tsx
```tsx
import * as Select from '@radix-ui/react-select';
import { Check, Loader2 } from 'lucide-react';
import { Model } from '../lib/types';

interface ModelSelectProps {
  models: Model[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const ModelSelect = ({ models, value, onChange, disabled, isLoading }: ModelSelectProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-2 bg-gray-50 rounded border">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading models...</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded border">
        No models available. Please check your API key or connection.
      </div>
    );
  }

  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger className="w-full inline-flex items-center justify-between rounded px-4 py-2 text-sm gap-2 bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <Select.Value />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
          <Select.Viewport className="p-1">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none"
              >
                <Select.ItemText>{model.name}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="w-4 h-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
```

src/components/NotFound.tsx
```tsx
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Page Not Found</h1>
          <p className="text-zinc-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          Return Home
        </button>
      </div>
    </div>
  );
};
```

src/components/ProviderIcons.tsx
```tsx
import { Provider } from '../lib/types';

interface ProviderIconProps {
  className?: string;
}

export const OpenAIIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#000000" />
    <path
      d="M11.9947 7.34355C13.2252 6.57336 14.7419 6.57336 15.9724 7.34355L18.0372 8.61724C19.2677 9.38742 19.9975 10.7361 19.9975 12.1897V14.7371C19.9975 16.1907 19.2677 17.5394 18.0372 18.3096L15.9724 19.5832C14.7419 20.3534 13.2252 20.3534 11.9947 19.5832L9.92993 18.3096C8.69941 17.5394 7.96967 16.1907 7.96967 14.7371V12.1897C7.96967 10.7361 8.69941 9.38742 9.92993 8.61724L11.9947 7.34355Z"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AnthropicIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 4L20 18H4L12 4Z"
      stroke="#0582FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 15L8 7M12 15L16 7M8 13H16"
      stroke="#0582FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GoogleIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const CloudflareIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M16.5088 16.8447c.1475-.5068.0901-.9708-.1537-1.3804-.2178-.3837-.5792-.6632-1.0207-.7947l-8.3091-1.2485a.2241.2241 0 0 1-.1475-.0886.2003.2003 0 0 1-.0394-.1711c.0205-.0903.0901-.1548.1744-.1711l8.4197-1.2402c.4415-.1314.7967-.4052 1.0083-.7806.2177-.3836.2751-.8476.1475-1.3544-.2374-.8313-.9505-1.397-1.7963-1.397h-.6187a.386.386 0 0 1-.3006-.1427c-.0819-.0903-.1106-.2088-.0901-.3273.0409-.1548.0409-.3012.0409-.4477 0-1.2733-1.0411-2.3095-2.3201-2.3095-.7024 0-1.3687.3185-1.8239.8558-.1229.1427-.32.1899-.4841.1089a2.042 2.042 0 0 0-.7639-.1427c-1.1722 0-2.1259.9462-2.1259 2.1063 0 .1249.0082.2498.0327.3747a.2675.2675 0 0 1-.065.2498.2815.2815 0 0 1-.246.0822A3.3535 3.3535 0 0 0 4.62 9.7476c0 1.8276 1.4997 3.3142 3.3442 3.3142h7.0224c.8458 0 1.5589-.5571 1.7963-1.388l-.2741-.0291z"
      fill="#F48120"
    />
  </svg>
);

export const OpenRouterIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="openrouter-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4B4B" />
        <stop offset="100%" stopColor="#FF6B6B" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2 17L12 22L22 17"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2 12L12 17L22 12"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const getProviderIcon = (provider: Provider) => {
  switch (provider) {
    case 'openai':
      return OpenAIIcon;
    case 'anthropic':
      return AnthropicIcon;
    case 'google':
      return GoogleIcon;
    case 'cloudflare':
      return CloudflareIcon;
    case 'openrouter':
      return OpenRouterIcon;
  }
};
```

src/components/ProviderList.tsx
```tsx
import { CheckSquare, Square } from 'lucide-react';
import { ProviderType } from '../lib/types';
import { providers } from '../lib/providers';
import { getProviderIcon } from './ProviderIcons';

interface ProviderListProps {
  value: ProviderType;
  onChange: (provider: ProviderType) => void;
  disabled?: boolean;
}

export const ProviderList = ({ value, onChange, disabled }: ProviderListProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-900 mb-3">AI Provider</h3>
      <div className="space-y-2">
        {Object.values(providers).map((provider) => {
          const isSelected = value === provider.type;
          const Icon = getProviderIcon(provider.type);
          
          return (
            <button
              key={provider.type}
              onClick={() => !disabled && onChange(provider.type)}
              disabled={disabled}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                ${isSelected
                  ? 'bg-gradient-to-r from-zinc-50 to-zinc-100/80 shadow-sm'
                  : 'hover:bg-zinc-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`p-2 rounded-lg bg-white shadow-sm ${
                isSelected ? 'ring-1 ring-zinc-200' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    isSelected ? 'text-zinc-900' : 'text-zinc-700'
                  }`}>
                    {provider.name}
                  </span>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <p className="text-sm text-zinc-500">{provider.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

src/components/ProviderSelect.tsx
```tsx
import * as Select from '@radix-ui/react-select';
import { Provider } from '../lib/types';
import { Check } from 'lucide-react';

interface ProviderSelectProps {
  value: Provider;
  onChange: (value: Provider) => void;
  disabled?: boolean;
}

export const ProviderSelect = ({ value, onChange, disabled }: ProviderSelectProps) => {
  return (
    <Select.Root value={value} onValueChange={onChange as (value: string) => void} disabled={disabled}>
      <Select.Trigger className="w-full inline-flex items-center justify-between rounded px-4 py-2 text-sm gap-2 bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <Select.Value />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
          <Select.Viewport className="p-1">
            <Select.Item value="openai" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>OpenAI</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="anthropic" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Anthropic</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="google" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Google AI</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="cloudflare" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Cloudflare</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
```

src/components/ProxyDialog.tsx
```tsx
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Terminal, X } from 'lucide-react';
import { ProxyServer } from './ProxyServer';

interface ProxyDialogProps {
  onServerStarted?: (url: string) => void;
}

export function ProxyDialog({ onServerStarted }: ProxyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors"
          title="Virtual Proxy Server"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                Virtual Proxy Server
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-zinc-500 mt-1">
              Start and manage your local proxy server for routing API requests.
            </Dialog.Description>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(85vh-5rem)]">
            <ProxyServer onServerStarted={onServerStarted} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

src/components/ProxyGuide.tsx
```tsx
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const sections = [
  {
    title: 'Prerequisites',
    content: `Before setting up LiteLLM Proxy, ensure you have:

- Operating System: Linux, macOS, or Windows
- Python: Version 3.8 or higher
- Package Manager: pip for Python package installation
- API Keys: From your desired AI providers (OpenAI, Anthropic, etc.)
- Optional: Docker for containerized deployment
- Basic knowledge of CLI, Python, and networking`
  },
  {
    title: 'Installation',
    content: `### Using Python and pip

1. Install LiteLLM:
\`\`\`bash
pip install litellm
\`\`\`

2. Create a configuration file (\`config.yaml\`):
\`\`\`yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: sk-...

  - model_name: claude-3-opus
    litellm_params:
      model: claude-3-opus
      api_key: sk-...

  - model_name: gemini-pro
    litellm_params:
      model: gemini-pro
      api_key: ...

proxy_config:
 
  cache: true
 
  num_retries: 2
 
  redis_host: localhost
  redis_port: 6379
  redis_password: xxx
\`\`\`


1. Create a Dockerfile:
\`\`\`dockerfile
FROM ghcr.io/berriai/litellm:latest

COPY config.yaml /app/config.yaml
EXPOSE 8000

CMD ["litellm", "--config", "config.yaml"]
\`\`\`

2. Build and run:
\`\`\`bash
docker build -t litellm-proxy .
docker run -d -p 8000:8000 litellm-proxy
\`\`\``
  },
  {
    title: 'Advanced Configuration',
    content: `### Load Balancing

\`\`\`yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: ["key1", "key2", "key3"]

router_config:
  routing_strategy: least-busy
  retry_strategy: fallback
\`\`\`


\`\`\`yaml
litellm_settings:
  cost_tracking: true
  cost_callbacks: ["slack"]

callbacks:
  slack:
    webhook_url: "https://hooks.slack.com/services/xxx"
\`\`\`


\`\`\`yaml
litellm_settings:
  rate_limit: 10
  rate_limit_period: 60 
\`\`\`


\`\`\`yaml
health_check:
  enabled: true
  interval: 30 
  endpoints:
    - url: "https://api.openai.com/v1/chat/completions"
      method: "GET"
    - url: "https://api.anthropic.com/v1/messages"
      method: "GET"
\`\`\``
  },
  {
    title: 'Security Best Practices',
    content: `### 1. API Key Management

- Use environment variables for sensitive keys
- Rotate keys regularly
- Set up key expiration policies


Add to \`config.yaml\`:
\`\`\`yaml
litellm_settings:
  api_key: "sk-my-secret-key"
  drop_params: ["api_key", "api_base"]
\`\`\`


- Use HTTPS/TLS
- Set up firewall rules
- Configure CORS properly


- Enable logging
- Set up alerting
- Monitor rate limits and costs


Use reverse proxy (nginx):
\`\`\`nginx
server {
    listen 443 ssl;
    server_name proxy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
\`\`\``
  },
  {
    title: 'Usage Examples',
    content: `### OpenAI Format

\`\`\`python
import openai

client = openai.OpenAI(
    api_key="your-proxy-key",
    base_url="http://localhost:8000"
)

completion = client.chat.completions.create(
    model="gpt-4", 
    messages=[
        {"role": "user", "content": "Hello, world!"}
    ]
)
print(completion.choices[0].message.content)
\`\`\`


\`\`\`bash
curl http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-proxy-key" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ]
  }'
\`\`\`


\`\`\`javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-proxy-key',
  baseURL: 'http://localhost:8000'
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

console.log(completion.choices[0].message.content);
\`\`\``
  }
];

interface SectionProps {
  title: string;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
}

const Section = ({ title, content, isOpen, onToggle }: SectionProps) => {
  return (
    <div className="border border-zinc-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-zinc-50 rounded-lg transition-colors"
      >
        <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-zinc-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          <div 
            className="prose prose-sm max-w-none prose-zinc prose-headings:font-semibold prose-headings:text-zinc-800 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2"
            dangerouslySetInnerHTML={{ 
              __html: window.markdownit().render(content) 
            }} 
          />
        </div>
      )}
    </div>
  );
};

export const ProxyGuide = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">
        LiteLLM Proxy Setup Guide
      </h2>
      
      {sections.map((section) => (
        <Section
          key={section.title}
          title={section.title}
          content={section.content}
          isOpen={openSections[section.title] || false}
          onToggle={() => toggleSection(section.title)}
        />
      ))}
    </div>
  );
};
```

src/components/ProxyServer.tsx
```tsx
import { useState, useEffect } from 'react';
import { Terminal, Play, Square, AlertCircle, CheckCircle, ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VirtualTerminal } from './VirtualTerminal';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';
import type { Terminal as XTerm } from '@xterm/xterm';

interface ProxyServerProps {
  onServerStarted?: (url: string) => void;
}

interface ServerStatus {
  running: boolean;
  uptime: number;
  requestCount: number;
  pendingRequests: number;
  queuedRequests: number;
  requestsLastMinute: number;
}

export function ProxyServer({ onServerStarted }: ProxyServerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
        const handleStarted = () => {
      setIsRunning(true);
      setError(null);
      setIsStopping(false);
    };
    const handleStopped = () => {
      setIsRunning(false);
      setIsStopping(false);
    };

    virtualProxyServer.on('started', handleStarted);
    virtualProxyServer.on('stopped', handleStopped);

        const pollStatus = setInterval(() => {
      if (virtualProxyServer.isRunning()) {
        setStatus(virtualProxyServer.getStatus());
      }
    }, 1000);

        setIsRunning(virtualProxyServer.isRunning());

    return () => {
      virtualProxyServer.off('started', handleStarted);
      virtualProxyServer.off('stopped', handleStopped);
      clearInterval(pollStatus);
    };
  }, []);

  const handleTerminalReady = (terminal: XTerm) => {
    virtualProxyServer.setTerminal({
      writeln: (text: string) => terminal.writeln(text),
      clear: () => terminal.clear()
    });
  };

  const startServer = async () => {
    setError(null);
    
    try {
      await virtualProxyServer.start();
      onServerStarted?.('http://localhost:8000');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
      setIsRunning(false);
    }
  };

  const stopServer = async () => {
    setIsStopping(true);
    try {
      await virtualProxyServer.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server');
    } finally {
      setIsStopping(false);
    }
  };

  const restartServer = async () => {
    setIsRestarting(true);
    setError(null);
    
    try {
      await virtualProxyServer.restart();
      onServerStarted?.('http://localhost:8000');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setTimeout(() => setIsRestarting(false), 1000);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-medium text-zinc-900">Virtual Proxy Server</h3>
        </div>
        
        {error ? (
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        ) : isRunning ? (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Running</span>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-red-800 whitespace-pre-wrap font-mono">
              {error}
            </div>
            <div className="flex gap-2">
              <Link
                to="/proxy-guide"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Setup Guide
              </Link>
            </div>
          </div>
        </div>
      )}

      {status && isRunning && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg text-sm">
          <div>
            <span className="text-zinc-500">Uptime:</span>{' '}
            <span className="text-zinc-900 font-medium">{formatUptime(status.uptime)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Total Requests:</span>{' '}
            <span className="text-zinc-900 font-medium">{status.requestCount}</span>
          </div>
          <div>
            <span className="text-zinc-500">Pending:</span>{' '}
            <span className={`font-medium ${
              status.pendingRequests > 3 ? 'text-amber-600' : 'text-zinc-900'
            }`}>
              {status.pendingRequests}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Queued:</span>{' '}
            <span className={`font-medium ${
              status.queuedRequests > 0 ? 'text-amber-600' : 'text-zinc-900'
            }`}>
              {status.queuedRequests}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-zinc-500">Requests (last minute):</span>{' '}
            <span className={`font-medium ${
              status.requestsLastMinute > 45 ? 'text-red-600' : 'text-zinc-900'
            }`}>
              {status.requestsLastMinute}
            </span>
            <span className="text-zinc-400"> / 50</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startServer}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            Start Virtual Server
          </button>
        ) : (
          <>
            <button
              onClick={stopServer}
              disabled={isStopping}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isStopping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {isStopping ? 'Stopping...' : 'Stop Server'}
            </button>
            <button
              onClick={restartServer}
              disabled={isRestarting || isStopping}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isRestarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {isRestarting ? 'Restarting...' : 'Restart Server'}
            </button>
          </>
        )}
      </div>

      <VirtualTerminal onReady={handleTerminalReady} />
    </div>
  );
}
```

src/components/ProxyStatusIndicator.tsx
```tsx
import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, StopCircle } from 'lucide-react';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';

interface ProxyStatusIndicatorProps {
  onStopServer?: () => void;
}

export function ProxyStatusIndicator({ onStopServer }: ProxyStatusIndicatorProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkConnection = useCallback(async () => {
    if (virtualProxyServer.isRunning()) {
      setStatus('connected');
      setErrorMessage('');
    } else {
      setStatus('disconnected');
      setErrorMessage('Virtual proxy server is not running');
    }
  }, []);

  useEffect(() => {
        const handleServerStarted = () => {
      setStatus('connected');
      setErrorMessage('');
    };

    const handleServerStopped = () => {
      setStatus('disconnected');
      setErrorMessage('Virtual proxy server stopped');
    };

    virtualProxyServer.on('started', handleServerStarted);
    virtualProxyServer.on('stopped', handleServerStopped);

        checkConnection();
    
        const interval = setInterval(checkConnection, 30000);
    
    return () => {
      clearInterval(interval);
      virtualProxyServer.off('started', handleServerStarted);
      virtualProxyServer.off('stopped', handleServerStopped);
    };
  }, [checkConnection]);

  const statusConfig = {
    checking: {
      icon: Loader2,
      color: 'text-zinc-500',
      text: 'Checking...',
      title: 'Checking connection...'
    },
    connected: {
      icon: CheckCircle2,
      color: 'text-green-600',
      text: 'Connected',
      title: 'Connected to proxy server'
    },
    disconnected: {
      icon: XCircle,
      color: 'text-red-600',
      text: 'Not Connected',
      title: errorMessage
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`flex items-center gap-1 ${config.color}`}
        title={config.title}
      >
        <Icon className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
        <span className="text-xs">{config.text}</span>
      </div>
      
      {status === 'connected' && onStopServer && (
        <button
          onClick={onStopServer}
          className="p-1 hover:bg-red-50 rounded-md transition-colors"
          title="Stop server"
        >
          <StopCircle className="w-4 h-4 text-red-500" />
        </button>
      )}
    </div>
  );
}
```

src/components/SettingsDialog.tsx
```tsx
import { useState, useEffect } from 'react';
import { Settings, X, AlertCircle, CheckCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Provider } from '../types';
import { saveApiKeys, getApiKeys, saveGatewayUrls, getGatewayUrls } from '../lib/store';
import { validateApiKey } from '../lib/validation';

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState(getApiKeys());
  const [gatewayUrls, setGatewayUrls] = useState(getGatewayUrls());
  const [keyValidation, setKeyValidation] = useState<Record<Provider, { isValid: boolean; message?: string }>>({});

    useEffect(() => {
    if (!isOpen) {
      setKeyValidation({});
    }
  }, [isOpen]);

  const handleApiKeyChange = (provider: Provider, value: string) => {
    const trimmedValue = value.trim();
    const validation = validateApiKey(provider, trimmedValue);
    
    setKeyValidation(prev => ({
      ...prev,
      [provider]: validation
    }));

    const newKeys = { ...apiKeys, [provider]: trimmedValue };
    setApiKeys(newKeys);
    saveApiKeys(newKeys);
  };

  const handleGatewayUrlChange = (provider: Provider, value: string) => {
    const newUrls = { ...gatewayUrls, [provider]: value.trim() };
    setGatewayUrls(newUrls);
    saveGatewayUrls(newUrls);
  };

  const renderKeyValidation = (provider: Provider) => {
    const validation = keyValidation[provider];
    if (!validation) return null;

    return (
      <div className={`flex items-center gap-1 mt-1 text-xs ${
        validation.isValid ? 'text-green-600' : 'text-red-600'
      }`}>
        {validation.isValid ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span>{validation.message}</span>
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-lg">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-zinc-500 mt-1">
              Configure your API keys and gateway URLs for each provider. Your keys are stored locally and never sent to our servers.
            </Dialog.Description>
          </div>

          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 mb-4">API Keys</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries({
                  openai: 'OpenAI',
                  anthropic: 'Anthropic',
                  google: 'Google AI',
                  openrouter: 'OpenRouter'
                }).map(([provider, label]) => (
                  <form key={provider} className="space-y-2" onSubmit={(e) => e.preventDefault()}>
                    <label htmlFor={`${provider}-key`} className="block text-sm font-medium text-zinc-700">
                      {label} API Key
                    </label>
                    <input
                      id={`${provider}-key`}
                      type="password"
                      autoComplete="off"
                      value={apiKeys[provider as Provider] || ''}
                      onChange={(e) => handleApiKeyChange(provider as Provider, e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        keyValidation[provider as Provider]?.isValid === false
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-zinc-200 focus:ring-indigo-500'
                      }`}
                      placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                      spellCheck="false"
                    />
                    {renderKeyValidation(provider as Provider)}
                    {provider === 'openrouter' && (
                      <p className="text-xs text-zinc-500">
                        Get your API key from{' '}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          OpenRouter
                        </a>
                      </p>
                    )}
                  </form>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-900 mb-4">Gateway URLs (Optional)</h3>
              <div className="grid grid-cols-1 gap-6">
                {Object.entries({
                  openai: ['OpenAI API URL', 'https://api.openai.com/v1'],
                  anthropic: ['Anthropic API URL', 'https://api.anthropic.com'],
                  google: ['Google AI API URL', 'https://generativelanguage.googleapis.com'],
                  openrouter: ['OpenRouter API URL', 'https://openrouter.ai/api/v1']
                }).map(([provider, [label, placeholder]]) => (
                  <form key={provider} className="space-y-2" onSubmit={(e) => e.preventDefault()}>
                    <label htmlFor={`${provider}-url`} className="block text-sm font-medium text-zinc-700">
                      {label}
                    </label>
                    <input
                      id={`${provider}-url`}
                      type="text"
                      value={gatewayUrls[provider as Provider] || ''}
                      onChange={(e) => handleGatewayUrlChange(provider as Provider, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={placeholder}
                      spellCheck="false"
                    />
                  </form>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

src/components/Sidebar.tsx
```tsx
import { MessageSquare, Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Chat, Provider } from '../lib/types';
import { deleteChat } from '../lib/store';
import { ProviderList } from './ProviderList';

interface SidebarProps {
  chats: Chat[];
  currentChat: Chat;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  model: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
}

interface EditableChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}

const EditableChatItem = ({ chat, isActive, onSelect, onDelete, onRename }: EditableChatItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    const newTitle = title.trim();
    if (newTitle) {
      onRename(newTitle);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTitle(chat.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
        isActive
          ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10'
          : 'hover:bg-gradient-to-r hover:from-indigo-500/5 hover:to-purple-500/5'
      }`}
      onClick={() => {
        if (!isEditing && !showDeleteConfirm) {
          onSelect();
        }
      }}
    >
      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
        isActive ? 'text-indigo-500' : 'text-zinc-500'
      }`} />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white/50 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRename();
            }}
            className="p-1 hover:bg-green-100 rounded"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTitle(chat.title);
              setIsEditing(false);
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ) : (
        <>
          <span className={`text-sm truncate flex-1 ${
            isActive ? 'text-zinc-900 font-medium' : 'text-zinc-900'
          }`}>
            {chat.title || 'New Chat'}
          </span>
          
          {!showDeleteConfirm && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
              >
                <Pencil className="w-4 h-4 text-indigo-600" />
              </button>
              {chat.id !== 'default' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Delete?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 hover:bg-red-100 rounded"
              >
                <Check className="w-4 h-4 text-red-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const Sidebar = ({ 
  chats, 
  currentChat, 
  onSelectChat, 
  onDeleteChat,
  provider,
  onProviderChange,
  onNewChat
}: SidebarProps) => {
  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    onDeleteChat(chatId);
  };

  const handleRenameChat = (chat: Chat, newTitle: string) => {
    const updatedChat = { ...chat, title: newTitle };
    onSelectChat(updatedChat);
  };

  return (
    <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col h-full">
      <div className="p-4 border-b border-purple-100">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text">
          MultiMind
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <ProviderList 
            value={provider} 
            onChange={onProviderChange}
          />
          
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-900">Chats</h3>
            {chats.map((chat) => (
              <EditableChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChat.id}
                onSelect={() => onSelectChat(chat)}
                onDelete={() => handleDeleteChat(chat.id)}
                onRename={(newTitle) => handleRenameChat(chat, newTitle)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

src/components/TypewriterText.tsx
```tsx
import { useState, useEffect, useCallback } from 'react';

interface TypewriterTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypewriterText = ({ content, speed = 30, onComplete }: TypewriterTextProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const animate = useCallback(() => {
    let currentIndex = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(prev => prev + content[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed, onComplete]);

  useEffect(() => {
    const cleanup = animate();
    return cleanup;
  }, [animate]);

  return (
    <div className={`animate-typing ${!isTyping ? 'after:hidden' : ''}`}>
      {displayedContent}
    </div>
  );
};
```

src/components/VirtualTerminal.tsx
```tsx
import { useEffect, useRef, useLayoutEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface VirtualTerminalProps {
  onReady: (terminal: Terminal) => void;
}

export function VirtualTerminal({ onReady }: VirtualTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

    useLayoutEffect(() => {
    if (terminalRef.current && !terminalInstance.current) {
            const term = new Terminal({
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#f6f6f4',
          selection: '#33467c',
          black: '#32344a',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#ad8ee6',
          cyan: '#449dab',
          white: '#787c99',
          brightBlack: '#444b6a',
          brightRed: '#ff7a93',
          brightGreen: '#b9f27c',
          brightYellow: '#ff9e64',
          brightBlue: '#7da6ff',
          brightMagenta: '#bb9af7',
          brightCyan: '#0db9d7',
          brightWhite: '#acb0d0'
        },
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        cursorBlink: true,
        convertEol: true,
        scrollback: 1000,
        disableStdin: true,
        rows: 20       });

            const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

            term.open(terminalRef.current);
      
            setTimeout(() => {
        if (fitAddon) {
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn('Failed to fit terminal:', error);
          }
        }
                terminalInstance.current = term;
        onReady(term);
      }, 0);
    }

    return () => {
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [onReady]);

    useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalInstance.current) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.warn('Failed to fit terminal on resize:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={terminalRef}
      className="w-full h-[300px] rounded-lg overflow-hidden border border-zinc-200"
      style={{ minHeight: '300px' }}     />
  );
}
```

src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    font-family: -apple-system, BlinkMacSystemFont, Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    @apply min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50;
  }

 
    height: 100%;
  }
}

/* Custom scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background:
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

/* Message animations */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* Typography */
.prose {
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
  line-height: 1.6;
}

.prose p {
  margin-bottom: 1em;
}

.prose p:last-child {
  margin-bottom: 0;
}

/* Performance optimizations */
* {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.gpu {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}
```

src/index.d.ts
```ts

interface ImportMetaEnv {
  readonly VITE_WORKER_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_PROXY_CONTROL_PORT: string
  readonly VITE_LITELLM_PORT: string
  readonly VITE_LOCAL_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'markdown-it' {
  interface MarkdownIt {
    render(markdown: string): string;
  }
  
  interface MarkdownItConstructor {
    new (): MarkdownIt;
  }
  
  const markdown: MarkdownItConstructor;
  export = markdown;
}

interface Window {
  markdownit: () => import('markdown-it');
}
```

src/lib/api/anthropic.ts
```ts
import { BaseApiClient } from './base';
import { Model } from '../types';

interface AnthropicModelsResponse {
  models: Array<{
    name: string;
    description?: string;
    max_tokens?: number;
  }>;
}

export class AnthropicClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model,
      provider: 'anthropic'
    };
  }

  protected override parseModelsResponse(response: AnthropicModelsResponse): Model[] {
    return response.models
      .filter(model => model.name.startsWith('claude'))
      .map(model => ({
        id: model.name,
        name: model.name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        provider: 'anthropic',
        capabilities: ['chat', 'code', 'analysis'],
        context_length: model.max_tokens
      }));
  }
}
```

src/lib/api/base.ts
```ts
import { ProviderType, APIError, Model, ApiKeys } from '../types';
import { getApiKeys } from '../store';
import { validateApiKey } from '../validation';
import { getProvider, isValidProvider } from '../providers';

const API_TIMEOUT = 30000; const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; const SERVER_ERROR_MESSAGES: Record<number, string> = {
  500: 'The server encountered an error. This could be temporary - please try again.',
  502: 'The server is temporarily unavailable. Please try again in a few moments.',
  503: 'The service is currently unavailable. Please try again later.',
  504: 'The server took too long to respond. Please try again.',
};

export abstract class BaseApiClient {
  protected readonly providerType: ProviderType;
  protected apiKeys: Record<ProviderType, string | undefined>;
  protected controller: AbortController | null = null;

  constructor(providerType: ProviderType) {
    if (!isValidProvider(providerType)) {
      throw new APIError(`Invalid provider type: ${providerType}`, 400);
    }
    this.providerType = providerType;
    this.apiKeys = getApiKeys();
  }

  private validateRequest(message: string, model: string) {
    if (!message?.trim()) {
      throw new APIError('Message cannot be empty', 400);
    }

    if (message.length > 32000) {
      throw new APIError('Message is too long (max 32,000 characters)', 400);
    }

    if (!model?.trim()) {
      throw new APIError('Model must be specified', 400);
    }

        const provider = getProvider(this.providerType);
    if (provider.requiresKey) {
      const apiKey = this.apiKeys[this.providerType];
      if (!apiKey) {
        throw new APIError(`API key for provider ${this.providerType} is missing`, 401);
      }
      const validation = validateApiKey(this.providerType, apiKey);
      
      if (!validation.isValid) {
        throw new APIError(
          `Invalid API key for ${provider.name}: ${validation.message}`,
          401,
          'invalid_api_key'
        );
      }

      return { apiKey };
    }

    return {};
  }

  public stopResponse() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

    protected abstract formatRequest(message: string, model: string): any;

  protected isValidResponse(data: any): boolean {
    return !!(data?.choices?.[0]?.message?.content || data?.result?.response);
  }

  protected extractResponseContent(data: any): string {
    if (!this.isValidResponse(data)) {
      throw new APIError(
        'Invalid response format from API',
        500,
        'invalid_response'
      );
    }

    return (data.choices?.[0]?.message?.content || data.result?.response).trim();
  }

  protected parseModelsResponse(response: any): Model[] {
    throw new APIError('Model fetching not implemented for this provider');
  }

    protected async makeRequest(url: string, data: any, retryCount = 0): Promise<any> {
    try {
      this.controller = new AbortController();
      
      const apiKey = this.apiKeys[this.providerType];
      if (!apiKey) {
        throw new APIError(`API key for provider ${this.providerType} is missing`, 401);
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(data),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new APIError(`Request failed with status ${response.status}`, response.status);
      }

      return await response.json();
    } catch (error: unknown) {
            const isError = (err: unknown): err is Error => err instanceof Error;

            if (isError(error) && error.name === 'AbortError') {
        throw new APIError('Request cancelled');
      }

            const errorMessage = isError(error) ? error.message ?? 'Unknown error' : String(error);
      const isServerError = error instanceof APIError && (error as APIError)?.status >= 500;
      const shouldRetry = retryCount < MAX_RETRIES && (
        (isError(error) && (
          error.name === 'TypeError' ||           error.message?.includes('fetch')         )) ||
        isServerError       );

      if (shouldRetry) {
        console.warn(`Retrying request. Error: ${errorMessage}`);
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, data, retryCount + 1);
      }

      if (isError(error) && error.message) {
        console.error(`Error: ${error.message}`);
      }
      throw new APIError('An unexpected error occurred');
    } finally {
      this.controller = null;
    }
  }

  public async sendMessage(message: string, model: string): Promise<any> {
        this.validateRequest(message, model);

        const requestData = this.formatRequest(message, model);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/chat';
      const endpoint = requestData.endpoint || '/completions';
      const response = await this.makeRequest(`${baseUrl}${endpoint}`, requestData);
      const content = this.extractResponseContent(response);

      return {
        success: true,
        result: {
          response: content,
          usage: response.usage
        }
      };
    } catch (error) {
            if (this.isError(error)) {
        if (error.message?.includes('fetch')) {
          throw new APIError(
            'Network error. Please check your internet connection.',
            0,
            'network_error'
          );
        }
      }

      throw error;
    }
  }

  private isError(error: unknown): error is Error {
    return error instanceof Error;
  }
}
```

src/lib/api/cloudflare.ts
```ts
import { BaseApiClient } from './base';
import { Model } from '../types';

export class CloudflareClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model,
      provider: 'cloudflare'
    };
  }
}
```

src/lib/api/factory.ts
```ts
import { ProviderType } from '../types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';
import { GoogleClient } from './google';
import { CloudflareClient } from './cloudflare';
import { OpenRouterClient } from './openrouter';

const clientInstances: Map<ProviderType, InstanceType<any>> = new Map();

export function createApiClient(providerType: ProviderType) {
    const existingClient = clientInstances.get(providerType);
  if (existingClient) {
    return existingClient;
  }

    let client;
  switch (providerType) {
    case 'openai':
      client = new OpenAIClient(providerType);
      break;
    case 'anthropic':
      client = new AnthropicClient(providerType);
      break;
    case 'google':
      client = new GoogleClient(providerType);
      break;
    case 'cloudflare':
      client = new CloudflareClient(providerType);
      break;
    case 'openrouter':
      client = new OpenRouterClient(providerType);
      break;
    default:
      throw new Error(`Unsupported provider: ${providerType}`);
  }

    clientInstances.set(providerType, client);
  return client;
}

export function clearApiClientCache() {
  clientInstances.clear();
}
```

src/lib/api/google.ts
```ts
import { BaseApiClient } from './base';
import { Model, APIError } from '../types';
import { getGatewayUrls } from '../store';

interface GoogleChatRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GoogleChatResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GoogleClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
        const actualModel = model === 'auto' ? 'gemini-1.0-pro' : model;
    
        const gatewayUrl = getGatewayUrls().google;
    const isDirectApi = !gatewayUrl; 
        const request: GoogleChatRequest = {
      contents: [{
        role: 'user',
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    if (isDirectApi) {
            return {
        ...request,
        model: this.normalizeModelName(actualModel),
        provider: 'google',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta'
      };
    } else {
            return {
        ...request,
        model: actualModel,
        provider: 'google',
        baseURL: gatewayUrl
      };
    }
  }

  private normalizeModelName(model: string): string {
        const cleanModel = model.replace(/^models\//, '');
        return cleanModel.includes('/') ? cleanModel : `models/${cleanModel}`;
  }

  protected override parseModelsResponse(response: any): Model[] {
    if (!response?.models) {
      throw new APIError('Invalid response from Google API');
    }

    return response.models
      .filter((model: any) => 
        model.name.includes('gemini') &&
        model.supported_generation_methods?.includes('generateContent')
      )
      .map((model: any) => {
        const modelId = model.name.split('/').pop() || model.name;
        const isVision = modelId.toLowerCase().includes('vision');
        
        return {
          id: modelId,
          name: model.display_name || this.formatModelName(modelId),
          provider: 'google',
          capabilities: [
            'chat',
            ...(isVision ? ['vision'] as const : []),
            'code',
            ...(modelId.includes('pro') ? ['analysis'] as const : [])
          ],
          context_length: model.input_token_limit || 32000
        };
      });
  }

  protected override isValidResponse(response: GoogleChatResponse): boolean {
    if (response.error) {
      throw new APIError(
        response.error.message,
        response.error.code,
        'google_api_error',
        response.error.status
      );
    }

    return !!(
      response.candidates?.[0]?.content?.parts?.[0]?.text
    );
  }

  protected override extractResponseContent(response: GoogleChatResponse): string {
    if (!this.isValidResponse(response)) {
      throw new APIError(
        'Invalid response format from Google API',
        500,
        'invalid_response'
      );
    }

        const text = response.candidates![0].content.parts[0].text;
    return text.trim();
  }

  private formatModelName(modelId: string): string {
    return modelId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  public async makeRequest(url: string, data: any): Promise<any> {
    try {
      const apiKey = this.apiKeys.google;
      if (!apiKey) {
        throw new APIError('Google API key is required', 401);
      }

      const isDirectApi = !getGatewayUrls().google;
      let fullUrl = url;
      
      if (isDirectApi) {
                const modelName = data.model;
        fullUrl = `${data.baseURL}/${modelName}:generateContent`;
        
                const { model, provider, baseURL, ...requestBody } = data;
        data = requestBody;
      }

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDirectApi ? {
            'x-goog-api-key': apiKey
          } : {
            'Authorization': `Bearer ${apiKey}`
          })
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || 
          `Request failed with status ${response.status}`;
        const errorCode = errorData?.error?.code || response.status;

        throw new APIError(
          errorMessage,
          response.status,
          'google_api_error',
          errorCode
        );
      }

      const responseData = await response.json();

            if (isDirectApi && responseData) {
                return {
          candidates: responseData.candidates || [],
          promptFeedback: responseData.promptFeedback || {},
        };
      }

      return responseData;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error.message || 'Failed to make request to Google API',
        500,
        'google_api_error'
      );
    }
  }
}
```

src/lib/api/litellm-client.ts
```ts

```

src/lib/api/litellm.ts
```ts
import { BaseApiClient } from './base';

export class LiteLLMClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model,
      provider: 'litellm'
    };
  }
}
```

src/lib/api/openai.ts
```ts
import { BaseApiClient } from './base';
import { Model } from '../types';
import { getGatewayUrls, getApiKeys } from '../store';

interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    name?: string;
    owned_by?: string;
  }>;
}

export class OpenAIClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
        return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model,
      max_tokens: 2048,
      temperature: 0.7
    };
  }

  protected async makeRequest(url: string, data: any): Promise<any> {
    const apiKey = getApiKeys().openai;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

        const gatewayUrl = getGatewayUrls().openai;
    const baseUrl = gatewayUrl || 'https://api.openai.com/v1';
    const endpoint = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Request failed with status ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  protected override parseModelsResponse(response: OpenAIModelsResponse): Model[] {
    return response.data
      .filter(model => 
                model.id.includes('gpt') && 
        !model.id.includes('instruct')
      )
      .map(model => ({
        id: model.id,
        name: model.id
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        provider: 'openai',
        capabilities: [
          'chat',
          'code',
          ...(model.id.includes('gpt-4') ? ['analysis'] as const : [])
        ]
      }));
  }

  public async fetchModels(): Promise<Model[]> {
    const apiKey = getApiKeys().openai;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const gatewayUrl = getGatewayUrls().openai;
    const baseUrl = gatewayUrl || 'https://api.openai.com/v1';
    const endpoint = `${baseUrl}/models`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to fetch models with status ${response.status}`
        );
      }

      const data = await response.json();
      return this.parseModelsResponse(data);
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      throw error;
    }
  }
}
```

src/lib/api/openrouter.ts
```ts
import { BaseApiClient } from './base';
import { APIError, Model } from '../types';
import { getGatewayUrls, getApiKeys } from '../store';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: string;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface OpenRouterCompletion {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
        return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model: 'gpt-3.5-turbo',       headers: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MultiMind Chat'
      }
    };
  }

  public async fetchModels(): Promise<Model[]> {
    const apiKey = getApiKeys().openrouter;
    if (!apiKey) {
      throw new APIError('OpenRouter API key is required', 401);
    }

    const baseURL = getGatewayUrls().openrouter || 'https://openrouter.ai/api/v1';
    const url = `${baseURL}/models`;

    try {
      const response = await fetch(url, {
   const models: Model[] = [{
     id: 'auto',
     name: 'Auto (Best Available)',
     provider: 'openrouter',
     capabilities: ['chat', 'code', 'analysis'],
     context_length: 0,
     isAuto: true     } as Model];     method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MultiMind Chat'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new APIError(
          errorData?.error?.message || `Failed to fetch models with status ${response.status}`,
          response.status,
          'openrouter_api_error'
        );
      }

      const data = await response.json();
      return this.parseModelsResponse(data);
    } catch (error) {
            if (error instanceof Error) {
        console.error(`Error occurred: ${error.message}`);
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  protected async makeRequest(url: string, data: any): Promise<OpenRouterCompletion> {
    const { headers, ...requestData } = data;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.openrouter}`,
          'HTTP-Referer': headers['HTTP-Referer'] || window.location.origin,
          'X-Title': headers['X-Title'] || 'MultiMind Chat'
        },
        body: JSON.stringify({
          ...requestData,
          route: "fallback"         })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new APIError(
          errorData?.error?.message || `Request failed with status ${response.status}`,
          response.status,
          errorData?.error?.type,
          errorData?.error?.code
        );
      }

      return await response.json();
    } catch (error) {
            if (error instanceof Error) {
        console.error(`Error occurred: ${error.message}`);
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  protected isValidResponse(data: OpenRouterCompletion): boolean {
    return !!(
      data &&
      Array.isArray(data.choices) &&
      data.choices.length > 0 &&
      data.choices[0].message?.content
    );
  }

  protected extractResponseContent(data: OpenRouterCompletion): string {
    if (!this.isValidResponse(data)) {
      throw new APIError(
        'Invalid response from OpenRouter',
        500,
        'invalid_response'
      );
    }

    return data.choices[0].message.content.trim();
  }

  private getModelCapabilities(model: OpenRouterModel): ('chat' | 'code' | 'analysis')[] {
    const capabilities: ('chat' | 'code' | 'analysis')[] = ['chat'];
    const id = model.id.toLowerCase();
    const desc = (model.description || '').toLowerCase();
    
        if (
      id.includes('gpt-4') ||
      id.includes('claude') ||
      id.includes('code') ||
      id.includes('gemini') ||
      id.includes('mixtral') ||
      id.includes('solar') ||
      id.includes('qwen') ||
      id.includes('deepseek') ||
      id.includes('dolphin') ||
      id.includes('openchat') ||
      id.includes('codellama') ||
      id.includes('phi-2') ||
      id.includes('wizard') ||
      desc.includes('code') ||
      desc.includes('programming')
    ) {
      capabilities.push('code');
    }

        if (
      id.includes('gpt-4') ||
      id.includes('claude-3') ||
      id.includes('claude-2') ||
      id.includes('gemini-pro') ||
      id.includes('mixtral') ||
      id.includes('solar') ||
      id.includes('qwen') ||
      id.includes('yi-') ||
      id.includes('palm') ||
      id.includes('-70b') ||
      id.includes('-180b') ||
      id.includes('deepseek') ||
      id.includes('dolphin') ||
      id.includes('openchat') ||
      desc.includes('complex') ||
      desc.includes('analytical') ||
      desc.includes('reasoning') ||
      desc.includes('expert')
    ) {
      capabilities.push('analysis');
    }

    return capabilities;
  }

  private formatModelName(model: OpenRouterModel): string {
        const [provider] = model.id.split('/');
    const providerDisplay = this.formatProviderName(provider);
    
        let priceInfo = '';
    if (model.pricing) {
      const prompt = parseFloat(model.pricing.prompt);
      const completion = parseFloat(model.pricing.completion);
      if (!isNaN(prompt) && !isNaN(completion)) {
                if (prompt === 0 && completion === 0) {
          priceInfo = ' (Free)';
        } else {
          priceInfo = ` ($${prompt.toFixed(3)}/$${completion.toFixed(3)})`;
        }
      }
    }

    return `${model.name} - ${providerDisplay}${priceInfo}`;
  }

  private formatProviderName(provider: string): string {
    const providerNames: { [key: string]: string } = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'meta': 'Meta',
      'mistral': 'Mistral AI',
      'palm': 'PaLM',
      'cohere': 'Cohere',
      'deepseek': 'DeepSeek',
      'phind': 'Phind',
      'perplexity': 'Perplexity',
      'groq': 'Groq',
      'databricks': 'Databricks',
      'aws': 'Amazon',
      'azure': 'Azure',
      'anyscale': 'Anyscale',
      'ollama': 'Ollama',
      'openchat': 'OpenChat AI',
      'yi': 'Yi AI',
      'qwen': 'Qwen',
      'anthropic-legacy': 'Anthropic Legacy'
    };

    return providerNames[provider] || provider
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  protected parseModelsResponse(response: OpenRouterModelsResponse): Model[] {
    if (!response?.data) {
      throw new APIError('Invalid models response from OpenRouter');
    }

        const models: Model[] = [{
      id: 'auto',
      name: 'Auto (Best Available)',
      provider: 'openrouter',
      capabilities: ['chat', 'code', 'analysis'],
      isAuto: true,
      description: 'Automatically selects the best available model'
    }];

        const apiModels = response.data.map(model => ({
      id: model.id,
      name: this.formatModelName(model),
      provider: 'openrouter',
      capabilities: this.getModelCapabilities(model),
      context_length: model.context_length || this.estimateContextLength(model),
      description: model.description
    }));

        const sortedModels = apiModels.sort((a, b) => {
      const [providerA] = a.id.split('/');
      const [providerB] = b.id.split('/');
      return providerA.localeCompare(providerB) || a.name.localeCompare(b.name);
    });

        return [...models, ...sortedModels];
  }

  private estimateContextLength(model: OpenRouterModel): number {
    const id = model.id.toLowerCase();

        if (id.includes('gpt-4-turbo')) return 128000;
    if (id.includes('gpt-4-32k')) return 32768;
    if (id.includes('gpt-4')) return 8192;
    if (id.includes('gpt-3.5-turbo-16k')) return 16384;
    if (id.includes('gpt-3.5')) return 4096;
    if (id.includes('claude-3')) return 200000;
    if (id.includes('claude-2')) return 100000;
    if (id.includes('claude-instant')) return 100000;
    if (id.includes('gemini-pro')) return 32768;
    if (id.includes('mixtral')) return 32768;
    if (id.includes('solar')) return 8192;
    if (id.includes('yi-')) return 32768;
    if (id.includes('qwen')) return 32768;
    if (id.includes('dolphin')) return 16384;
    if (id.includes('openchat')) return 8192;
    if (id.includes('deepseek-coder')) return 32768;
    if (id.includes('deepseek')) return 16384;
    if (id.includes('llama-2-70b')) return 4096;
    if (id.includes('llama-2')) return 4096;
    if (id.includes('codellama')) return 16384;
    if (id.includes('phi-2')) return 2048;
    if (id.includes('wizard')) return 8192;

        const desc = (model.description || '').toLowerCase();
    if (desc.includes('32k') || desc.includes('32000')) return 32768;
    if (desc.includes('16k') || desc.includes('16000')) return 16384;
    if (desc.includes('8k') || desc.includes('8000')) return 8192;

        if (id.includes('-70b') || id.includes('-65b')) return 8192;
    if (id.includes('-34b') || id.includes('-35b')) return 4096;
    if (id.includes('-13b') || id.includes('-14b')) return 4096;
    if (id.includes('-7b') || id.includes('-8b')) return 4096;

        return 4096;
  }
}
```

src/lib/events/EventEmitter.ts
```ts
type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: { [key: string]: EventCallback[] } = {};
  private maxListeners: number = 10;
  private recursionDepth: number = 0;
  private maxRecursionDepth: number = 25;

  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

        if (this.events[event].length >= this.maxListeners) {
      console.warn(`Warning: Event '${event}' has exceeded ${this.maxListeners} listeners`);
    }

    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;

        this.recursionDepth++;
    if (this.recursionDepth > this.maxRecursionDepth) {
      this.recursionDepth = 0;
      console.error(`Maximum recursion depth exceeded for event '${event}'`);
      return;
    }

    try {
            const listeners = [...this.events[event]];
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    } finally {
      this.recursionDepth--;
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
}
```

src/lib/providers.ts
```ts
import { Provider, ProviderType, Model } from './types';

export const providers: Record<ProviderType, Provider> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    description: 'GPT-3.5, GPT-4, and DALL·E models',
    requiresKey: true,
    supportsProxy: true,
    capabilities: ['chat', 'code', 'analysis']
  },
  anthropic: {
    type: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models with long context support',
    requiresKey: true,
    supportsProxy: true,
    capabilities: ['chat', 'code', 'analysis']
  },
  google: {
    type: 'google',
    name: 'Google AI',
    description: 'Gemini series models including Pro 1.5',
    requiresKey: true,
    supportsProxy: true,
    capabilities: ['chat', 'code', 'analysis', 'vision']
  },
  cloudflare: {
    type: 'cloudflare',
    name: 'Cloudflare',
    description: 'Workers AI models',
    requiresKey: false,
    supportsProxy: false,
    capabilities: ['chat']
  },
  openrouter: {
    type: 'openrouter',
    name: 'OpenRouter',
    description: 'Access to multiple model providers',
    requiresKey: true,
    supportsProxy: true,
    capabilities: ['chat', 'code']
  }
};

export const isValidProvider = (type: string): type is ProviderType => {
  return type in providers;
};

export const getProvider = (providerType: ProviderType): Provider => {
  if (!isValidProvider(providerType)) {
    throw new Error(`Invalid provider type: ${providerType}`);
  }
  return providers[providerType];
};

export const getProviderModels = async (provider: ProviderType): Promise<Model[]> => {
    if (!provider || !isValidProvider(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

    const models = await getProviderStaticModels(provider);

    if (provider === 'openrouter') {
    const autoModel: Model = {
      id: 'auto',
      name: 'Auto (Best Available)',
      provider,
      capabilities: ['chat', 'code', 'analysis'],
      isAuto: true,
      description: 'Automatically selects the best available model'
    };
    return [autoModel, ...models];
  }

  return models;
};

const getProviderStaticModels = async (provider: ProviderType): Promise<Model[]> => {
  switch (provider) {
    case 'openai':
      return [
        {
          id: 'gpt-4-turbo-preview',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 128000
        },
        {
          id: 'gpt-4-0125-preview',
          name: 'GPT-4 Turbo (0125)',
          provider: 'openai',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 128000
        },
        {
          id: 'gpt-4-vision-preview',
          name: 'GPT-4 Vision',
          provider: 'openai',
          capabilities: ['chat', 'code', 'analysis', 'vision'],
          context_length: 128000
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 8192
        },
        {
          id: 'gpt-4-32k',
          name: 'GPT-4 (32K)',
          provider: 'openai',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 32768
        },
        {
          id: 'gpt-3.5-turbo-0125',
          name: 'GPT-3.5 Turbo (0125)',
          provider: 'openai',
          capabilities: ['chat', 'code'],
          context_length: 16385
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          capabilities: ['chat', 'code'],
          context_length: 16384
        },
        {
          id: 'gpt-3.5-turbo-16k',
          name: 'GPT-3.5 Turbo (16K)',
          provider: 'openai',
          capabilities: ['chat', 'code'],
          context_length: 16384
        }
      ];

    case 'anthropic':
      return [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          capabilities: ['chat', 'code', 'analysis', 'vision'],
          context_length: 200000
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          capabilities: ['chat', 'code', 'analysis', 'vision'],
          context_length: 200000
        },
        {
          id: 'claude-3-haiku',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          capabilities: ['chat', 'code', 'vision'],
          context_length: 200000
        },
        {
          id: 'claude-2.1',
          name: 'Claude 2.1',
          provider: 'anthropic',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 200000
        },
        {
          id: 'claude-2.0',
          name: 'Claude 2.0',
          provider: 'anthropic',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 100000
        },
        {
          id: 'claude-instant-1.2',
          name: 'Claude Instant 1.2',
          provider: 'anthropic',
          capabilities: ['chat', 'code'],
          context_length: 100000
        }
      ];

    case 'google':
      return [
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini Pro 1.5',
          provider: 'google',
          capabilities: ['chat', 'code', 'analysis', 'vision'],
          context_length: 1000000,
          description: 'Latest Gemini model with 1M token context'
        },
        {
          id: 'gemini-1.5-pro-vision',
          name: 'Gemini Pro 1.5 Vision',
          provider: 'google',
          capabilities: ['chat', 'vision', 'analysis'],
          context_length: 1000000,
          description: 'Vision-enabled Gemini 1.5 with advanced image understanding'
        },
        {
          id: 'gemini-1.0-pro',
          name: 'Gemini Pro 1.0',
          provider: 'google',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 32768,
          description: 'Previous generation Gemini model'
        },
        {
          id: 'gemini-1.0-pro-vision',
          name: 'Gemini Pro Vision 1.0',
          provider: 'google',
          capabilities: ['chat', 'vision'],
          context_length: 16384,
          description: 'Previous generation vision model'
        }
      ];

    case 'cloudflare':
      return [
        {
          id: '@cf/meta/llama-2-7b-chat-int8',
          name: 'Llama 2 7B Chat',
          provider: 'cloudflare',
          capabilities: ['chat'],
          context_length: 4096
        },
        {
          id: '@cf/meta/llama-2-13b-chat-int8',
          name: 'Llama 2 13B Chat',
          provider: 'cloudflare',
          capabilities: ['chat'],
          context_length: 4096
        },
        {
          id: '@cf/mistral/mistral-7b-instruct-v0.1',
          name: 'Mistral 7B Instruct',
          provider: 'cloudflare',
          capabilities: ['chat'],
          context_length: 8192
        },
        {
          id: '@cf/tiiuae/falcon-7b-instruct',
          name: 'Falcon 7B Instruct',
          provider: 'cloudflare',
          capabilities: ['chat'],
          context_length: 2048
        },
        {
          id: '@cf/thebloke/codellama-34b-instruct-awq',
          name: 'CodeLlama 34B Instruct',
          provider: 'cloudflare',
          capabilities: ['chat', 'code'],
          context_length: 16384
        }
      ];

    case 'openrouter':
      return [
        {
          id: 'openai/gpt-4-turbo-preview',
          name: 'GPT-4 Turbo (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 128000
        },
        {
          id: 'anthropic/claude-3-opus',
          name: 'Claude 3 Opus (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 200000
        },
        {
          id: 'anthropic/claude-3-sonnet',
          name: 'Claude 3 Sonnet (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code', 'analysis'],
          context_length: 200000
        },
        {
          id: 'anthropic/claude-3-haiku',
          name: 'Claude 3 Haiku (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code'],
          context_length: 200000
        },
        {
          id: 'google/gemini-pro',
          name: 'Gemini Pro (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code'],
          context_length: 32768
        },
        {
          id: 'meta-llama/llama-2-70b-chat',
          name: 'Llama 2 70B Chat (via OpenRouter)',
          provider: 'openrouter',
          capabilities: ['chat', 'code'],
          context_length: 4096
        }
      ];

    default:
      return [];
  }
};

export const selectBestModel = (provider: ProviderType, models: Model[]): string => {
    if (provider === 'openrouter') {
    const autoModel = models.find(m => m.isAuto);
    if (autoModel) return autoModel.id;
  }

    const availableModels = models.filter(m => !m.isAuto);
  
  switch (provider) {
    case 'openai':
            return availableModels.find(m => m.id === 'gpt-4-turbo-preview')?.id ||
             availableModels.find(m => m.id === 'gpt-3.5-turbo')?.id ||
             availableModels[0]?.id;
             
    case 'anthropic':
            return availableModels.find(m => m.id === 'claude-3-opus')?.id ||
             availableModels.find(m => m.id === 'claude-3-sonnet')?.id ||
             availableModels.find(m => m.id.includes('claude-2'))?.id ||
             availableModels[0]?.id;

    case 'google':
            return availableModels.find(m => m.id === 'gemini-1.5-pro')?.id ||
             availableModels.find(m => m.id === 'gemini-1.0-pro')?.id ||
             availableModels[0]?.id;

    case 'cloudflare':
            return availableModels.find(m => m.id.includes('llama-2-13b'))?.id ||
             availableModels.find(m => m.id.includes('mistral'))?.id ||
             availableModels[0]?.id;

    case 'openrouter':
            return availableModels.find(m => m.id === 'openai/gpt-4-turbo-preview')?.id ||
             availableModels.find(m => m.id === 'anthropic/claude-3-opus')?.id ||
             availableModels.find(m => m.id === 'google/gemini-pro')?.id ||
             availableModels[0]?.id;

    default:
      return availableModels[0]?.id;
  }
};

export const getDefaultModel = (type: ProviderType): string => {
    if (type === 'openrouter') {
    return 'auto';
  }

    switch (type) {
    case 'openai':
      return 'gpt-3.5-turbo';
    case 'anthropic':
      return 'claude-3-sonnet';
    case 'google':
      return 'gemini-1.5-pro';
    case 'cloudflare':
      return '@cf/meta/llama-2-13b-chat-int8';
    default:
      return '';
  }
};

export const getModelDisplay = (providerType: ProviderType, modelId: string): string => {
    if (modelId === 'auto') {
    if (providerType === 'openrouter') {
      return 'Auto (Best Available)';
    }
    return modelId;   }

    let displayName = modelId;

    if (modelId.includes('/')) {
    const [provider, model] = modelId.split('/');
    displayName = model;
  }

    displayName = displayName
    .replace(/^@cf\//, '')
    .replace(/^@hf\//, '')
    .replace(/^meta\//, '')
    .replace(/^mistral\//, '');

    return displayName
    .split(/[-_]/)
    .map(word => {
            if (word.match(/^\d+[bB]$/)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/([0-9]+[A-Z])/g, ' $1')     .replace(/([A-Z][a-z])/g, ' $1')      .trim();
};
```

src/lib/router.ts
```ts
import { router } from './router.tsx';
export { router };
```

src/lib/router.tsx
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { ChatView } from '../components/ChatView';
import { NotFound } from '../components/NotFound';
import { ProxyGuide } from '../components/ProxyGuide';
import { getChats } from './store';
import { LoadingScreen } from '../components/LoadingScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
        HydrateFallback: LoadingScreen,
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: 'chat',
        element: <ChatView initialChats={getChats()} />,
        loader: async () => {
                    await new Promise(resolve => setTimeout(resolve, 500));           return { chats: getChats() };
        },
                HydrateFallback: LoadingScreen,
      },
      {
        path: 'chat/:chatId',
        element: <ChatView initialChats={getChats()} />,
        loader: async ({ params }) => {
                    await new Promise(resolve => setTimeout(resolve, 500));           const chats = getChats();
          const chat = chats.find(c => c.id === params.chatId);
          if (!chat) {
            throw new Error('Chat not found');
          }
          return { chat, chats };
        },
                HydrateFallback: LoadingScreen,
      },
      {
        path: 'proxy-guide',
        element: <ProxyGuide />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
], {
  future: {
    v7_startTransition: true,                  v7_relativeSplatPath: true,                v7_fetcherPersist: true,                  v7_normalizeFormMethod: true,              v7_partialHydration: true,                 v7_prependBasename: true,                  v7_skipEntireTreeOnNullChild: true,        v7_unwrapElementsByDefault: true,          v7_skipActionErrorRevalidation: true     }
});
```

src/lib/store.ts
```ts
import { Chat, ApiKeys, GatewayURLs } from './types';

const CHATS_KEY = 'multimind-chats';
const API_KEYS_KEY = 'multimind-api-keys';
const GATEWAY_URLS_KEY = 'multimind-gateway-urls';
const LITELLM_PROXY_URL_KEY = 'multimind-litellm-proxy-url';

const initializeStore = () => {
  try {
        const testKey = '_test_' + Math.random();
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
  } catch (error) {
    console.error('LocalStorage is not available:', error);
    throw new Error('Unable to access local storage. Please enable cookies and reload the page.');
  }
};

initializeStore();

export const saveChat = (chat: Chat) => {
  try {
    const chats = getChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.unshift(chat);     }
    
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to save chat:', error);
    throw new Error('Failed to save chat. Please check your browser storage settings.');
  }
};

export const getChats = (): Chat[] => {
  try {
    const chats = localStorage.getItem(CHATS_KEY);
    return chats ? JSON.parse(chats) : [];
  } catch (error) {
    console.error('Failed to get chats:', error);
    return [];
  }
};

export const deleteChat = (chatId: string) => {
  try {
    const chats = getChats().filter(chat => chat.id !== chatId);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to delete chat:', error);
    throw new Error('Failed to delete chat. Please try again.');
  }
};

export const deleteAllChats = () => {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to delete all chats:', error);
    throw new Error('Failed to delete all chats. Please try again.');
  }
};

export const saveApiKeys = (keys: ApiKeys) => {
  try {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Failed to save API keys:', error);
    throw new Error('Failed to save API keys. Please try again.');
  }
};

export const getApiKeys = (): ApiKeys => {
  try {
    const keys = localStorage.getItem(API_KEYS_KEY);
    return keys ? JSON.parse(keys) : {};
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return {};
  }
};

export const saveGatewayUrls = (urls: GatewayURLs) => {
  try {
    localStorage.setItem(GATEWAY_URLS_KEY, JSON.stringify(urls));
  } catch (error) {
    console.error('Failed to save gateway URLs:', error);
    throw new Error('Failed to save gateway URLs. Please try again.');
  }
};

export const getGatewayUrls = (): GatewayURLs => {
  try {
    const urls = localStorage.getItem(GATEWAY_URLS_KEY);
    return urls ? JSON.parse(urls) : {};
  } catch (error) {
    console.error('Failed to get gateway URLs:', error);
    return {};
  }
};

export const saveLiteLLMProxyUrl = (url: string) => {
  try {
    localStorage.setItem(LITELLM_PROXY_URL_KEY, url);
  } catch (error) {
    console.error('Failed to save LiteLLM proxy URL:', error);
    throw new Error('Failed to save proxy URL. Please try again.');
  }
};

export const getLiteLLMProxyUrl = (): string | null => {
  try {
    return localStorage.getItem(LITELLM_PROXY_URL_KEY);
  } catch (error) {
    console.error('Failed to get LiteLLM proxy URL:', error);
    return null;
  }
};

export const clearLiteLLMProxyUrl = () => {
  try {
    localStorage.removeItem(LITELLM_PROXY_URL_KEY);
  } catch (error) {
    console.error('Failed to clear LiteLLM proxy URL:', error);
    throw new Error('Failed to clear proxy URL. Please try again.');
  }
};
```

src/lib/types.ts
```ts
export type Provider = 'openai' | 'cloudflare' | 'google' | 'openrouter' | 'anthropic';

export type ModelCapability = 'chat' | 'code' | 'analysis' | 'vision';

export interface ProviderInfo {
  type: Provider;
  name: string;
  description: string;
  requiresKey: boolean;
  supportsProxy: boolean;
  capabilities: ModelCapability[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider: Provider;
  model: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  provider: Provider;
  model: string;
}

export interface ApiKeys {
  openai?: string;
  cloudflare?: string;
  google?: string;
  openrouter?: string;
  anthropic?: string;
}

export interface GatewayURLs {
  openai?: string;
  google?: string;
  openrouter?: string;
}

export interface Model {
  id: string;
  name: string;
  provider: Provider;
  capabilities: ('chat' | 'code' | 'analysis')[];
  context_length: number;
  isAuto?: boolean;
  description?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface APIResponse {
  success: boolean;
  result?: {
    response: string;
    usage?: TokenUsage;
  };
  error?: {
    message: string;
    type?: string;
    code?: string;
    status?: number;
  };
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly type?: string
  ) {
    super(message);
    this.name = 'APIError';
    
        Object.setPrototypeOf(this, APIError.prototype);
    
        if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  toJSON() {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
      type: this.type,
      stack: this.stack
    };
  }

  toString() {
    return `${this.name}: ${this.message} (${this.status})`;
  }
}
```

src/lib/validation.ts
```ts
import { Provider } from './types';

interface KeyValidation {
  isValid: boolean;
  message?: string;
}

export function validateApiKey(provider: Provider, key: string): KeyValidation {
  if (!key) {
    return {
      isValid: false,
      message: 'API key is required'
    };
  }

    key = key.trim();

  switch (provider) {
    case 'openai':
      if (!key.startsWith('sk-') || key.length < 40) {
        return {
          isValid: false,
          message: 'Invalid OpenAI key format (should start with sk-)'
        };
      }
      break;

    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        return {
          isValid: false,
          message: 'Invalid Anthropic key format (should start with sk-ant-)'
        };
      }
      break;

    case 'google':
      if (key.length < 20) {
        return {
          isValid: false,
          message: 'Invalid Google API key length'
        };
      }
      break;

    case 'openrouter':
      if (!key.startsWith('sk-or-')) {
        return {
          isValid: false,
          message: 'Invalid OpenRouter key format (should start with sk-or-)'
        };
      }
      break;

    default:
      return {
        isValid: false,
        message: 'Unknown provider'
      };
  }

  return {
    isValid: true,
    message: 'Valid API key'
  };
}

export function validateGatewayUrl(url: string): boolean {
  if (!url) return true; 
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

src/lib/virtualProxy/VirtualProxyServer.ts
```ts
import { EventEmitter } from '../events/EventEmitter';
import { ProviderType } from '../types';
import { APIError } from '../types';
import { createApiClient } from '../api/factory';

interface VirtualTerminal {
  writeln: (text: string) => void;
  clear: () => void;
}

interface QueuedRequest {
  id: string;
  timestamp: number;
  execute: () => Promise<any>;
  retries?: number;
  timeoutId?: NodeJS.Timeout;
}

interface RequestStats {
  requestCount: number;
  requestWindow: number[];
  pendingRequests: Map<string, boolean>;
  requestQueue: QueuedRequest[];
  startTime: number;
}

export class VirtualProxyServer extends EventEmitter {
  private running: boolean = false;
  private terminal: VirtualTerminal | null = null;
  private stats: RequestStats = {
    requestCount: 0,
    requestWindow: [],
    pendingRequests: new Map(),
    requestQueue: [],
    startTime: 0
  };

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;   private readonly REQUEST_TIMEOUT = 30000;   private readonly MAX_QUEUE_SIZE = 100;
  private readonly RATE_LIMIT = 50;   private readonly ERROR_CODES_NO_RETRY = new Set([400, 401, 403, 404]);
  private readonly REQUEST_WINDOW = 60000;   
  constructor() {
    super();
        setInterval(() => this.cleanRequestWindow(), 10000);
        setInterval(() => this.monitorQueueHealth(), 5000);
  }

  public setTerminal(terminal: VirtualTerminal) {
    this.terminal = terminal;
  }

  private log(message: string, level: 'info' | 'error' | 'warning' | 'success' = 'info') {
    const timestamp = new Date().toISOString();
    const colorCode = {
      info: '\x1b[36m',          error: '\x1b[31m',         warning: '\x1b[33m',       success: '\x1b[32m'      }[level];

    const logMessage = `${colorCode}[${timestamp}] ${message}\x1b[0m`;
    if (this.terminal) {
      this.terminal.writeln(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getStatus() {
    return {
      running: this.running,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
      requestCount: this.stats.requestCount,
      pendingRequests: this.stats.pendingRequests.size,
      queuedRequests: this.stats.requestQueue.length,
      requestsLastMinute: this.stats.requestWindow.length,
      queueCapacity: {
        used: this.stats.requestQueue.length,
        total: this.MAX_QUEUE_SIZE,
        percentage: Math.round((this.stats.requestQueue.length / this.MAX_QUEUE_SIZE) * 100)
      },
      rateLimits: {
        current: this.stats.requestWindow.length,
        limit: this.RATE_LIMIT,
        remaining: Math.max(0, this.RATE_LIMIT - this.stats.requestWindow.length),
        resetsIn: this.getTimeUntilRateLimit()
      }
    };
  }

  private getTimeUntilRateLimit(): number {
    if (this.stats.requestWindow.length === 0) return 0;
    const oldestRequest = Math.min(...this.stats.requestWindow);
    return Math.max(0, this.REQUEST_WINDOW - (Date.now() - oldestRequest));
  }

  private cleanRequestWindow() {
    const now = Date.now();
    this.stats.requestWindow = this.stats.requestWindow.filter(
      timestamp => now - timestamp < this.REQUEST_WINDOW
    );
  }

  private monitorQueueHealth() {
    const now = Date.now();
    
        for (const [requestId, timestamp] of this.stats.pendingRequests.entries()) {
      if (now - timestamp > this.REQUEST_TIMEOUT) {
        this.log(`Request ${requestId} timed out and will be removed`, 'warning');
        this.stats.pendingRequests.delete(requestId);
      }
    }

        if (this.stats.requestQueue.length > this.MAX_QUEUE_SIZE * 0.8) {
      this.log(`Queue is nearing capacity (${this.stats.requestQueue.length}/${this.MAX_QUEUE_SIZE})`, 'warning');
    }

        if (this.stats.pendingRequests.size > 0) {
      this.log(`Current pending requests: ${this.stats.pendingRequests.size}`, 'info');
    }
  }

  private async processQueue() {
    if (this.stats.requestQueue.length === 0) return;

        if (this.stats.requestWindow.length >= this.RATE_LIMIT) {
      this.log('Rate limit reached, waiting...', 'warning');
      return;
    }

    const request = this.stats.requestQueue.shift();
    if (!request) return;

    try {
      this.stats.pendingRequests.set(request.id, true);
      await request.execute();
    } catch (error) {
      const shouldRetry = 
        !this.ERROR_CODES_NO_RETRY.has(error.status) &&
        (!request.retries || request.retries < this.MAX_RETRIES);

      if (shouldRetry) {
        request.retries = (request.retries || 0) + 1;
        this.log(`Retrying request ${request.id} (attempt ${request.retries}/${this.MAX_RETRIES})`, 'warning');
        this.stats.requestQueue.push(request);
        await this.delay(this.RETRY_DELAY * request.retries);
      }
    } finally {
      this.stats.pendingRequests.delete(request.id);
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    }

        setTimeout(() => this.processQueue(), 100);
  }

  private async waitForPendingRequests(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkPending = () => {
        if (this.stats.pendingRequests.size === 0) {
          resolve();
        } else {
          setTimeout(checkPending, 100);
        }
      };
      checkPending();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetStats() {
    this.stats = {
      requestCount: 0,
      requestWindow: [],
      pendingRequests: new Map(),
      requestQueue: [],
      startTime: this.running ? Date.now() : 0
    };
  }

  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Proxy server is already running');
    }

    try {
      this.log('Starting virtual proxy server...', 'info');
      this.running = true;
      this.stats.startTime = Date.now();
      this.resetStats();
      this.emit('started');
      this.log('Virtual proxy server started successfully', 'success');
    } catch (error) {
      this.running = false;
      this.log(`Failed to start proxy server: ${error.message}`, 'error');
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      this.log('Stopping virtual proxy server...', 'info');
      
            this.stats.requestQueue.forEach(request => {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
      });

            if (this.stats.pendingRequests.size > 0) {
        this.log(`Waiting for ${this.stats.pendingRequests.size} pending requests to complete...`, 'warning');
        await Promise.race([
          this.waitForPendingRequests(),
          this.delay(5000)         ]);
      }

      this.running = false;
      this.resetStats();
      this.emit('stopped');
      this.log('Virtual proxy server stopped successfully', 'success');
    } catch (error) {
      this.log(`Error stopping proxy server: ${error.message}`, 'error');
      throw error;
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async handleRequest(
    message: string,
    model: string,
    providerType: ProviderType,
    signal?: AbortSignal
  ): Promise<any> {
    if (!this.running) {
      throw new APIError('Proxy server is not running');
    }

        if (this.stats.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      throw new APIError(
        `Request queue is full (${this.MAX_QUEUE_SIZE} requests). Please try again later.`,
        503
      );
    }

    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: requestId,
        timestamp: Date.now(),
        execute: async () => {
          try {
            if (signal?.aborted) {
              throw new APIError('Request cancelled');
            }

            this.stats.requestCount++;
            this.stats.requestWindow.push(Date.now());

                        const client = createApiClient(providerType);
            const result = await client.sendMessage(message, model);

            this.log(`Request ${requestId} completed successfully`, 'success');
            resolve(result);
          } catch (error) {
            this.log(`Request ${requestId} failed: ${error.message}`, 'error');
            reject(error);
          }
        }
      };

            request.timeoutId = setTimeout(() => {
        const index = this.stats.requestQueue.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.stats.requestQueue.splice(index, 1);
          reject(new APIError('Request timed out', 408));
        }
      }, this.REQUEST_TIMEOUT);

      this.stats.requestQueue.push(request);
      this.log(`Request ${requestId} queued (${this.stats.requestQueue.length} in queue)`, 'info');
      this.processQueue().catch(error => {
        this.log(`Error processing queue: ${error.message}`, 'error');
        reject(error);
      });
    });
  }
}

export const virtualProxyServer = new VirtualProxyServer();
```

src/main.tsx
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './lib/router.tsx'
import './index.css'

const initialize = async () => {
  try {
        const element = document.getElementById('root')
    if (!element) {
      throw new Error('Root element not found')
    }

        createRoot(element).render(
      <StrictMode>
        <RouterProvider 
          router={router}
          hydrationData={{}}         />
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
        document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(to bottom right,
      ">
        <div>
          <h1 style="color:
            Failed to Load Application
          </h1>
          <p style="color:
            ${error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onclick="window.location.reload()"
            style="
              background:
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              border: none;
              cursor: pointer;
            "
          >
            Retry
          </button>
        </div>
      </div>
    `
  }
}

initialize()
```

src/vite-env.d.ts
```ts

```

Assistant:
Based on the code provided, here are some suggested enhancements to improve the application:

```tsx
// 1. Optimize imports and bundle size
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ // Analyze bundle size
      open: true,
      filename: 'dist/stats.html',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'markdown': ['markdown-it'],
          'terminal': ['@xterm/xterm', '@xterm/addon-fit'],
        },
      },
    },
  },
});

// 2. Add suspense boundaries and error handling
// src/App.tsx
import { Suspense } from 'react';

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

// 3. Add request caching and deduplication
// src/lib/api/base.ts
const cache = new Map();
const pendingRequests = new Map();

protected async makeRequest(url: string, data: any) {
  const cacheKey = JSON.stringify({ url, data });
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const promise = super.makeRequest(url, data)
    .then(response => {
      cache.set(cacheKey, response);
      pendingRequests.delete(cacheKey);
      return response;
    });

  pendingRequests.set(cacheKey, promise);
  return promise;
}

// 4. Add WebSocket real-time updates
// src/lib/virtualProxy/WebSocketClient.ts
export class WebSocketClient {
  private ws: WebSocket | null = null;
  
  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = this.handleMessage;
  }

  private handleMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    // Handle different message types
  };
}

// 5. Add PWA support
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MultiMind Chat',
        short_name: 'MultiMind',
        theme_color: '#4f46e5',
        icons: [
          // Add icons
        ],
      },
    }),
  ],
});

// 6. Add performance monitoring
// src/lib/monitoring.ts
export const monitor = {
  trackTiming(label: string, duration: number) {
    // Send to analytics
  },
  
  trackError(error: Error) {
    // Log error
  }
};
```

These enhancements improve:

1. Bundle optimization with code splitting
2. Error handling and loading states 
3. Request caching and deduplication
4. Real-time capabilities with WebSockets
5. Progressive Web App features
6. Performance monitoring

Let me know if you would like me to provide more details about any of these enhancements.