import * as Select from '@radix-ui/react-select';
import { Check, Loader2 } from 'lucide-react';
import { Model } from '../lib/types';

interface ModelSelectProps {
  models: Model[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const ModelSelect = ({ models, value, onChange, disabled, isLoading }: ModelSelectProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-2 bg-gray-50 rounded border">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading models...</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded border">
        No models available. Please check your API key or connection.
      </div>
    );
  }

  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger className="w-full inline-flex items-center justify-between rounded px-4 py-2 text-sm gap-2 bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <Select.Value />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
          <Select.Viewport className="p-1">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none"
              >
                <Select.ItemText>{model.name}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="w-4 h-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};