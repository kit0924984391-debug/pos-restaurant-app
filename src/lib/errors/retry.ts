export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Execute an asynchronous function with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 200,
    maxDelayMs = 5000,
    backoffFactor = 2,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(err, attempt)) {
        throw err;
      }

      // Calculate exponential backoff
      let delay = Math.min(initialDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);
      if (jitter) {
        // Add random jitter between ±20%
        delay = Math.round(delay * (0.8 + Math.random() * 0.4));
      }

      if (onRetry) {
        try {
          onRetry(err, attempt, delay);
        } catch {}
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
