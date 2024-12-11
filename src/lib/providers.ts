import { Provider, ProviderType, Model } from './types';

// Provider configurations
export const providers: Record<ProviderType, Provider> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    description: 'GPT-3.5, GPT-4, and DALL·E models',
    requiresKey: true,
    capabilities: ['chat', 'code', 'analysis']
  },
  anthropic: {
    type: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models with long context support',
    requiresKey: true,
    capabilities: ['chat', 'code', 'analysis']
  },
  google: {
    type: 'google',
    name: 'Google AI',
    description: 'Gemini series models including Pro 1.5',
    requiresKey: true,
    capabilities: ['chat', 'code', 'analysis', 'vision']
  },
  cloudflare: {
    type: 'cloudflare',
    name: 'Cloudflare',
    description: 'Workers AI models',
    requiresKey: false,
    capabilities: ['chat']
  },
  openrouter: {
    type: 'openrouter',
    name: 'OpenRouter',
    description: 'Access to multiple model providers',
    requiresKey: true,
    capabilities: ['chat', 'code']
  }
};

// Check if a provider type is valid
export const isValidProvider = (type: string): type is ProviderType => {
  return type in providers;
};

// Get provider information by type
export const getProvider = (providerType: ProviderType): Provider => {
  if (!isValidProvider(providerType)) {
    throw new Error(`Invalid provider type: ${providerType}`);
  }
  return providers[providerType];
};

// Get static models synchronously
export const getProviderModels = async (provider: ProviderType): Promise<Model[]> => {
  // Validate provider
  if (!provider || !isValidProvider(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  // Get the static models for the provider
  const models = await getProviderStaticModels(provider);

  // Only add automatic model option for OpenRouter
  if (provider === 'openrouter') {
    const autoModel: Model = {
      id: 'auto',
      name: 'Auto (Best Available)',
      provider,
      capabilities: ['chat', 'code', 'analysis'],
      context_length: 200000,
      isAuto: true,
      description: 'Automatically selects the best available model'
    };
    return [autoModel, ...models];
  }

  return models;
};

// Get static models for each provider
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

// Select the best model automatically based on the provider
export const selectBestModel = (provider: ProviderType, models: Model[]): string => {
  // Only consider 'auto' for OpenRouter
  if (provider === 'openrouter') {
    const autoModel = models.find(m => m.isAuto);
    if (autoModel) return autoModel.id;
  }

  // Remove the auto model from consideration
  const availableModels = models.filter(m => !m.isAuto);
  
  switch (provider) {
    case 'openai':
      // Prefer GPT-4 Turbo, fallback to GPT-3.5 Turbo
      return availableModels.find(m => m.id === 'gpt-4-turbo-preview')?.id ||
             availableModels.find(m => m.id === 'gpt-3.5-turbo')?.id ||
             availableModels[0]?.id;
             
    case 'anthropic':
      // Prefer Claude 3 Opus, fallback to Sonnet or earlier versions
      return availableModels.find(m => m.id === 'claude-3-opus')?.id ||
             availableModels.find(m => m.id === 'claude-3-sonnet')?.id ||
             availableModels.find(m => m.id.includes('claude-2'))?.id ||
             availableModels[0]?.id;

    case 'google':
      // Default to Gemini 1.5 Pro for best performance
      return availableModels.find(m => m.id === 'gemini-1.5-pro')?.id ||
             availableModels.find(m => m.id === 'gemini-1.0-pro')?.id ||
             availableModels[0]?.id;

    case 'cloudflare':
      // Prefer largest Llama model
      return availableModels.find(m => m.id.includes('llama-2-13b'))?.id ||
             availableModels.find(m => m.id.includes('mistral'))?.id ||
             availableModels[0]?.id;

    case 'openrouter':
      // Prefer GPT-4 Turbo or Claude 3
      return availableModels.find(m => m.id === 'openai/gpt-4-turbo-preview')?.id ||
             availableModels.find(m => m.id === 'anthropic/claude-3-opus')?.id ||
             availableModels.find(m => m.id === 'google/gemini-pro')?.id ||
             availableModels[0]?.id;

    default:
      return availableModels[0]?.id;
  }
};

// Get the default model for a provider (used for new chats)
export const getDefaultModel = (type: ProviderType): string => {
  // Only return auto for OpenRouter
  if (type === 'openrouter') {
    return 'auto';
  }

  // For other providers, select a specific default model
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

// Format model name for display
export const getModelDisplay = (providerType: ProviderType, modelId: string): string => {
  // Handle auto model only for OpenRouter
  if (modelId === 'auto') {
    if (providerType === 'openrouter') {
      return 'Auto (Best Available)';
    }
    return modelId; // Shouldn't happen, but handle gracefully
  }

  // Start with the raw modelId
  let displayName = modelId;

  // Handle OpenRouter format (provider/model)
  if (modelId.includes('/')) {
    const [provider, model] = modelId.split('/');
    displayName = model;
  }

  // Clean up common prefixes
  displayName = displayName
    .replace(/^@cf\//, '')
    .replace(/^@hf\//, '')
    .replace(/^meta\//, '')
    .replace(/^mistral\//, '');

  // Format remaining string
  return displayName
    .split(/[-_]/)
    .map(word => {
      // Special case for size indicators
      if (word.match(/^\d+[bB]$/)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/([0-9]+[A-Z])/g, ' $1') // Add space before numbers followed by uppercase
    .replace(/([A-Z][a-z])/g, ' $1')  // Add space before capital letters
    .trim();
};
