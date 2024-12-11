import { useEffect } from 'react';

interface ShortcutConfig {
  [key: string]: {
    handler: () => void;
    description: string;
  };
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Ctrl/Cmd + key combinations
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const key = event.key.toLowerCase();
        const shortcut = `ctrl+${key}`;
        
        if (shortcuts[shortcut]) {
          event.preventDefault();
          shortcuts[shortcut].handler();
        }
      }
      // Handle single key shortcuts (like Escape)
      else if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'escape' && shortcuts['esc']) {
          event.preventDefault();
          shortcuts['esc'].handler();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
