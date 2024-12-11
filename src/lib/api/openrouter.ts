import { BaseApiClient } from './base';
import { APIError, Model, Provider } from '../types';
import { getApiKeys } from '../store';

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
      model: 'gpt-3.5-turbo',
      headers: {
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

    const url = 'https://openrouter.ai/api/v1/models';

    try {
      const response = await fetch(url, {
        method: 'GET',
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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.openrouter}`,
          'HTTP-Referer': headers['HTTP-Referer'] || window.location.origin,
          'X-Title': headers['X-Title'] || 'MultiMind Chat'
        },
        body: JSON.stringify({
          ...requestData,
          route: "fallback" // Add fallback routing strategy
        })
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
    
    // Add code capability for models that support it
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

    // Add analysis capability for more capable models
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
    // Get provider name and model ID
    const [provider] = model.id.split('/');
    const providerDisplay = this.formatProviderName(provider);
    
    // Format pricing if available
    let priceInfo = '';
    if (model.pricing) {
      const prompt = parseFloat(model.pricing.prompt);
      const completion = parseFloat(model.pricing.completion);
      if (!isNaN(prompt) && !isNaN(completion)) {
        // Check if both prices are 0
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

    // Add the auto model option first
    const models: Model[] = [{
      id: 'auto',
      name: 'Auto (Best Available)',
      provider: 'openrouter' as Provider,
      capabilities: ['chat', 'code', 'analysis'],
      context_length: 200000, // Set to maximum available context length
      isAuto: true,
      description: 'Automatically selects the best available model'
    }];

    // Add all models from the response
    const apiModels = response.data.map(model => ({
      id: model.id,
      name: this.formatModelName(model),
      provider: 'openrouter' as Provider,
      capabilities: this.getModelCapabilities(model),
      context_length: model.context_length || this.estimateContextLength(model),
      description: model.description
    })) as Model[];

    // Sort models by provider and name
    const sortedModels = apiModels.sort((a, b) => {
      const [providerA] = a.id.split('/');
      const [providerB] = b.id.split('/');
      return providerA.localeCompare(providerB) || a.name.localeCompare(b.name);
    });

    // Return auto model followed by all other models
    return [...models, ...sortedModels];
  }

  private estimateContextLength(model: OpenRouterModel): number {
    const id = model.id.toLowerCase();

    // Known context lengths
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

    // Estimate based on model description
    const desc = (model.description || '').toLowerCase();
    if (desc.includes('32k') || desc.includes('32000')) return 32768;
    if (desc.includes('16k') || desc.includes('16000')) return 16384;
    if (desc.includes('8k') || desc.includes('8000')) return 8192;

    // Estimate based on model size
    if (id.includes('-70b') || id.includes('-65b')) return 8192;
    if (id.includes('-34b') || id.includes('-35b')) return 4096;
    if (id.includes('-13b') || id.includes('-14b')) return 4096;
    if (id.includes('-7b') || id.includes('-8b')) return 4096;

    // Default conservative estimate
    return 4096;
  }
}
