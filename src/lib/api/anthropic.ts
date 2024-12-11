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