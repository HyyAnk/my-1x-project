import path from "node:path";
import type { RepositoryService } from "../../repository.js";
import { IntroOutroScriptError } from "../errors.js";

export function safeScriptId(value: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new IntroOutroScriptError("Invalid script resource identifier", "INVALID_SCRIPT_ID");
  }
  return value;
}

export function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

export class IntroOutroScriptStorage {
  private readonly mutationQueues = new Map<string, Promise<void>>();

  constructor(readonly repository: RepositoryService) {}

  async channelRoot(channelId: string): Promise<string> {
    const channel = await this.repository.getChannel(channelId);
    return this.repository.resolvePath("channels", channel.slug, "intro_outro_scripts");
  }

  async projectRoot(channelId: string, projectId: string): Promise<string> {
    return path.join(await this.channelRoot(channelId), "projects", safeScriptId(projectId));
  }

  async queue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const tail = current.then(() => undefined);
    this.mutationQueues.set(key, tail);
    return current.finally(() => {
      if (this.mutationQueues.get(key) === tail) this.mutationQueues.delete(key);
    });
  }
}
