import { Provider } from './types';

interface KeyValidation {
  isValid: boolean;
  message?: string;
}

export function validateApiKey(provider: Provider, key: string): KeyValidation {
  if (!key) {
    return {
      isValid: false,
      message: 'API key is required'
    };
  }

  // Remove any whitespace
  key = key.trim();

  switch (provider) {
    case 'openai':
      if (!key.startsWith('sk-') || key.length < 40) {
        return {
          isValid: false,
          message: 'Invalid OpenAI key format (should start with sk-)'
        };
      }
      break;

    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        return {
          isValid: false,
          message: 'Invalid Anthropic key format (should start with sk-ant-)'
        };
      }
      break;

    case 'google':
      if (key.length < 20) {
        return {
          isValid: false,
          message: 'Invalid Google API key length'
        };
      }
      break;

    case 'openrouter':
      if (!key.startsWith('sk-or-')) {
        return {
          isValid: false,
          message: 'Invalid OpenRouter key format (should start with sk-or-)'
        };
      }
      break;

    default:
      return {
        isValid: false,
        message: 'Unknown provider'
      };
  }

  return {
    isValid: true,
    message: 'Valid API key'
  };
}

export function validateGatewayUrl(url: string): boolean {
  if (!url) return true; // Optional, so empty is valid

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}