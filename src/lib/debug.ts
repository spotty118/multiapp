import { ProviderType } from './types';

class Debug {
  private enabled: boolean = false;
  private logs: Array<{ timestamp: number; message: string; level: 'info' | 'error' | 'warn' }> = [];
  private maxLogs: number = 1000;

  enable() {
    this.enabled = true;
    this.log('Debug mode enabled');
  }

  disable() {
    this.log('Debug mode disabled');
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
    const logEntry = {
      timestamp: Date.now(),
      message,
      level
    };

    this.logs.push(logEntry);

    // Trim logs if they exceed maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (this.enabled) {
      const timestamp = new Date().toISOString();
      const prefix = `[${level.toUpperCase()}] [${timestamp}]`;
      
      switch (level) {
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        default:
          console.log(`${prefix} ${message}`);
      }
    }
  }

  getLogs(): Array<{ timestamp: number; message: string; level: 'info' | 'error' | 'warn' }> {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.log('Logs cleared');
  }

  formatResponse(provider: ProviderType, data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `[Error formatting response: ${error.message}]`;
    }
  }

  // Helper method for logging HTTP requests
  logRequest(provider: ProviderType, url: string, options: RequestInit) {
    if (!this.enabled) return;

    this.log(`Request to ${provider}:`, 'info');
    this.log(`URL: ${url}`, 'info');
    this.log(`Method: ${options.method}`, 'info');
    
    // Log headers except for sensitive information
    const safeHeaders = { ...options.headers };
    if ('Authorization' in safeHeaders) {
      safeHeaders['Authorization'] = '[REDACTED]';
    }
    this.log(`Headers: ${JSON.stringify(safeHeaders, null, 2)}`, 'info');
  }

  // Helper method for logging HTTP responses
  logResponse(provider: ProviderType, status: number, data: any) {
    if (!this.enabled) return;

    this.log(`Response from ${provider}:`, 'info');
    this.log(`Status: ${status}`, 'info');
    this.log(`Body: ${this.formatResponse(provider, data)}`, 'info');
  }

  // Helper method for logging errors
  logError(provider: ProviderType, error: any) {
    if (!this.enabled) return;

    this.log(`Error from ${provider}:`, 'error');
    this.log(`Message: ${error.message}`, 'error');
    if (error.stack) {
      this.log(`Stack: ${error.stack}`, 'error');
    }
  }
}

// Export a singleton instance
export const debug = new Debug();