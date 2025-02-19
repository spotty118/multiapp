import { ProviderType } from '../types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';
import { GoogleClient } from './google';
import { CloudflareClient } from './cloudflare';
import { OpenRouterClient } from './openrouter';
import { debug } from '../debug';

const clientInstances: Map<ProviderType, InstanceType<any>> = new Map();

export function createApiClient(providerType: ProviderType) {
  debug.log(`Creating API client for provider: ${providerType}`, 'info');

  // Return cached instance if available
  const existingClient = clientInstances.get(providerType);
  if (existingClient) {
    debug.log(`Returning cached client for ${providerType}`, 'info');
    return existingClient;
  }

  // Create new instance
  let client;
  try {
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

    // Cache the instance
    clientInstances.set(providerType, client);
    debug.log(`Created new client for ${providerType}`, 'info');
    return client;
  } catch (error) {
    debug.logError(providerType, error);
    throw error;
  }
}

export function clearApiClientCache() {
  debug.log('Clearing API client cache', 'info');
  clientInstances.clear();
}