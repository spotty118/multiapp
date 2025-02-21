import { BaseApiClient } from './base';
import { APIError, Model } from '../types';
import { getGatewayUrls, getApiKeys } from '../store';
import { debug } from '../debug';

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

// Unused interface removed

export class OpenRouterClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    const apiKey = getApiKeys().openrouter;
    if (!apiKey) {
      throw new APIError('OpenRouter API key is required', 401);
    }

    const baseURL = getGatewayUrls().openrouter || 'https://openrouter.ai/api/v1';

    return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model: model === 'auto' ? 'mistralai/mixtral-8x7b-instruct' : model, // Default to Mixtral for auto
      max_tokens: 2048,
      temperature: 0.7,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MultiMind Chat',
        'Content-Type': 'application/json'
      },
      baseURL
    };
  }

  public async fetchModels(): Promise<Model[]> {
    debug.log('Fetching OpenRouter models...', 'info');
    
    const apiKey = getApiKeys().openrouter;
    if (!apiKey) {
      const error = new APIError('OpenRouter API key is required', 401);
      debug.logError('openrouter', error);
      throw error;
    }

    const baseURL = getGatewayUrls().openrouter || 'https://openrouter.ai/api/v1';
    const url = `${baseURL}/models`;

    debug.log(`OpenRouter models endpoint: ${url}`, 'info');

    try {
      const requestOptions = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MultiMind Chat'
        }
      };

      debug.logRequest('openrouter', url, requestOptions);

      const response = await fetch(url, requestOptions);
      const data = await response.json();

      debug.logResponse('openrouter', response.status, data);

      if (!response.ok) {
        const error = new APIError(
          data?.error?.message || `Failed to fetch models with status ${response.status}`,
          response.status,
          'openrouter_api_error'
        );
        debug.logError('openrouter', error);
        throw error;
      }

      const models = this.parseModelsResponse(data);
      debug.log(`Successfully fetched ${models.length} OpenRouter models`, 'info');
      return models;
    } catch (error) {
      debug.logError('openrouter', error);
      throw new APIError(
        `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }

  // ... rest of the OpenRouterClient implementation remains the same ...

  protected parseModelsResponse(response: OpenRouterModelsResponse): Model[] {
    debug.log('Parsing OpenRouter models response', 'info');
    
    if (!response?.data) {
      const error = new APIError('Invalid models response from OpenRouter');
      debug.logError('openrouter', error);
      throw error;
    }

    // Add the auto model option (defaults to Mixtral)
    const models: Model[] = [{
      id: 'auto',
      name: 'Auto (Mixtral 8x7B)',
      provider: 'openrouter',
      capabilities: ['chat', 'code', 'analysis'],
      isAuto: true,
      description: 'Automatically selects Mixtral 8x7B for optimal performance'
    }];

    debug.log(`Processing ${response.data.length} models from OpenRouter`, 'info');

    // Filter and process models from the response
    const processedModels = response.data
      .filter(model => {
        const shouldInclude = this.shouldIncludeModel(model);
        if (!shouldInclude) {
          debug.log(`Excluding model: ${model.id}`, 'info');
        }
        return shouldInclude;
      })
      .map(model => {
        const processedModel = {
          id: model.id,
          name: model.name,
          provider: 'openrouter',
          capabilities: ['chat', 'code'],
          context_length: model.context_length || 4096,
          description: model.description || `${model.name} model available through OpenRouter`
        };
        debug.log(`Processed model: ${processedModel.id}`, 'info');
        return processedModel;
      });

    const sortedModels = processedModels as Model[];
    debug.log(`Returning ${sortedModels.length + 1} models (including auto)`, 'info');

    return [...models, ...sortedModels];
  }

  private shouldIncludeModel(model: OpenRouterModel): boolean {
    const id = model.id.toLowerCase();
    const name = model.name.toLowerCase();
    const desc = (model.description || '').toLowerCase();

    const excludePatterns = [
      'broken',
      'debug',
      'test-',
      'deprecated',
    ];

    const isExcluded = excludePatterns.some(pattern => 
      id.includes(pattern) || 
      name.includes(pattern) || 
      desc.includes(pattern)
    );

    if (isExcluded) {
      debug.log(`Model ${model.id} excluded due to pattern match`, 'info');
    }

    return !isExcluded;
  }

  // Unused method removed

  // ... rest of the methods remain the same ...
}