type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: { [key: string]: EventCallback[] } = {};
  private maxListeners: number = 10;
  private recursionDepth: number = 0;
  private maxRecursionDepth: number = 25;

  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // Warn if too many listeners are added
    if (this.events[event].length >= this.maxListeners) {
      console.warn(`Warning: Event '${event}' has exceeded ${this.maxListeners} listeners`);
    }

    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;

    // Prevent infinite recursion
    this.recursionDepth++;
    if (this.recursionDepth > this.maxRecursionDepth) {
      this.recursionDepth = 0;
      console.error(`Maximum recursion depth exceeded for event '${event}'`);
      return;
    }

    try {
      // Create a copy of the listeners array to prevent modification during iteration
      const listeners = [...this.events[event]];
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    } finally {
      this.recursionDepth--;
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
}