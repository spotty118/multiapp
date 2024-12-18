import { ProviderType, APIError, Model, ApiKeys } from '../types';
import { getApiKeys } from '../store';
import { validateApiKey } from '../validation';
import { getProvider, isValidProvider } from '../providers';

const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const SERVER_ERROR_MESSAGES: Record<number, string> = {
  500: 'The server encountered an error. This could be temporary - please try again.',
  502: 'The server is temporarily unavailable. Please try again in a few moments.',
  503: 'The service is currently unavailable. Please try again later.',
  504: 'The server took too long to respond. Please try again.',
};

export abstract class BaseApiClient {
  protected readonly providerType: ProviderType;
  protected apiKeys: Record<ProviderType, string | undefined>;
  protected controller: AbortController | null = null;

  constructor(providerType: ProviderType) {
    if (!isValidProvider(providerType)) {
      throw new APIError(`Invalid provider type: ${providerType}`, 400);
    }
    this.providerType = providerType;
    this.apiKeys = getApiKeys();
  }

  private validateRequest(message: string, model: string) {
    if (!message?.trim()) {
      throw new APIError('Message cannot be empty', 400);
    }

    if (message.length > 32000) {
      throw new APIError('Message is too long (max 32,000 characters)', 400);
    }

    if (!model?.trim()) {
      throw new APIError('Model must be specified', 400);
    }

    // Validate API key if required
    const provider = getProvider(this.providerType);
    if (provider.requiresKey) {
      const apiKey = this.apiKeys[this.providerType];
      if (!apiKey) {
        throw new APIError(`API key for provider ${this.providerType} is missing`, 401);
      }
      const validation = validateApiKey(this.providerType, apiKey);
      
      if (!validation.isValid) {
        throw new APIError(
          `Invalid API key for ${provider.name}: ${validation.message}`,
          401,
          'invalid_api_key'
        );
      }

      return { apiKey };
    }

    return {};
  }

  public stopResponse() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  // Abstract method that each provider must implement to format their requests
  protected abstract formatRequest(message: string, model: string): any;

  protected isValidResponse(data: any): boolean {
    return !!(data?.choices?.[0]?.message?.content || data?.result?.response);
  }

  protected extractResponseContent(data: any): string {
    if (!this.isValidResponse(data)) {
      throw new APIError(
        'Invalid response format from API',
        500,
        'invalid_response'
      );
    }

    return (data.choices?.[0]?.message?.content || data.result?.response).trim();
  }

  protected parseModelsResponse(response: any): Model[] {
    throw new APIError('Model fetching not implemented for this provider');
  }

  // Base request method with retries and error handling
  protected async makeRequest(url: string, data: any, retryCount = 0): Promise<any> {
    try {
      this.controller = new AbortController();
      
      const apiKey = this.apiKeys[this.providerType];
      if (!apiKey) {
        throw new APIError(`API key for provider ${this.providerType} is missing`, 401);
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(data),
        signal: this.controller.signal
      });

      if (!response.ok) {
        throw new APIError(`Request failed with status ${response.status}`, response.status);
      }

      return await response.json();
    } catch (error: unknown) {
      // Type guard to check if error is an Error object
      const isError = (err: unknown): err is Error => err instanceof Error;

      // Don't retry if request was cancelled
      if (isError(error) && error.name === 'AbortError') {
        throw new APIError('Request cancelled');
      }

      // Type-safe error handling
      const errorMessage = isError(error) ? error.message ?? 'Unknown error' : String(error);
      const isServerError = error instanceof APIError && (error as APIError)?.status >= 500;
      const shouldRetry = retryCount < MAX_RETRIES && (
        (isError(error) && (
          error.name === 'TypeError' || // Network error
          error.message?.includes('fetch') // Fetch error
        )) ||
        isServerError // Server error
      );

      if (shouldRetry) {
        console.warn(`Retrying request. Error: ${errorMessage}`);
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, data, retryCount + 1);
      }

      if (isError(error) && error.message) {
        console.error(`Error: ${error.message}`);
      }
      throw new APIError('An unexpected error occurred');
    } finally {
      this.controller = null;
    }
  }

  public async sendMessage(message: string, model: string): Promise<any> {
    // Validate the request parameters
    this.validateRequest(message, model);

    // Format the request according to the provider's requirements
    const requestData = this.formatRequest(message, model);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/chat';
      const endpoint = requestData.endpoint || '/completions';
      const response = await this.makeRequest(`${baseUrl}${endpoint}`, requestData);
      const content = this.extractResponseContent(response);

      return {
        success: true,
        result: {
          response: content,
          usage: response.usage
        }
      };
    } catch (error) {
      // Enhance error message for common issues
      if (this.isError(error)) {
        if (error.message?.includes('fetch')) {
          throw new APIError(
            'Network error. Please check your internet connection.',
            0,
            'network_error'
          );
        }
      }

      throw error;
    }
  }

  private isError(error: unknown): error is Error {
    return error instanceof Error;
  }
}