import { BaseApiClient } from './base';

export class LiteLLMClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    return {
      messages: [{
        role: 'user',
        content: message,
      }],
      model,
      provider: 'litellm'
    };
  }
}