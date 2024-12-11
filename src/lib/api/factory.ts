import { ProviderType } from '../types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';
import { GoogleClient } from './google';
import { CloudflareClient } from './cloudflare';
import { OpenRouterClient } from './openrouter';

const clientInstances: Map<ProviderType, InstanceType<any>> = new Map();

export function createApiClient(providerType: ProviderType) {
  // Return cached instance if available
  const existingClient = clientInstances.get(providerType);
  if (existingClient) {
    return existingClient;
  }

  // Create new instance
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

  // Cache the instance
  clientInstances.set(providerType, client);
  return client;
}

export function clearApiClientCache() {
  clientInstances.clear();
}