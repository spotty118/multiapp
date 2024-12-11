import { BaseApiClient } from './base';
import { Model, APIError } from '../types';

interface GoogleChatRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GoogleChatResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GoogleClient extends BaseApiClient {
  protected formatRequest(message: string, model: string) {
    // If model is 'auto', use the default Gemini Pro model
    const actualModel = model === 'auto' ? 'gemini-1.0-pro' : model;
    
    // Format request according to Google's API specifications
    const request: GoogleChatRequest = {
      contents: [{
        role: 'user',
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    return {
      ...request,
      model: this.normalizeModelName(actualModel),
      provider: 'google',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta'
    };
  }

  private normalizeModelName(model: string): string {
    // Remove any potential "models/" prefix to avoid double prefixing
    const cleanModel = model.replace(/^models\//, '');
    // Always ensure the model name has the "models/" prefix
    return cleanModel.includes('/') ? cleanModel : `models/${cleanModel}`;
  }

  protected override parseModelsResponse(response: any): Model[] {
    if (!response?.models) {
      throw new APIError('Invalid response from Google API');
    }

    return response.models
      .filter((model: any) => 
        model.name.includes('gemini') &&
        model.supported_generation_methods?.includes('generateContent')
      )
      .map((model: any) => {
        const modelId = model.name.split('/').pop() || model.name;
        const isVision = modelId.toLowerCase().includes('vision');
        
        return {
          id: modelId,
          name: model.display_name || this.formatModelName(modelId),
          provider: 'google',
          capabilities: [
            'chat',
            ...(isVision ? ['vision'] as const : []),
            'code',
            ...(modelId.includes('pro') ? ['analysis'] as const : [])
          ],
          context_length: model.input_token_limit || 32000
        };
      });
  }

  protected override isValidResponse(response: GoogleChatResponse): boolean {
    if (response.error) {
      throw new APIError(
        response.error.message,
        response.error.code,
        'google_api_error',
        response.error.status
      );
    }

    return !!(
      response.candidates?.[0]?.content?.parts?.[0]?.text
    );
  }

  protected override extractResponseContent(response: GoogleChatResponse): string {
    if (!this.isValidResponse(response)) {
      throw new APIError(
        'Invalid response format from Google API',
        500,
        'invalid_response'
      );
    }

    // Get the text from the first candidate's first part
    const text = response.candidates![0].content.parts[0].text;
    return text.trim();
  }

  private formatModelName(modelId: string): string {
    return modelId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  public async makeRequest(url: string, data: any): Promise<any> {
    try {
      const apiKey = this.apiKeys.google;
      if (!apiKey) {
        throw new APIError('Google API key is required', 401);
      }

      // Construct the endpoint URL correctly
      const modelName = data.model;
      const fullUrl = `${data.baseURL}/${modelName}:generateContent`;
      
      // Remove provider-specific fields from the request body
      const { model, provider, baseURL, ...requestBody } = data;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || 
          `Request failed with status ${response.status}`;
        const errorCode = errorData?.error?.code || response.status;

        throw new APIError(
          errorMessage,
          response.status,
          'google_api_error',
          errorCode
        );
      }

      const responseData = await response.json();

      // Transform response to match our expected format
      return {
        candidates: responseData.candidates || [],
        promptFeedback: responseData.promptFeedback || {},
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error.message || 'Failed to make request to Google API',
        500,
        'google_api_error'
      );
    }
  }
}
