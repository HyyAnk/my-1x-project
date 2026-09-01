export class TaskMutationQueue {
  private readonly tails = new Map<string, Promise<void>>();

  enqueue<T>(taskId: string, mutation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(taskId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(mutation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(taskId, tail);
    void tail.finally(() => {
      if (this.tails.get(taskId) === tail) this.tails.delete(taskId);
    });
    return result;
  }
}
