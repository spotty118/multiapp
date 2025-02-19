import { EventEmitter } from '../events/EventEmitter';
import { ProviderType } from '../types';
import { APIError } from '../types';
import { createApiClient } from '../api/factory';

interface VirtualTerminal {
  writeln: (text: string) => void;
  clear: () => void;
}

interface QueuedRequest {
  id: string;
  timestamp: number;
  execute: () => Promise<any>;
  retries?: number;
  timeoutId?: NodeJS.Timeout;
}

interface RequestStats {
  requestCount: number;
  requestWindow: number[];
  pendingRequests: Map<string, boolean>;
  requestQueue: QueuedRequest[];
  startTime: number;
}

export class VirtualProxyServer extends EventEmitter {
  private running: boolean = false;
  private terminal: VirtualTerminal | null = null;
  private stats: RequestStats = {
    requestCount: 0,
    requestWindow: [],
    pendingRequests: new Map(),
    requestQueue: [],
    startTime: 0
  };

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly RATE_LIMIT = 50; // requests per minute
  private readonly ERROR_CODES_NO_RETRY = new Set([400, 401, 403, 404]);
  private readonly REQUEST_WINDOW = 60000; // 1 minute in milliseconds
  
  constructor() {
    super();
    // Clean up old requests from rate limit window every 10 seconds
    setInterval(() => this.cleanRequestWindow(), 10000);
    // Monitor queue health every 5 seconds
    setInterval(() => this.monitorQueueHealth(), 5000);
  }

  public setTerminal(terminal: VirtualTerminal) {
    this.terminal = terminal;
  }

