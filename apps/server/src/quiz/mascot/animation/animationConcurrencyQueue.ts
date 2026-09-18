export interface ConcurrencyQueueOptions {
  concurrency?: number;
}

export class AnimationConcurrencyQueue {
  private readonly concurrency: number;
  private activeCount = 0;
  private readonly queue: Array<() => void> = [];

  constructor(options?: ConcurrencyQueueOptions) {
    this.concurrency = Math.max(1, options?.concurrency ?? 2);
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public async runTask<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.concurrency) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.activeCount += 1;
    try {
      return await task();
    } finally {
      this.activeCount -= 1;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  public async runAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map((task) => this.runTask(task)));
  }
}
