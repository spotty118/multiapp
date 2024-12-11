import { CheckSquare, Square } from 'lucide-react';
import { ProviderType } from '../lib/types';
import { providers } from '../lib/providers';
import { getProviderIcon } from './ProviderIcons';

interface ProviderListProps {
  value: ProviderType;
  onChange: (provider: ProviderType) => void;
  disabled?: boolean;
}

export const ProviderList = ({ value, onChange, disabled }: ProviderListProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-900 mb-3">AI Provider</h3>
      <div className="space-y-2">
        {Object.values(providers).map((provider) => {
          const isSelected = value === provider.type;
          const Icon = getProviderIcon(provider.type);
          
          return (
            <button
              key={provider.type}
              onClick={() => !disabled && onChange(provider.type)}
              disabled={disabled}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                ${isSelected
                  ? 'bg-gradient-to-r from-zinc-50 to-zinc-100/80 shadow-sm'
                  : 'hover:bg-zinc-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`p-2 rounded-lg bg-white shadow-sm ${
                isSelected ? 'ring-1 ring-zinc-200' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    isSelected ? 'text-zinc-900' : 'text-zinc-700'
                  }`}>
                    {provider.name}
                  </span>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <p className="text-sm text-zinc-500">{provider.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}