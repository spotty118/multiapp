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

    const gatewayUrl = getGatewayUrls().openai || 'https://api.openai.com/v1';
    console.log('Using Gateway URL:', gatewayUrl); // Log the gateway URL for debugging
    const endpoint = `${gatewayUrl}/chat/completions`;

    try {
      console.log('Making request to:', endpoint);
      console.log('Request data:', data);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

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
        ],
        context_length: model.id.includes('gpt-4') ? 8192 : 4096 // Default context lengths
      }));
  }

  public async fetchModels(): Promise<Model[]> {
    const apiKey = getApiKeys().openai;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const gatewayUrl = getGatewayUrls().openai || 'https://api.openai.com/v1';
    const endpoint = `${gatewayUrl}/models`;

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
