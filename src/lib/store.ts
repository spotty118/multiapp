import { Chat, ApiKeys, GatewayURLs } from './types';

const CHATS_KEY = 'multimind-chats';
const API_KEYS_KEY = 'multimind-api-keys';
const GATEWAY_URLS_KEY = 'multimind-gateway-urls';
const LITELLM_PROXY_URL_KEY = 'multimind-litellm-proxy-url';

// Initialize store with error handling
const initializeStore = () => {
  try {
    // Test localStorage availability
    const testKey = '_test_' + Math.random();
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
  } catch (error) {
    console.error('LocalStorage is not available:', error);
    throw new Error('Unable to access local storage. Please enable cookies and reload the page.');
  }
};

// Initialize on import
initializeStore();

export const saveChat = (chat: Chat) => {
  try {
    const chats = getChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.unshift(chat); // Add new chats to the beginning
    }
    
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to save chat:', error);
    throw new Error('Failed to save chat. Please check your browser storage settings.');
  }
};

export const getChats = (): Chat[] => {
  try {
    const chats = localStorage.getItem(CHATS_KEY);
    return chats ? JSON.parse(chats) : [];
  } catch (error) {
    console.error('Failed to get chats:', error);
    return [];
  }
};

export const deleteChat = (chatId: string) => {
  try {
    const chats = getChats().filter(chat => chat.id !== chatId);
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to delete chat:', error);
    throw new Error('Failed to delete chat. Please try again.');
  }
};

export const deleteAllChats = () => {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to delete all chats:', error);
    throw new Error('Failed to delete all chats. Please try again.');
  }
};

export const saveApiKeys = (keys: ApiKeys) => {
  try {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Failed to save API keys:', error);
    throw new Error('Failed to save API keys. Please try again.');
  }
};

export const getApiKeys = (): ApiKeys => {
  try {
    const keys = localStorage.getItem(API_KEYS_KEY);
    return keys ? JSON.parse(keys) : {};
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return {};
  }
};

export const saveGatewayUrls = (urls: GatewayURLs) => {
  try {
    localStorage.setItem(GATEWAY_URLS_KEY, JSON.stringify(urls));
  } catch (error) {
    console.error('Failed to save gateway URLs:', error);
    throw new Error('Failed to save gateway URLs. Please try again.');
  }
};

export const getGatewayUrls = (): GatewayURLs => {
  try {
    const urls = localStorage.getItem(GATEWAY_URLS_KEY);
    return urls ? JSON.parse(urls) : {};
  } catch (error) {
    console.error('Failed to get gateway URLs:', error);
    return {};
  }
};

export const saveLiteLLMProxyUrl = (url: string) => {
  try {
    localStorage.setItem(LITELLM_PROXY_URL_KEY, url);
  } catch (error) {
    console.error('Failed to save LiteLLM proxy URL:', error);
    throw new Error('Failed to save proxy URL. Please try again.');
  }
};

export const getLiteLLMProxyUrl = (): string | null => {
  try {
    return localStorage.getItem(LITELLM_PROXY_URL_KEY);
  } catch (error) {
    console.error('Failed to get LiteLLM proxy URL:', error);
    return null;
  }
};

export const clearLiteLLMProxyUrl = () => {
  try {
    localStorage.removeItem(LITELLM_PROXY_URL_KEY);
  } catch (error) {
    console.error('Failed to clear LiteLLM proxy URL:', error);
    throw new Error('Failed to clear proxy URL. Please try again.');
  }
};