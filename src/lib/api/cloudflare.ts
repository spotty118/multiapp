import { BaseApiClient } from './base';
// Removed unused import

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