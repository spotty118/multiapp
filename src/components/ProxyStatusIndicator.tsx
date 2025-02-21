import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, StopCircle } from 'lucide-react';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';

interface ProxyStatusIndicatorProps {
  onStopServer?: () => void;
  url?: string | null;
}

export function ProxyStatusIndicator({ onStopServer }: ProxyStatusIndicatorProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkConnection = useCallback(async () => {
    if (virtualProxyServer.isRunning()) {
      setStatus('connected');
      setErrorMessage('');
    } else {
      setStatus('disconnected');
      setErrorMessage('Virtual proxy server is not running');
    }
  }, []);

  useEffect(() => {
    // Add event listeners for virtual server
    const handleServerStarted = () => {
      setStatus('connected');
      setErrorMessage('');
    };

    const handleServerStopped = () => {
      setStatus('disconnected');
      setErrorMessage('Virtual proxy server stopped');
    };

    virtualProxyServer.on('started', handleServerStarted);
    virtualProxyServer.on('stopped', handleServerStopped);

    // Initial check
    checkConnection();
    
    // Set up polling interval
    const interval = setInterval(checkConnection, 30000);
    
    return () => {
      clearInterval(interval);
      virtualProxyServer.off('started', handleServerStarted);
      virtualProxyServer.off('stopped', handleServerStopped);
    };
  }, [checkConnection]);

  const statusConfig = {
    checking: {
      icon: Loader2,
      color: 'text-zinc-500',
      text: 'Checking...',
      title: 'Checking connection...'
    },
    connected: {
      icon: CheckCircle2,
      color: 'text-green-600',
      text: 'Connected',
      title: 'Connected to proxy server'
    },
    disconnected: {
      icon: XCircle,
      color: 'text-red-600',
      text: 'Not Connected',
      title: errorMessage
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`flex items-center gap-1 ${config.color}`}
        title={config.title}
      >
        <Icon className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
        <span className="text-xs">{config.text}</span>
      </div>
      
      {status === 'connected' && onStopServer && (
        <button
          onClick={onStopServer}
          className="p-1 hover:bg-red-50 rounded-md transition-colors"
          title="Stop server"
        >
          <StopCircle className="w-4 h-4 text-red-500" />
        </button>
      )}
    </div>
  );
}