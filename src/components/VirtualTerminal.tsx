import { useEffect, useRef, useLayoutEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface VirtualTerminalProps {
  onReady: (terminal: Terminal) => void;
}

export function VirtualTerminal({ onReady }: VirtualTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Use useLayoutEffect to ensure DOM measurements are accurate
  useLayoutEffect(() => {
    if (terminalRef.current && !terminalInstance.current) {
      // Configure terminal
      const term = new Terminal({
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#f6f6f4',
          selection: '#33467c',
          black: '#32344a',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#ad8ee6',
          cyan: '#449dab',
          white: '#787c99',
          brightBlack: '#444b6a',
          brightRed: '#ff7a93',
          brightGreen: '#b9f27c',
          brightYellow: '#ff9e64',
          brightBlue: '#7da6ff',
          brightMagenta: '#bb9af7',
          brightCyan: '#0db9d7',
          brightWhite: '#acb0d0'
        },
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        cursorBlink: true,
        convertEol: true,
        scrollback: 1000,
        disableStdin: true,
        rows: 20 // Set initial rows to ensure proper dimensions
      });

      // Add fit addon
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      // Open terminal
      term.open(terminalRef.current);
      
      // Ensure container has dimensions before fitting
      setTimeout(() => {
        if (fitAddon) {
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn('Failed to fit terminal:', error);
          }
        }
        // Store instance and call ready callback
        terminalInstance.current = term;
        onReady(term);
      }, 0);
    }

    return () => {
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [onReady]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalInstance.current) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.warn('Failed to fit terminal on resize:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={terminalRef}
      className="w-full h-[300px] rounded-lg overflow-hidden border border-zinc-200"
      style={{ minHeight: '300px' }} // Ensure minimum height
    />
  );
}