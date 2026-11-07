import { BulkheadOptions, BulkheadStats } from './types';

export class BulkheadRejectedError extends Error {
  constructor(message: string = 'Bulkhead capacity exceeded: call rejected') {
    super(message);
    this.name = 'BulkheadRejectedError';
  }
}

export class BulkheadTimeoutError extends Error {
  constructor(message: string = 'Bulkhead queue timeout exceeded') {
    super(message);
    this.name = 'BulkheadTimeoutError';
  }
}

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  timer?: NodeJS.Timeout;
}

export class Bulkhead {
  private maxConcurrent: number;
  private maxQueue: number;
  private queueTimeoutMs: number;
  private activeCalls = 0;
  private queue: QueuedTask<any>[] = [];
  private totalCompleted = 0;
  private totalRejected = 0;
  private totalTimeouts = 0;

  constructor(options: BulkheadOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 10;
    this.maxQueue = options.maxQueue ?? 20;
    this.queueTimeoutMs = options.queueTimeoutMs ?? 5000;
  }

  /**
   * Returns live metrics on the bulkhead state
   */
  getStats(): BulkheadStats {
    return {
      activeCalls: this.activeCalls,
      queueSize: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
      totalCompleted: this.totalCompleted,
      totalRejected: this.totalRejected,
      totalTimeouts: this.totalTimeouts,
    };
  }

  /**
   * Executes an asynchronous task inside the bulkhead isolation perimeter
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If under concurrent limit, execute immediately
    if (this.activeCalls < this.maxConcurrent) {
      return this.runTask(fn);
    }

    // If queue is full, reject immediately to prevent resource exhaustion
    if (this.queue.length >= this.maxQueue) {
      this.totalRejected++;
      throw new BulkheadRejectedError(
        `Bulkhead limit reached (active: ${this.activeCalls}/${this.maxConcurrent}, queue: ${this.queue.length}/${this.maxQueue})`
      );
    }

    // Enqueue with timeout
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        fn,
        resolve,
        reject,
      };

      if (this.queueTimeoutMs > 0) {
        task.timer = setTimeout(() => {
          const index = this.queue.indexOf(task);
          if (index !== -1) {
            this.queue.splice(index, 1);
            this.totalTimeouts++;
            reject(new BulkheadTimeoutError(`Bulkhead task waited in queue longer than ${this.queueTimeoutMs}ms`));
          }
        }, this.queueTimeoutMs);
      }

      this.queue.push(task);
    });
  }

  private async runTask<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCalls++;
    try {
      const result = await fn();
      this.totalCompleted++;
      return result;
    } finally {
      this.activeCalls--;
      this.processNext();
    }
  }

  private processNext(): void {
    if (this.activeCalls < this.maxConcurrent && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        if (nextTask.timer) {
          clearTimeout(nextTask.timer);
        }
        this.runTask(nextTask.fn)
          .then(nextTask.resolve)
          .catch(nextTask.reject);
      }
    }
  }
}
