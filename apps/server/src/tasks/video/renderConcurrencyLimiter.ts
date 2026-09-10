export type QueuePositionCallback = (position: number) => void | Promise<void>;

export interface AcquireSlotOptions {
  onQueuePosition?: QueuePositionCallback;
  signal?: AbortSignal;
}

interface QueuedRenderTask {
  taskId: string;
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  onQueuePosition?: QueuePositionCallback;
  signal?: AbortSignal;
  abortListener?: () => void;
}

export function resolveMaxConcurrentVideoRenders(configured?: number): number {
  const envVal = process.env.MAX_CONCURRENT_VIDEO_RENDERS;
  if (envVal) {
    const parsed = Number.parseInt(envVal, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return 1;
}

export class VideoRenderConcurrencyLimiter {
  private maxConcurrency: number;
  private readonly activeSlots = new Set<string>();
  private readonly queue: QueuedRenderTask[] = [];

  constructor(maxConcurrency?: number) {
    this.maxConcurrency = maxConcurrency ?? resolveMaxConcurrentVideoRenders(1);
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  setMaxConcurrency(max: number): void {
    if (max < 1) throw new Error("maxConcurrency must be at least 1");
    this.maxConcurrency = max;
    this.drainQueue();
  }

  getActiveCount(): number {
    return this.activeSlots.size;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async acquireSlot(
    taskId: string,
    onQueuePositionOrOptions?: QueuePositionCallback | AcquireSlotOptions,
    maybeSignal?: AbortSignal,
  ): Promise<() => void> {
    let onQueuePosition: QueuePositionCallback | undefined;
    let signal: AbortSignal | undefined;

    if (typeof onQueuePositionOrOptions === "function") {
      onQueuePosition = onQueuePositionOrOptions;
      signal = maybeSignal;
    } else if (onQueuePositionOrOptions && typeof onQueuePositionOrOptions === "object") {
      onQueuePosition = onQueuePositionOrOptions.onQueuePosition;
      signal = onQueuePositionOrOptions.signal ?? maybeSignal;
    } else {
      signal = maybeSignal;
    }

    if (signal?.aborted) {
      throw new Error("Video render cancelled");
    }

    if (this.activeSlots.has(taskId)) {
      return this.createReleaseCallback(taskId);
    }

    if (this.activeSlots.size < this.maxConcurrency) {
      this.activeSlots.add(taskId);
      return this.createReleaseCallback(taskId);
    }

    return new Promise<() => void>((resolve, reject) => {
      let abortListener: (() => void) | undefined;
      if (signal) {
        abortListener = () => {
          this.removeQueuedItem(taskId, new Error("Video render cancelled"));
          this.notifyQueuePositions();
        };
        signal.addEventListener("abort", abortListener, { once: true });
      }

      const taskEntry: QueuedRenderTask = {
        taskId,
        resolve,
        reject,
        onQueuePosition,
        signal,
        abortListener,
      };

      this.queue.push(taskEntry);
      const position = this.queue.length;
      if (onQueuePosition) {
        try {
          void onQueuePosition(position);
        } catch {
          // Ignore synchronous callback errors
        }
      }
    });
  }

  releaseSlot(taskId: string): void {
    if (this.activeSlots.has(taskId)) {
      this.activeSlots.delete(taskId);
      this.drainQueue();
      return;
    }
    const removed = this.removeQueuedItem(taskId, new Error("Render slot released before acquisition"));
    if (removed) {
      this.notifyQueuePositions();
    }
  }

  reset(): void {
    const remaining = this.queue.splice(0, this.queue.length);
    this.activeSlots.clear();
    for (const item of remaining) {
      if (item.signal && item.abortListener) {
        item.signal.removeEventListener("abort", item.abortListener);
      }
      item.reject(new Error("Video render concurrency limiter reset"));
    }
  }

  private drainQueue(): void {
    while (this.activeSlots.size < this.maxConcurrency && this.queue.length > 0) {
      const nextItem = this.queue.shift();
      if (!nextItem) break;

      if (nextItem.signal && nextItem.abortListener) {
        nextItem.signal.removeEventListener("abort", nextItem.abortListener);
      }

      if (nextItem.signal?.aborted) {
        nextItem.reject(new Error("Video render cancelled"));
        continue;
      }

      this.activeSlots.add(nextItem.taskId);
      nextItem.resolve(this.createReleaseCallback(nextItem.taskId));
    }
    this.notifyQueuePositions();
  }

  private removeQueuedItem(taskId: string, rejectionError?: Error): boolean {
    const index = this.queue.findIndex((item) => item.taskId === taskId);
    if (index === -1) return false;
    const [item] = this.queue.splice(index, 1);
    if (item) {
      if (item.signal && item.abortListener) {
        item.signal.removeEventListener("abort", item.abortListener);
      }
      if (rejectionError) {
        item.reject(rejectionError);
      }
    }
    return true;
  }

  private notifyQueuePositions(): void {
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (item?.onQueuePosition) {
        try {
          void item.onQueuePosition(i + 1);
        } catch {
          // Ignore synchronous callback errors
        }
      }
    }
  }

  private createReleaseCallback(taskId: string): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.releaseSlot(taskId);
    };
  }
}

export const videoRenderConcurrencyLimiter = new VideoRenderConcurrencyLimiter();
