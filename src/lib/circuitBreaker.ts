/**
 * Circuit breaker states.
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',  // Normal operation
  OPEN = 'OPEN',      // Failing, reject fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures before opening
  resetTimeout?: number;          // Time in ms before attempting reset
  halfOpenMaxCalls?: number;      // Max calls to allow in half-open state
  monitorInterval?: number;       // Health check interval in ms
  timeoutDuration?: number;       // Request timeout in ms
}

interface CircuitBreakerStats {
  failures: number;
  lastFailure: number | null;
  successes: number;
  lastSuccess: number | null;
  state: CircuitBreakerState;
  nextAttempt: number | null;
}

export class CircuitBreaker {
  private stats: CircuitBreakerStats;
  private readonly options: Required<CircuitBreakerOptions>;
  private halfOpenCalls: number = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000,        // 1 minute
      halfOpenMaxCalls: 3,        // Allow 3 test calls
      monitorInterval: 30000,     // Check every 30 seconds
      timeoutDuration: 30000,     // 30 second timeout
      ...options
    };

    this.stats = {
      failures: 0,
      lastFailure: null,
      successes: 0,
      lastSuccess: null,
      state: CircuitBreakerState.CLOSED,
      nextAttempt: null
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN');
    }

    if (this.stats.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        this.tripBreaker();
        throw new Error('Circuit breaker maximum half-open calls exceeded');
      }
      this.halfOpenCalls++;
    }

    try {
      // Wrap the function call in a timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, this.options.timeoutDuration);
        })
      ]);

      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit breaker is open (failing).
   */
  private isOpen(): boolean {
    if (this.stats.state === CircuitBreakerState.OPEN) {
      const now = Date.now();
      if (this.stats.nextAttempt && now >= this.stats.nextAttempt) {
        this.setState(CircuitBreakerState.HALF_OPEN);
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record a successful operation.
   */
  private recordSuccess(): void {
    this.stats.failures = 0;
    this.stats.successes++;
    this.stats.lastSuccess = Date.now();

    if (this.stats.state === CircuitBreakerState.HALF_OPEN) {
      this.setState(CircuitBreakerState.CLOSED);
      this.halfOpenCalls = 0;
    }
  }

  /**
   * Record a failed operation.
   */
  private recordFailure(): void {
    this.stats.failures++;
    this.stats.lastFailure = Date.now();
    this.stats.successes = 0;

    if (this.stats.failures >= this.options.failureThreshold) {
      this.tripBreaker();
    }
  }

  /**
   * Trip the circuit breaker (set to OPEN state).
   */
  private tripBreaker(): void {
    this.setState(CircuitBreakerState.OPEN);
    this.stats.nextAttempt = Date.now() + this.options.resetTimeout;
  }

  /**
   * Set the circuit breaker state.
   */
  private setState(state: CircuitBreakerState): void {
    this.stats.state = state;
    if (state === CircuitBreakerState.CLOSED) {
      this.stats.nextAttempt = null;
      this.stats.failures = 0;
    }
  }

  /**
   * Start the health monitoring interval.
   */
  private startMonitoring(): void {
    setInterval(() => {
      // If we've been successful in half-open state, fully close the circuit
      if (
        this.stats.state === CircuitBreakerState.HALF_OPEN &&
        this.stats.successes > 0
      ) {
        this.setState(CircuitBreakerState.CLOSED);
        this.halfOpenCalls = 0;
      }

      // If we've had no failures for a while in closed state, reset counters
      if (
        this.stats.state === CircuitBreakerState.CLOSED &&
        this.stats.lastFailure &&
        Date.now() - this.stats.lastFailure > this.options.resetTimeout
      ) {
        this.stats.failures = 0;
        this.stats.lastFailure = null;
      }
    }, this.options.monitorInterval);
  }

  /**
   * Get current circuit breaker status.
   */
  public getStatus(): Readonly<CircuitBreakerStats & { halfOpenCalls: number }> {
    return {
      ...this.stats,
      halfOpenCalls: this.halfOpenCalls
    };
  }
}
