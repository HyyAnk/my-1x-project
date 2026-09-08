/**
 * Buffers incoming file-activity events by zoneId with a 200ms debounce
 * window, then flushes them as either a consolidated batch badge (4+ files)
 * or individual single-file activities.
 */
export class ActivityBatchQueue {
  constructor(batchHandlers) {
    this.batchEventQueue = new Map(); // zoneId -> array of activities
    this.batchFlushTimers = new Map(); // zoneId -> debounce timer id
    this.onFlush = batchHandlers.onFlush; // (zoneId, activities) => void
  }

  /** Buffers one activity event for its zone and (re)arms the debounce. */
  enqueue(activity) {
    if (!activity || !activity.zoneId) return;

    const { zoneId } = activity;
    if (!this.batchEventQueue.has(zoneId)) {
      this.batchEventQueue.set(zoneId, []);
    }
    this.batchEventQueue.get(zoneId).push(activity);

    if (this.batchFlushTimers.has(zoneId)) {
      clearTimeout(this.batchFlushTimers.get(zoneId));
    }

    const timer = setTimeout(() => {
      this.flush(zoneId);
    }, 200);
    this.batchFlushTimers.set(zoneId, timer);
  }

  /** Drains one zone's buffered activities and delegates processing. */
  flush(zoneId) {
    this.batchFlushTimers.delete(zoneId);
    const activities = this.batchEventQueue.get(zoneId) || [];
    this.batchEventQueue.delete(zoneId);
    if (activities.length === 0) return;

    this.onFlush(zoneId, activities);
  }
}
