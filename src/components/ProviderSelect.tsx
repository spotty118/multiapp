import * as Select from '@radix-ui/react-select';
import { Provider } from '../lib/types';
import { Check } from 'lucide-react';

interface ProviderSelectProps {
  value: Provider;
  onChange: (value: Provider) => void;
  disabled?: boolean;
}

export const ProviderSelect = ({ value, onChange, disabled }: ProviderSelectProps) => {
  return (
    <Select.Root value={value} onValueChange={onChange as (value: string) => void} disabled={disabled}>
      <Select.Trigger className="w-full inline-flex items-center justify-between rounded px-4 py-2 text-sm gap-2 bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <Select.Value />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border">
          <Select.Viewport className="p-1">
            <Select.Item value="openai" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>OpenAI</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="anthropic" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Anthropic</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="google" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Google AI</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="cloudflare" className="relative flex items-center px-8 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer outline-none">
              <Select.ItemText>Cloudflare</Select.ItemText>
              <Select.ItemIndicator className="absolute left-2">
                <Check className="w-4 h-4" />
              </Select.ItemIndicator>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};