  private log(message: string, level: 'info' | 'error' | 'warning' | 'success' = 'info') {
    const timestamp = new Date().toISOString();
    const colorCode = {
      info: '\x1b[36m',    // Cyan
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      success: '\x1b[32m'  // Green
    }[level];

    const logMessage = `${colorCode}[${timestamp}] ${message}\x1b[0m`;
    if (this.terminal) {
      this.terminal.writeln(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getStatus() {
    return {
      running: this.running,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
      requestCount: this.stats.requestCount,
      pendingRequests: this.stats.pendingRequests.size,
      queuedRequests: this.stats.requestQueue.length,
      requestsLastMinute: this.stats.requestWindow.length,
      queueCapacity: {
        used: this.stats.requestQueue.length,
        total: this.MAX_QUEUE_SIZE,
        percentage: Math.round((this.stats.requestQueue.length / this.MAX_QUEUE_SIZE) * 100)
      },
      rateLimits: {
        current: this.stats.requestWindow.length,
        limit: this.RATE_LIMIT,
        remaining: Math.max(0, this.RATE_LIMIT - this.stats.requestWindow.length),
        resetsIn: this.getTimeUntilRateLimit()
      }
    };
  }

  private getTimeUntilRateLimit(): number {
    if (this.stats.requestWindow.length === 0) return 0;
    const oldestRequest = Math.min(...this.stats.requestWindow);
    return Math.max(0, this.REQUEST_WINDOW - (Date.now() - oldestRequest));
  }

  private cleanRequestWindow() {
    const now = Date.now();
    this.stats.requestWindow = this.stats.requestWindow.filter(
      timestamp => now - timestamp < this.REQUEST_WINDOW
    );
  }

  private monitorQueueHealth() {
    const now = Date.now();
    
    // Clean up stale pending requests
    for (const [requestId, timestamp] of this.stats.pendingRequests.entries()) {
      if (now - timestamp > this.REQUEST_TIMEOUT) {
        this.log(`Request ${requestId} timed out and will be removed`, 'warning');
        this.stats.pendingRequests.delete(requestId);
      }
    }

    // Check queue health
    if (this.stats.requestQueue.length > this.MAX_QUEUE_SIZE * 0.8) {
      this.log(`Queue is nearing capacity (${this.stats.requestQueue.length}/${this.MAX_QUEUE_SIZE})`, 'warning');
    }

    // Log status if there are pending requests
    if (this.stats.pendingRequests.size > 0) {
      this.log(`Current pending requests: ${this.stats.pendingRequests.size}`, 'info');
    }
  }

  private async processQueue() {
    if (this.stats.requestQueue.length === 0) return;

    // Check rate limits
    if (this.stats.requestWindow.length >= this.RATE_LIMIT) {
      this.log('Rate limit reached, waiting...', 'warning');
      return;
    }

    const request = this.stats.requestQueue.shift();
    if (!request) return;

    try {
      this.stats.pendingRequests.set(request.id, true);
      await request.execute();
    } catch (error) {
      const shouldRetry = 
        !this.ERROR_CODES_NO_RETRY.has(error.status) &&
        (!request.retries || request.retries < this.MAX_RETRIES);

      if (shouldRetry) {
        request.retries = (request.retries || 0) + 1;
        this.log(`Retrying request ${request.id} (attempt ${request.retries}/${this.MAX_RETRIES})`, 'warning');
        this.stats.requestQueue.push(request);
        await this.delay(this.RETRY_DELAY * request.retries);
      }
    } finally {
      this.stats.pendingRequests.delete(request.id);
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    }

    // Process next request after a small delay
    setTimeout(() => this.processQueue(), 100);
  }

  private async waitForPendingRequests(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkPending = () => {
        if (this.stats.pendingRequests.size === 0) {
          resolve();
        } else {
          setTimeout(checkPending, 100);
        }
      };
      checkPending();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetStats() {
    this.stats = {
      requestCount: 0,
      requestWindow: [],
      pendingRequests: new Map(),
      requestQueue: [],
      startTime: this.running ? Date.now() : 0
    };
  }

  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Proxy server is already running');
    }

    try {
      this.log('Starting virtual proxy server...', 'info');
      this.running = true;
      this.stats.startTime = Date.now();
      this.resetStats();
      this.emit('started');
      this.log('Virtual proxy server started successfully', 'success');
    } catch (error) {
      this.running = false;
      this.log(`Failed to start proxy server: ${error.message}`, 'error');
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      this.log('Stopping virtual proxy server...', 'info');
      
      // Cancel all pending requests
      this.stats.requestQueue.forEach(request => {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
      });

      // Wait for pending requests to complete with a timeout
      if (this.stats.pendingRequests.size > 0) {
        this.log(`Waiting for ${this.stats.pendingRequests.size} pending requests to complete...`, 'warning');
        await Promise.race([
          this.waitForPendingRequests(),
          this.delay(5000) // 5 second timeout
        ]);
      }

      this.running = false;
      this.resetStats();
      this.emit('stopped');
      this.log('Virtual proxy server stopped successfully', 'success');
    } catch (error) {
      this.log(`Error stopping proxy server: ${error.message}`, 'error');
      throw error;
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async handleRequest(
    message: string,
    model: string,
    providerType: ProviderType,
    signal?: AbortSignal
  ): Promise<any> {
    if (!this.running) {
      throw new APIError('Proxy server is not running');
    }

    // Check queue capacity
    if (this.stats.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      throw new APIError(
        `Request queue is full (${this.MAX_QUEUE_SIZE} requests). Please try again later.`,
        503
      );
    }

    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: requestId,
        timestamp: Date.now(),
        execute: async () => {
          try {
            if (signal?.aborted) {
              throw new APIError('Request cancelled');
            }

            this.stats.requestCount++;
            this.stats.requestWindow.push(Date.now());

            // Create an API client for the provider
            const client = createApiClient(providerType);
            const result = await client.sendMessage(message, model);

            this.log(`Request ${requestId} completed successfully`, 'success');
            resolve(result);
          } catch (error) {
            this.log(`Request ${requestId} failed: ${error.message}`, 'error');
            reject(error);
          }
        }
      };

      // Set up request timeout
      request.timeoutId = setTimeout(() => {
        const index = this.stats.requestQueue.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.stats.requestQueue.splice(index, 1);
          reject(new APIError('Request timed out', 408));
        }
      }, this.REQUEST_TIMEOUT);

      this.stats.requestQueue.push(request);
      this.log(`Request ${requestId} queued (${this.stats.requestQueue.length} in queue)`, 'info');
      this.processQueue().catch(error => {
        this.log(`Error processing queue: ${error.message}`, 'error');
        reject(error);
      });
    });
  }
}

export const virtualProxyServer = new VirtualProxyServer();