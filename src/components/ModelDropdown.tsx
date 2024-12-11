import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2, Code, CheckCircle2, Brain, Eye, Wand2 } from 'lucide-react';
import { Model, Provider, ProviderType, ModelCapability } from '../lib/types';
import { getProviderModels, selectBestModel } from '../lib/providers';

interface ModelDropdownProps {
  provider: ProviderType;
  model: string;
  onModelChange: (model: string) => void;
}

export const ModelDropdown = ({ provider, model, onModelChange }: ModelDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectedModel, setAutoSelectedModel] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousProvider = useRef<ProviderType>(provider);

  // Load models whenever provider changes
  useEffect(() => {
    if (provider !== previousProvider.current) {
      // Reset state when provider changes
      setModels([]);
      setError(null);
      setAutoSelectedModel(null);

      // Immediately select a valid model for OpenAI
      if (provider === 'openai') {
        const defaultModel = 'gpt-3.5-turbo'; // Example default model for OpenAI
        onModelChange(defaultModel);
      } else {
        // Auto-select the default "auto" model for other providers
        onModelChange('auto');
      }

      previousProvider.current = provider;
    }

    setLoading(true);

    const loadModels = async () => {
      try {
        // Ensure provider is valid
        if (!provider) {
          throw new Error('Provider is required');
        }

        const providerModels = await getProviderModels(provider);
        setModels(providerModels);
        
        // If auto is selected, get the best model
        if (model === 'auto' && provider !== 'openai') {
          const bestModel = selectBestModel(provider, providerModels);
          setAutoSelectedModel(bestModel);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [provider, model, onModelChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCapabilityIcon = (capability: ModelCapability) => {
    switch (capability) {
      case 'code':
        return <Code className="w-3 h-3 text-indigo-500" />;
      case 'analysis':
        return <Brain className="w-3 h-3 text-purple-500" />;
      case 'vision':
        return <Eye className="w-3 h-3 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    }
  };

  // Get current model display info
  const currentModel = models.find(m => m.id === (model === 'auto' ? 'auto' : model)) || {
    id: model,
    name: model === 'auto' ? 'Auto (Best Available)' : model.split('/').pop() || model,
    provider: provider,
    isAuto: model === 'auto'
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm bg-white 
          hover:bg-zinc-50 border border-zinc-200 rounded-lg 
          transition-all duration-200 ease-in-out
          ${loading ? 'opacity-75 cursor-wait' : ''}
        `}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        ) : currentModel.isAuto ? (
          <Wand2 className="w-4 h-4 text-indigo-500" />
        ) : (
          <Sparkles className="w-4 h-4 text-indigo-500" />
        )}
        <span className="text-zinc-700">
          {loading ? 'Loading models...' : currentModel.name}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-[350px] bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden transform opacity-0 scale-95 animate-in"
          style={{
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div className="max-h-[450px] overflow-y-auto scrollbar-thin divide-y divide-zinc-100">
            {loading && (
              <div className="p-4 text-center text-sm text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading available models...
              </div>
            )}

            {error && (
              <div className="p-4 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoading(true);
                    setError(null);
                    getProviderModels(provider)
                      .then(models => {
                        setModels(models);
                        setError(null);
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load models'))
                      .finally(() => setLoading(false));
                  }}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && models.length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">
                No models available for this provider
              </div>
            )}

            {!loading && !error && models.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onModelChange(m.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex flex-col gap-1 p-3 text-left text-sm transition-colors
                  hover:bg-zinc-50
                  ${m.id === model ? 'bg-indigo-50/70' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.isAuto ? (
                      <Wand2 className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-medium text-zinc-900">{m.name}</span>
                  </div>
                  {m.id === model && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                {m.capabilities && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {m.capabilities.map((capability) => (
                      <div 
                        key={capability}
                        className="flex items-center gap-1"
                        title={capability.charAt(0).toUpperCase() + capability.slice(1)}
                      >
                        {getCapabilityIcon(capability)}
                      </div>
                    ))}
                  </div>
                )}
                {m.context_length && (
                  <div className="text-xs text-zinc-500">
                    Context: {m.context_length.toLocaleString()} tokens
                  </div>
                )}
                {m.description && (
                  <div className="text-xs text-zinc-500">
                    {m.description}
                  </div>
                )}
                {m.isAuto && autoSelectedModel && (
                  <div className="text-xs text-indigo-600 mt-1">
                    Currently using: {models.find(m => m.id === autoSelectedModel)?.name || autoSelectedModel}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
