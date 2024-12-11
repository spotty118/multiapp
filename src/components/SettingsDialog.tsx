import { useState, useEffect } from 'react';
import { Settings, X, AlertCircle, CheckCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Provider } from '../types';
import { saveApiKeys, getApiKeys, saveGatewayUrls, getGatewayUrls } from '../lib/store';
import { validateApiKey } from '../lib/validation';

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState(getApiKeys());
  const [gatewayUrls, setGatewayUrls] = useState(getGatewayUrls());
  const [keyValidation, setKeyValidation] = useState<Record<Provider, { isValid: boolean; message?: string }>>({});

  // Clear validation on dialog close
  useEffect(() => {
    if (!isOpen) {
      setKeyValidation({});
    }
  }, [isOpen]);

  const handleApiKeyChange = (provider: Provider, value: string) => {
    const trimmedValue = value.trim();
    const validation = validateApiKey(provider, trimmedValue);
    
    setKeyValidation(prev => ({
      ...prev,
      [provider]: validation
    }));

    const newKeys = { ...apiKeys, [provider]: trimmedValue };
    setApiKeys(newKeys);
    saveApiKeys(newKeys);
  };

  const handleGatewayUrlChange = (provider: Provider, value: string) => {
    const newUrls = { ...gatewayUrls, [provider]: value.trim() };
    setGatewayUrls(newUrls);
    saveGatewayUrls(newUrls);
  };

  const renderKeyValidation = (provider: Provider) => {
    const validation = keyValidation[provider];
    if (!validation) return null;

    return (
      <div className={`flex items-center gap-1 mt-1 text-xs ${
        validation.isValid ? 'text-green-600' : 'text-red-600'
      }`}>
        {validation.isValid ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span>{validation.message}</span>
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-lg">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-zinc-500 mt-1">
              Configure your API keys and gateway URLs for each provider. Your keys are stored locally and never sent to our servers.
            </Dialog.Description>
          </div>

          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-sm font-medium text-zinc-900 mb-4">API Keys</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries({
                  openai: 'OpenAI',
                  anthropic: 'Anthropic',
                  google: 'Google AI',
                  openrouter: 'OpenRouter'
                }).map(([provider, label]) => (
                  <form key={provider} className="space-y-2" onSubmit={(e) => e.preventDefault()}>
                    <label htmlFor={`${provider}-key`} className="block text-sm font-medium text-zinc-700">
                      {label} API Key
                    </label>
                    <input
                      id={`${provider}-key`}
                      type="password"
                      autoComplete="off"
                      value={apiKeys[provider as Provider] || ''}
                      onChange={(e) => handleApiKeyChange(provider as Provider, e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                        keyValidation[provider as Provider]?.isValid === false
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-zinc-200 focus:ring-indigo-500'
                      }`}
                      placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                      spellCheck="false"
                    />
                    {renderKeyValidation(provider as Provider)}
                    {provider === 'openrouter' && (
                      <p className="text-xs text-zinc-500">
                        Get your API key from{' '}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          OpenRouter
                        </a>
                      </p>
                    )}
                  </form>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-900 mb-4">Gateway URLs (Optional)</h3>
              <div className="grid grid-cols-1 gap-6">
                {Object.entries({
                  openai: ['OpenAI API URL', 'https://api.openai.com/v1'],
                  anthropic: ['Anthropic API URL', 'https://api.anthropic.com'],
                  google: ['Google AI API URL', 'https://generativelanguage.googleapis.com'],
                  openrouter: ['OpenRouter API URL', 'https://openrouter.ai/api/v1']
                }).map(([provider, [label, placeholder]]) => (
                  <form key={provider} className="space-y-2" onSubmit={(e) => e.preventDefault()}>
                    <label htmlFor={`${provider}-url`} className="block text-sm font-medium text-zinc-700">
                      {label}
                    </label>
                    <input
                      id={`${provider}-url`}
                      type="text"
                      value={gatewayUrls[provider as Provider] || ''}
                      onChange={(e) => handleGatewayUrlChange(provider as Provider, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={placeholder}
                      spellCheck="false"
                    />
                  </form>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}