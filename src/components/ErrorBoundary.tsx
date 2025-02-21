import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    // Clear any cached resources
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    // Hard reload the page
    window.location.reload();
  };

  private is502Error(): boolean {
    const { error } = this.state;
    return Boolean(
      error?.message?.includes('502') || 
      error?.message?.includes('Bad Gateway') ||
      error?.message?.toLowerCase().includes('vite') ||
      error?.message?.includes('node_modules/.vite')
    );
  }

  public render() {
    if (this.state.hasError) {
      // Development server connection error
      if (this.is502Error()) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-red-600 text-center mb-2">
                Development Server Error
              </h1>
              <p className="text-gray-600 mb-4 text-center">
                Unable to connect to the Vite development server. This typically occurs when:
                <ul className="list-disc list-inside mt-2 text-left">
                  <li>The development server is not running</li>
                  <li>There's a build or bundling error</li>
                  <li>The server crashed or failed to start</li>
                  <li>Port 5173 is already in use</li>
                </ul>
              </p>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => window.open('http://localhost:5173')}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Local Development URL
                  </button>
                </div>
                <div className="mt-4 p-3 bg-zinc-50 rounded-md">
                  <p className="text-sm font-medium text-zinc-700 mb-2">Try these commands:</p>
                  <div className="font-mono text-sm bg-black text-white p-2 rounded overflow-x-auto">
                    <p className="mb-1">1. Stop any running servers</p>
                    <p className="mb-2 text-zinc-400">CTRL+C or CMD+C</p>
                    <p className="mb-1">2. Start the development server</p>
                    <p className="text-zinc-400">npm run dev</p>
                  </div>
                </div>
              </div>
              {this.state.error && import.meta.env.DEV && (
                <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-600">
                  <p className="font-medium mb-1">Error Details:</p>
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      }

      // General error fallback
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}