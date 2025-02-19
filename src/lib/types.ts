export type ProviderType = 'openai' | 'anthropic' | 'google' | 'cloudflare' | 'openrouter';

export interface Provider {
  type: ProviderType;
  name: string;
  description: string;
  requiresKey: boolean;
  supportsProxy: boolean;
  capabilities: ModelCapability[];
}

export type ModelCapability = 'chat' | 'code' | 'analysis' | 'vision';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider: ProviderType;
  model: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  provider: ProviderType;
  model: string;
}

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  openrouter?: string;
}

export interface GatewayURLs {
  openai?: string;
  anthropic?: string;
  google?: string;
  openrouter?: string;
}

export interface Model {
  id: string;
  name: string;
  provider: ProviderType;
  capabilities?: ModelCapability[];
  context_length?: number;
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
    
    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, APIError.prototype);
    
    // Capture stack trace
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