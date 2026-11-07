import { ApiError } from './apiError';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  threshold?: number;
  timeout?: number;
  name?: string;
  onStateChange?: (state: CircuitState, previousState: CircuitState) => void;
}

export class CircuitBreakerOpenError extends ApiError {
  constructor(message = 'Circuit breaker is open. Service is currently unavailable.') {
    super('CIRCUIT_OPEN', message, 503, { circuitState: 'OPEN' }, true);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Resilient Circuit Breaker Pattern
 * Protects downstream services (payment gateways, external SMS/Email APIs, Printers) from cascading failures.
 */
export class CircuitBreaker {
  public failures = 0;
  public readonly threshold: number;
  public readonly timeout: number;
  public state: CircuitState = 'CLOSED';
  public readonly name: string;
  private resetTimer: any = null;
  private onStateChangeCallback?: (state: CircuitState, previousState: CircuitState) => void;

  constructor(options: number | CircuitBreakerOptions = 5, timeout = 30000) {
    if (typeof options === 'number') {
      this.threshold = options;
      this.timeout = timeout;
      this.name = 'default';
    } else {
      this.threshold = options.threshold ?? 5;
      this.timeout = options.timeout ?? 30000;
      this.name = options.name ?? 'default';
      this.onStateChangeCallback = options.onStateChange;
    }
  }

  private transitionTo(newState: CircuitState) {
    const previous = this.state;
    if (previous === newState) return;
    this.state = newState;
    if (this.onStateChangeCallback) {
      try {
        this.onStateChangeCallback(newState, previous);
      } catch (e) {
        console.error(`[CircuitBreaker:${this.name}] onStateChange callback error:`, e);
      }
    }
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    if (this.state === 'OPEN') {
      if (fallback) {
        return await fallback();
      }
      throw new CircuitBreakerOpenError(
        `Service '${this.name}' is temporarily unavailable due to consecutive failures. Circuit is OPEN.`
      );
    }

    try {
      const result = await fn();
      // On success, reset failures count and close circuit if was HALF_OPEN
      this.failures = 0;
      if (this.state === 'HALF_OPEN') {
        this.transitionTo('CLOSED');
      }
      return result;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.threshold || this.state === 'HALF_OPEN') {
        this.transitionTo('OPEN');
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => {
          this.transitionTo('HALF_OPEN');
        }, this.timeout);
      }

      if (fallback) {
        return await fallback();
      }
      throw err;
    }
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    clearTimeout(this.resetTimer);
    this.failures = 0;
    this.transitionTo('CLOSED');
  }
}
