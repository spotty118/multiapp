import { BaseApiClient } from './base';
import { Model } from '../types';

export class CloudflareClient extends BaseApiClient {
  // ... other methods remain the same ...

  protected parseModelsResponse(response: CloudflareModelsResponse): Model[] {
    return response.data.map(model => {
      if (model.id.startsWith('gemini-')) {
        return {
          id: 'gemini-pro',  // Only support gemini-pro
          name: 'Gemini Pro',
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
        // Default case
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