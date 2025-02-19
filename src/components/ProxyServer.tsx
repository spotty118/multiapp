import { useState, useEffect } from 'react';
import { Terminal, Play, Square, AlertCircle, CheckCircle, ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VirtualTerminal } from './VirtualTerminal';
import { virtualProxyServer } from '../lib/virtualProxy/VirtualProxyServer';
import type { Terminal as XTerm } from '@xterm/xterm';

interface ProxyServerProps {
  onServerStarted?: (url: string) => void;
}

interface ServerStatus {
  running: boolean;
  uptime: number;
  requestCount: number;
  pendingRequests: number;
  queuedRequests: number;
  requestsLastMinute: number;
}

export function ProxyServer({ onServerStarted }: ProxyServerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    // Update running state when virtual server changes
    const handleStarted = () => {
      setIsRunning(true);
      setError(null);
      setIsStopping(false);
    };
    const handleStopped = () => {
      setIsRunning(false);
      setIsStopping(false);
    };

    virtualProxyServer.on('started', handleStarted);
    virtualProxyServer.on('stopped', handleStopped);

    // Status polling
    const pollStatus = setInterval(() => {
      if (virtualProxyServer.isRunning()) {
        setStatus(virtualProxyServer.getStatus());
      }
    }, 1000);

    // Set initial state
    setIsRunning(virtualProxyServer.isRunning());

    return () => {
      virtualProxyServer.off('started', handleStarted);
      virtualProxyServer.off('stopped', handleStopped);
      clearInterval(pollStatus);
    };
  }, []);

  const handleTerminalReady = (terminal: XTerm) => {
    virtualProxyServer.setTerminal({
      writeln: (text: string) => terminal.writeln(text),
      clear: () => terminal.clear()
    });
  };

  const startServer = async () => {
    setError(null);
    
    try {
      await virtualProxyServer.start();
      onServerStarted?.('http://localhost:8000');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
      setIsRunning(false);
    }
  };

  const stopServer = async () => {
    setIsStopping(true);
    try {
      await virtualProxyServer.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server');
    } finally {
      setIsStopping(false);
    }
  };

  const restartServer = async () => {
    setIsRestarting(true);
    setError(null);
    
    try {
      await virtualProxyServer.restart();
      onServerStarted?.('http://localhost:8000');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setTimeout(() => setIsRestarting(false), 1000);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-medium text-zinc-900">Virtual Proxy Server</h3>
        </div>
        
        {error ? (
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        ) : isRunning ? (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Running</span>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-red-800 whitespace-pre-wrap font-mono">
              {error}
            </div>
            <div className="flex gap-2">
              <Link
                to="/proxy-guide"
                target="_blank"
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Setup Guide
              </Link>
            </div>
          </div>
        </div>
      )}

      {status && isRunning && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg text-sm">
          <div>
            <span className="text-zinc-500">Uptime:</span>{' '}
            <span className="text-zinc-900 font-medium">{formatUptime(status.uptime)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Total Requests:</span>{' '}
            <span className="text-zinc-900 font-medium">{status.requestCount}</span>
          </div>
          <div>
            <span className="text-zinc-500">Pending:</span>{' '}
            <span className={`font-medium ${
              status.pendingRequests > 3 ? 'text-amber-600' : 'text-zinc-900'
            }`}>
              {status.pendingRequests}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Queued:</span>{' '}
            <span className={`font-medium ${
              status.queuedRequests > 0 ? 'text-amber-600' : 'text-zinc-900'
            }`}>
              {status.queuedRequests}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-zinc-500">Requests (last minute):</span>{' '}
            <span className={`font-medium ${
              status.requestsLastMinute > 45 ? 'text-red-600' : 'text-zinc-900'
            }`}>
              {status.requestsLastMinute}
            </span>
            <span className="text-zinc-400"> / 50</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startServer}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            Start Virtual Server
          </button>
        ) : (
          <>
            <button
              onClick={stopServer}
              disabled={isStopping}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isStopping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {isStopping ? 'Stopping...' : 'Stop Server'}
            </button>
            <button
              onClick={restartServer}
              disabled={isRestarting || isStopping}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isRestarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {isRestarting ? 'Restarting...' : 'Restart Server'}
            </button>
          </>
        )}
      </div>

      <VirtualTerminal onReady={handleTerminalReady} />
    </div>
  );
}