import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Terminal, X } from 'lucide-react';
import { ProxyServer } from './ProxyServer';

interface ProxyDialogProps {
  onServerStarted?: (url: string) => void;
}

export function ProxyDialog({ onServerStarted }: ProxyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 text-zinc-600 hover:bg-zinc-50 rounded-md transition-colors"
          title="Virtual Proxy Server"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-zinc-900">
                Virtual Proxy Server
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-zinc-500 mt-1">
              Start and manage your local proxy server for routing API requests.
            </Dialog.Description>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(85vh-5rem)]">
            <ProxyServer onServerStarted={onServerStarted} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}